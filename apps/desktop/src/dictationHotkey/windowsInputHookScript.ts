/**
 * Hidden PowerShell helper that owns the Windows low-level keyboard and mouse hooks.
 * A hook needs a message loop on its own thread and blocks all system input while its
 * callback runs, so it lives in a separate process (spike: docs/internals/discord-mute-dictation.md).
 *
 * stdin:  `config <toggle>|<hold>|<mouse>`, `mute down`, `mute up`, `quit` (EOF quits too).
 * stdout: `ready`, `down <trigger>`, `up <trigger>`, `other`, `error <reason>`.
 * Matching triggers are eaten; injected input (our own F24) is ignored.
 */
export const WINDOWS_INPUT_HOOK_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

public static class LeonidasDictationHook {
  const int WH_KEYBOARD_LL = 13, WH_MOUSE_LL = 14;
  const int WM_KEYDOWN = 0x100, WM_KEYUP = 0x101, WM_SYSKEYDOWN = 0x104, WM_SYSKEYUP = 0x105;
  const int WM_MBUTTONDOWN = 0x207, WM_MBUTTONUP = 0x208, WM_XBUTTONDOWN = 0x20B, WM_XBUTTONUP = 0x20C;
  const uint LLKHF_INJECTED = 0x10, LLMHF_INJECTED = 1;
  const int CTRL = 1, ALT = 2, SHIFT = 4, WIN = 8;
  const byte VK_F24 = 0x87, VK_MASK = 0xE8;

