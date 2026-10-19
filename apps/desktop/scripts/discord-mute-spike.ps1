# Throwaway spike for card discord-mute-spike-sent-key-on-windows.
# Eats Mouse 4 with a low-level hook, holds F24 down while "dictating", and logs callback cost.
# Commands on stdin: down, up, quit. Events on stdout.
param([switch]$SelfTest, [switch]$AcceptInjected, [int]$TapAfter = 0, [int]$HoldFor = 0)

Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

public static class DictationHookSpike {
  const int WH_MOUSE_LL = 14;
  const int WM_XBUTTONDOWN = 0x020B, WM_XBUTTONUP = 0x020C;
  const uint LLMHF_INJECTED = 1;
  const byte VK_F24 = 0x87;
  const uint KEYEVENTF_KEYUP = 2;

  [StructLayout(LayoutKind.Sequential)]
  struct MSLLHOOKSTRUCT { public int x, y; public uint mouseData, flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Sequential)]
  struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam, lParam; public uint time; public int x, y; }
  delegate IntPtr HookProc(int code, IntPtr wParam, IntPtr lParam);

  [DllImport("user32.dll")] static extern IntPtr SetWindowsHookEx(int id, HookProc proc, IntPtr mod, uint thread);
  [DllImport("user32.dll")] static extern bool UnhookWindowsHookEx(IntPtr hook);
  [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] static extern int GetMessage(out MSG msg, IntPtr hwnd, uint min, uint max);
  [DllImport("user32.dll")] static extern bool PostThreadMessage(uint thread, uint msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  [DllImport("kernel32.dll")] static extern IntPtr GetModuleHandle(string name);

  public static bool AcceptInjected;
  static HookProc proc = Hook; // keep a reference so the GC does not collect it
  static IntPtr hook;
  static uint loopThread;
  public static readonly System.Collections.Generic.List<double> Costs = new System.Collections.Generic.List<double>();

  static IntPtr Hook(int code, IntPtr wParam, IntPtr lParam) {
    long t0 = Stopwatch.GetTimestamp();
    if (code >= 0) {
      int msg = wParam.ToInt32();
      if (msg == WM_XBUTTONDOWN || msg == WM_XBUTTONUP) {
        var info = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));
        bool mouse4 = (info.mouseData >> 16) == 1;
        bool injected = (info.flags & LLMHF_INJECTED) != 0;
        if (mouse4 && (AcceptInjected || !injected)) {
          Console.Out.WriteLine(msg == WM_XBUTTONDOWN ? "mouse4 down" : "mouse4 up");
          Console.Out.Flush();
          lock (Costs) Costs.Add((Stopwatch.GetTimestamp() - t0) * 1000.0 / Stopwatch.Frequency);
          return (IntPtr)1; // eat it: no Back in the focused app
        }
      }
    }
    return CallNextHookEx(hook, code, wParam, lParam);
  }

  public static void Key(bool down) { keybd_event(VK_F24, 0, down ? 0 : KEYEVENTF_KEYUP, UIntPtr.Zero); }

  public static void Run() {
    loopThread = GetCurrentThreadId();
    hook = SetWindowsHookEx(WH_MOUSE_LL, proc, GetModuleHandle(null), 0);
    Console.Out.WriteLine(hook == IntPtr.Zero ? "error hook" : "ready");
    Console.Out.Flush();
    MSG m;
    while (GetMessage(out m, IntPtr.Zero, 0, 0) > 0) { }
    UnhookWindowsHookEx(hook);
  }

  public static void Stop() { PostThreadMessage(loopThread, 0x0012 /* WM_QUIT */, IntPtr.Zero, IntPtr.Zero); }

  public static void StartStdin() {
    var input = new System.IO.StreamReader(Console.OpenStandardInput());
    var t = new Thread(() => {
      while (true) {
        string line = input.ReadLine();
        if (line == null || line == "quit") { Key(false); Stop(); return; }
        if (line == "down") { Key(true); Console.Out.WriteLine("f24 down"); Console.Out.Flush(); }
        if (line == "up") { Key(false); Console.Out.WriteLine("f24 up"); Console.Out.Flush(); }
      }
    });
    t.IsBackground = true;
    t.Start();
  }
}
"@

if ($TapAfter) {
  # For the Discord keybind recorder: click Record in Discord, then wait.
  "Sending F24 in $TapAfter s..."; Start-Sleep -Seconds $TapAfter
  [DictationHookSpike]::Key($true); Start-Sleep -Milliseconds 100; [DictationHookSpike]::Key($false); "sent"; exit 0
}
if ($HoldFor) {
  # In a Discord call: F24 stays down for $HoldFor s, like a dictation.
  "F24 down for $HoldFor s"; [DictationHookSpike]::Key($true)
  try { Start-Sleep -Seconds $HoldFor } finally { [DictationHookSpike]::Key($false) }; "F24 up"; exit 0
}
if ($SelfTest) {
  # No Discord needed: send F24 down and up, report timing. Exit 0 on success.
  $sw = [Diagnostics.Stopwatch]::StartNew()
  [DictationHookSpike]::Key($true); [DictationHookSpike]::Key($false)
  "self-test ok: F24 down/up in $($sw.Elapsed.TotalMilliseconds) ms"
  exit 0
}

[DictationHookSpike]::AcceptInjected = [bool]$AcceptInjected
[DictationHookSpike]::StartStdin()
[DictationHookSpike]::Run()
$c = [DictationHookSpike]::Costs | Sort-Object
if ($c.Count) { "hook calls: $($c.Count), median ms: $($c[[int]($c.Count / 2)]), max ms: $($c[-1])" }
