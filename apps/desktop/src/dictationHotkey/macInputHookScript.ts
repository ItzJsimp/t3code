/**
 * Swift helper that owns the macOS CGEventTap, the mirror of windowsInputHookScript.ts.
 * Same line protocol, so DictationHotkey.runDictationHotkey drives either helper:
 *
 * stdin:  `config <toggle>|<hold>|<mouse>`, `mute down`, `mute up`, `quit` (EOF quits too).
 * stdout: `ready`, `down <trigger>`, `up <trigger>`, `other`, `error <reason>`.
 *
 * Matching triggers are eaten; events our own process posts (the hidden key) are ignored.
 * An active tap needs the Accessibility permission. Without it the helper prints
 * `error hook` once and retries every 2 s, so granting the permission needs no restart.
 *
 * Written without a Mac to run it on: check on a Mac before this ships (task
 * macos-dictation-hook-with-accessibility).
 */
export const MAC_INPUT_HOOK_SCRIPT = String.raw`
import Cocoa
import ApplicationServices

// macOS has no F24 key code, so the hidden Discord key is F19 here.
let hiddenKey: CGKeyCode = 80
let CTRL = 1, ALT = 2, SHIFT = 4, CMD = 8, FN = 16

final class Trigger {
  let name: String
  var mods = 0
  var key: Int64 = -1
  var button: Int64 = -1
  var active = false
  init(name: String) { self.name = name }
}

let keyCodes: [String: Int64] = [
  "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8, "v": 9, "b": 11,
  "q": 12, "w": 13, "e": 14, "r": 15, "y": 16, "t": 17, "1": 18, "2": 19, "3": 20, "4": 21,
  "6": 22, "5": 23, "9": 25, "7": 26, "8": 28, "0": 29, "o": 31, "u": 32, "i": 34, "p": 35,
  "l": 37, "j": 38, "k": 40, "n": 45, "m": 46, "space": 49,
  "f1": 122, "f2": 120, "f3": 99, "f4": 118, "f5": 96, "f6": 97, "f7": 98, "f8": 100,
  "f9": 101, "f10": 109, "f11": 103, "f12": 111, "f13": 105, "f14": 107, "f15": 113,
  "f16": 106, "f17": 64, "f18": 79,
]

// All state below is touched on the main thread only (the tap runs on the main run loop).
var triggers: [Trigger] = []
var mods = 0
var eaten: [Int64: Trigger] = [:]  // key code, or -(button + 1) for mouse buttons
var eventTap: CFMachPort?
var tapInstalled = false
var reportedError = false

let outQueue = DispatchQueue(label: "leonidas.hook.out")
func emit(_ line: String) {
  outQueue.async { print(line); fflush(stdout) }  // never block the tap on a slow reader
}

func relevantMods(_ f: CGEventFlags) -> Int {
  var m = 0
  if f.contains(.maskControl) { m |= CTRL }
  if f.contains(.maskAlternate) { m |= ALT }
  if f.contains(.maskShift) { m |= SHIFT }
  if f.contains(.maskCommand) { m |= CMD }
  if f.contains(.maskSecondaryFn) { m |= FN }
  return m
}

func parse(_ name: String, _ combo: String) -> Trigger? {
  let t = Trigger(name: name)
  for raw in combo.split(separator: "+") {
    let p = raw.trimmingCharacters(in: .whitespaces).lowercased()
    switch p {
    case "ctrl": t.mods |= CTRL
    case "alt", "option": t.mods |= ALT
    case "shift": t.mods |= SHIFT
    case "win", "cmd", "command": t.mods |= CMD
    case "fn": t.mods |= FN
    case "mouse4": t.button = 3
    case "mouse5": t.button = 4
    case "middle": t.button = 2
    default:
      guard let code = keyCodes[p] else { return nil }
      t.key = code
    }
  }
  return (t.mods == 0 && t.key < 0 && t.button < 0) ? nil : t
}

func configure(_ spec: String) {
  let names = ["toggle", "hold", "mouse"]
  let parts = spec.components(separatedBy: "|")
  var list: [Trigger] = []
  for (i, name) in names.enumerated() where i < parts.count && !parts[i].isEmpty {
    if let t = parse(name, parts[i]) { list.append(t) } else { emit("error bad-trigger \(name)") }
  }
  triggers = list
}

func modifiersChanged(_ now: Int) {
  mods = now
  for t in triggers where t.key < 0 && t.button < 0 {
    if !t.active && mods == t.mods { t.active = true; emit("down \(t.name)") }
    else if t.active && (mods & t.mods) != t.mods { t.active = false; emit("up \(t.name)") }
    else if t.active && mods != t.mods { emit("other") }
  }
}

func mute(_ down: Bool) {
  let source = CGEventSource(stateID: .privateState)
  CGEvent(keyboardEventSource: source, virtualKey: hiddenKey, keyDown: down)?.post(tap: .cghidEventTap)
}

let callback: CGEventTapCallBack = { _, type, event, _ in
  if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
    if let tap = eventTap { CGEvent.tapEnable(tap: tap, enable: true) }
    return Unmanaged.passUnretained(event)
  }
  if event.getIntegerValueField(.eventSourceUnixProcessID) == Int64(getpid()) {
    return Unmanaged.passUnretained(event)  // our own hidden key
  }
  let eventMods = relevantMods(event.flags)
  switch type {
  case .flagsChanged:
    modifiersChanged(eventMods)
  case .keyDown:
    let code = event.getIntegerValueField(.keyboardEventKeycode)
    if eaten[code] != nil { return nil }  // auto-repeat of an eaten trigger
    if let t = triggers.first(where: { $0.key == code && $0.mods == eventMods }) {
      eaten[code] = t
      emit("down \(t.name)")
      return nil
    }
    if triggers.contains(where: { $0.active && $0.key < 0 && $0.button < 0 }) { emit("other") }
  case .keyUp:
    let code = event.getIntegerValueField(.keyboardEventKeycode)
    if let t = eaten.removeValue(forKey: code) { emit("up \(t.name)"); return nil }
  case .otherMouseDown:
    let button = event.getIntegerValueField(.mouseEventButtonNumber)
    if let t = triggers.first(where: { $0.button == button && $0.mods == eventMods }) {
      eaten[-(button + 1)] = t
      emit("down \(t.name)")
      return nil
    }
  case .otherMouseUp:
    let button = event.getIntegerValueField(.mouseEventButtonNumber)
    if let t = eaten.removeValue(forKey: -(button + 1)) { emit("up \(t.name)"); return nil }
  default:
    break
  }
  return Unmanaged.passUnretained(event)
}

func installTap() {
  if tapInstalled { return }
  let types: [CGEventType] = [.keyDown, .keyUp, .flagsChanged, .otherMouseDown, .otherMouseUp]
  let mask = types.reduce(CGEventMask(0)) { $0 | (CGEventMask(1) << CGEventMask($1.rawValue)) }
  guard let tap = CGEvent.tapCreate(
    tap: .cgSessionEventTap, place: .headInsertEventTap, options: .defaultTap,
    eventsOfInterest: mask, callback: callback, userInfo: nil
  ) else {
    if !reportedError { reportedError = true; emit("error hook") }  // no Accessibility yet
    return
  }
  eventTap = tap
  CFRunLoopAddSource(CFRunLoopGetMain(), CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0), .commonModes)
  CGEvent.tapEnable(tap: tap, enable: true)
  tapInstalled = true
  emit("ready")
}

let reader = Thread {
  while let line = readLine() {
    if line == "quit" { break }
    if line.hasPrefix("config ") {
      let spec = String(line.dropFirst(7))
      DispatchQueue.main.async { configure(spec) }
    } else if line == "mute down" { mute(true) }
    else if line == "mute up" { mute(false) }
  }
  mute(false)  // never leave the user muted in Discord
  outQueue.sync {}
  exit(0)
}
reader.start()
installTap()
Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { _ in installTap() }
RunLoop.main.run()
`;