  [StructLayout(LayoutKind.Sequential)] struct KBDLLHOOKSTRUCT { public uint vk, scan, flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Sequential)] struct MSLLHOOKSTRUCT { public int x, y; public uint mouseData, flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Sequential)] struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam, lParam; public uint time; public int x, y; }
  delegate IntPtr HookProc(int code, IntPtr wParam, IntPtr lParam);

  [DllImport("user32.dll")] static extern IntPtr SetWindowsHookEx(int id, HookProc proc, IntPtr mod, uint thread);
  [DllImport("user32.dll")] static extern bool UnhookWindowsHookEx(IntPtr hook);
  [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] static extern int GetMessage(out MSG msg, IntPtr hwnd, uint min, uint max);
  [DllImport("user32.dll")] static extern bool PostThreadMessage(uint thread, uint msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  [DllImport("kernel32.dll")] static extern IntPtr GetModuleHandle(string name);

  class Trigger { public string Name; public int Mods; public int Vk; public int Button; public bool Active; }

  static readonly HookProc keyProc = KeyHook, mouseProc = MouseHook; // keep references from the GC
  static IntPtr keyHook, mouseHook;
  static uint loopThread;
  static volatile Trigger[] triggers = new Trigger[0];
  static int mods;
  static readonly Dictionary<int, Trigger> eaten = new Dictionary<int, Trigger>();
  static readonly BlockingCollection<string> output = new BlockingCollection<string>();
  public static bool AcceptInjected;

  static void Emit(string line) { output.Add(line); } // never block the hook on a slow reader

  static int ModOf(uint vk) {
    switch (vk) {
      case 0xA2: case 0xA3: case 0x11: return CTRL;
      case 0xA4: case 0xA5: case 0x12: return ALT;
      case 0xA0: case 0xA1: case 0x10: return SHIFT;
      case 0x5B: case 0x5C: return WIN;
      default: return 0;
    }
  }

  static Trigger Parse(string name, string combo) {
    var t = new Trigger { Name = name };
    foreach (var raw in combo.Split('+')) {
      var p = raw.Trim().ToLowerInvariant();
      if (p == "ctrl") t.Mods |= CTRL; else if (p == "alt") t.Mods |= ALT;
      else if (p == "shift") t.Mods |= SHIFT; else if (p == "win") t.Mods |= WIN;
      else if (p == "space") t.Vk = 0x20;
      else if (p == "mouse4") t.Button = 4; else if (p == "mouse5") t.Button = 5; else if (p == "middle") t.Button = 3;
      else if (p.Length > 1 && p[0] == 'f') t.Vk = 0x6F + int.Parse(p.Substring(1));
      else if (p.Length == 1 && char.IsLetterOrDigit(p[0])) t.Vk = char.ToUpperInvariant(p[0]);
      else return null;
    }
    return (t.Mods == 0 && t.Vk == 0 && t.Button == 0) ? null : t;
  }

  public static void Configure(string line) {
    var names = new[] { "toggle", "hold", "mouse" };
    var parts = line.Split('|');
    var list = new List<Trigger>();
    for (int i = 0; i < names.Length && i < parts.Length; i++) {
      if (parts[i].Length == 0) continue;
      var t = Parse(names[i], parts[i]);
      if (t == null) Emit("error bad-trigger " + names[i]); else list.Add(t);
    }
    triggers = list.ToArray();
  }

  static void Mask(Trigger t) { if ((t.Mods & WIN) != 0) { keybd_event(VK_MASK, 0, 0, UIntPtr.Zero); keybd_event(VK_MASK, 0, 2, UIntPtr.Zero); } }

  static void ModifiersChanged() {
    foreach (var t in triggers) {
      if (t.Vk != 0 || t.Button != 0) continue;
      if (!t.Active && mods == t.Mods) { t.Active = true; Mask(t); Emit("down " + t.Name); }
      else if (t.Active && (mods & t.Mods) != t.Mods) { t.Active = false; Emit("up " + t.Name); }
      else if (t.Active && mods != t.Mods) Emit("other");
    }
  }

  static bool AnyModifierTriggerActive() { foreach (var t in triggers) if (t.Active && t.Vk == 0 && t.Button == 0) return true; return false; }

  static IntPtr KeyHook(int code, IntPtr wParam, IntPtr lParam) {
    if (code >= 0) {
      var info = (KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT));
      if (info.vk != VK_F24 && info.vk != VK_MASK && (AcceptInjected || (info.flags & LLKHF_INJECTED) == 0)) {
        int msg = wParam.ToInt32();
        bool down = msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN, up = msg == WM_KEYUP || msg == WM_SYSKEYUP;
        int mod = ModOf(info.vk), vk = (int)info.vk;
        if (mod != 0) {
          if (down && (mods & mod) == 0) { mods |= mod; ModifiersChanged(); }
          else if (up) { mods &= ~mod; ModifiersChanged(); }
        } else if (down) {
          Trigger held;
          if (eaten.TryGetValue(vk, out held)) return (IntPtr)1; // auto-repeat of an eaten trigger
          foreach (var t in triggers) {
            if (t.Vk == vk && t.Mods == mods) { eaten[vk] = t; Mask(t); Emit("down " + t.Name); return (IntPtr)1; }
          }
          if (AnyModifierTriggerActive()) Emit("other");
        } else if (up) {
          Trigger t;
          if (eaten.TryGetValue(vk, out t)) { eaten.Remove(vk); Emit("up " + t.Name); return (IntPtr)1; }
        }
      }
    }
    return CallNextHookEx(keyHook, code, wParam, lParam);
  }

  static IntPtr MouseHook(int code, IntPtr wParam, IntPtr lParam) {
    if (code >= 0) {
      int msg = wParam.ToInt32();
      int button = 0; bool down = false;
      if (msg == WM_XBUTTONDOWN || msg == WM_XBUTTONUP || msg == WM_MBUTTONDOWN || msg == WM_MBUTTONUP) {
        var info = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));
        if (AcceptInjected || (info.flags & LLMHF_INJECTED) == 0) {
          down = msg == WM_XBUTTONDOWN || msg == WM_MBUTTONDOWN;
          button = (msg == WM_MBUTTONDOWN || msg == WM_MBUTTONUP) ? 3 : ((info.mouseData >> 16) == 1 ? 4 : 5);
        }
      }
      if (button != 0) {
        int key = -button; // eaten-map key for mouse buttons
        Trigger t;
        if (!down && eaten.TryGetValue(key, out t)) { eaten.Remove(key); Emit("up " + t.Name); return (IntPtr)1; }
        if (down) foreach (var tr in triggers) {
          if (tr.Button == button && tr.Mods == mods) { eaten[key] = tr; Emit("down " + tr.Name); return (IntPtr)1; }
        }
      }
    }
    return CallNextHookEx(mouseHook, code, wParam, lParam);
  }

  public static void Mute(bool down) { keybd_event(VK_F24, 0, down ? 0u : 2u, UIntPtr.Zero); }

  public static void Run() {
    var writer = new Thread(() => { foreach (var line in output.GetConsumingEnumerable()) { Console.Out.WriteLine(line); Console.Out.Flush(); } });
    writer.IsBackground = true; writer.Start();
    // Raw stream: with -Command the host may read the first Console.In line itself.
    var input = new System.IO.StreamReader(Console.OpenStandardInput());
    var reader = new Thread(() => {
      while (true) {
        string line = input.ReadLine();
        if (line == null || line == "quit") break;
        if (line.StartsWith("config ")) Configure(line.Substring(7));
        else if (line == "mute down") Mute(true);
        else if (line == "mute up") Mute(false);
      }
      Mute(false); // never leave the user muted in Discord
      PostThreadMessage(loopThread, 0x0012, IntPtr.Zero, IntPtr.Zero);
    });
    reader.IsBackground = true;
    loopThread = GetCurrentThreadId();
    keyHook = SetWindowsHookEx(WH_KEYBOARD_LL, keyProc, GetModuleHandle(null), 0);
    mouseHook = SetWindowsHookEx(WH_MOUSE_LL, mouseProc, GetModuleHandle(null), 0);
    Emit(keyHook == IntPtr.Zero || mouseHook == IntPtr.Zero ? "error hook" : "ready");
    reader.Start();
    MSG m;
    while (GetMessage(out m, IntPtr.Zero, 0, 0) > 0) { }
    UnhookWindowsHookEx(keyHook); UnhookWindowsHookEx(mouseHook);
    output.CompleteAdding(); writer.Join(1000);
  }
}
'@
[LeonidasDictationHook]::AcceptInjected = $env:LEONIDAS_HOOK_ACCEPT_INJECTED -eq '1'
[LeonidasDictationHook]::Run()
`;
