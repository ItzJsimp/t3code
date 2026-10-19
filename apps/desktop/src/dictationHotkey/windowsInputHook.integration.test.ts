import * as NodeServices from "@effect/platform-node/NodeServices";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { Effect, Fiber, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { expect, it } from "@effect/vitest";

import { spawnWindowsInputHook } from "./DictationHotkey.ts";

// Sends real input to this desktop: F23 (no physical key) and Mouse 4 (eaten by the hook).
const INJECT = `
Add-Type -Namespace T -Name U -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte v, byte s, uint f, UIntPtr e); [DllImport("user32.dll")] public static extern void mouse_event(uint f, int x, int y, uint d, UIntPtr e);'
[T.U]::keybd_event(0x86, 0, 0, [UIntPtr]::Zero); [T.U]::keybd_event(0x86, 0, 2, [UIntPtr]::Zero)
[T.U]::mouse_event(0x80, 0, 0, 1, [UIntPtr]::Zero); [T.U]::mouse_event(0x100, 0, 0, 1, [UIntPtr]::Zero)
`;
const F24_STATE = `
Add-Type -Namespace T -Name K -MemberDefinition '[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int v);'
[T.K]::GetAsyncKeyState(0x87) -band 0x8000
`;

const ps = (script: string) =>
  Effect.scoped(
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const handle = yield* spawner.spawn(
        ChildProcess.make("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]),
      );
      const out = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString);
      return out.trim();
    }),
  );

it.live.skipIf(HostProcess.Platform.defaultValue() !== "win32")(
  "Windows input hook helper reports and eats triggers, and releases F24 when it quits",
  () =>
    Effect.gen(function* () {
      const environment = yield* HostProcess.Environment;
      const seen = yield* Effect.scoped(
        Effect.gen(function* () {
          const helper = yield* spawnWindowsInputHook({
            ...environment,
            LEONIDAS_HOOK_ACCEPT_INJECTED: "1",
          });
          const lines: string[] = [];
          const reader = yield* helper.lines.pipe(
            Stream.takeUntil((line) => line === "up mouse"),
            Stream.runForEach((line) => Effect.sync(() => void lines.push(line))),
            Effect.forkScoped,
          );
          yield* helper.send("config F23||Mouse4");
          yield* helper.send("mute down");
          // Wait for "ready" so the hooks exist before input arrives.
          while (!lines.includes("ready")) yield* Effect.sleep("50 millis");
          yield* ps(INJECT);
          yield* Fiber.join(reader).pipe(Effect.timeout("10 seconds"));
          return lines;
        }),
      );
      expect(seen).toEqual(["ready", "down toggle", "up toggle", "down mouse", "up mouse"]);
      expect(yield* ps(F24_STATE)).toBe("0");
    }).pipe(Effect.provide(NodeServices.layer)),
  30_000,
);
