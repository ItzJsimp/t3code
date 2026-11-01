import * as Effect from "effect/Effect";
import { hiddenKeyFor } from "@t3tools/shared/dictationTrigger";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Schema from "effect/Schema";

import {
  acknowledgeDictationStart,
  endActiveDictation,
  setDictationHotkeyPaused,
  tapHiddenKey,
} from "../../dictationHotkey/DictationHotkey.ts";
import { checkDiscordBind } from "../../dictationHotkey/discordBind.ts";
import { detectRunningApps, listProcessNames } from "../../dictationHotkey/runningApps.ts";
import * as IpcChannels from "../channels.ts";
import { makeIpcMethod } from "../DesktopIpc.ts";

export const dictationEnded = makeIpcMethod({
  channel: IpcChannels.DICTATION_ENDED_CHANNEL,
  payload: Schema.Undefined,
  result: Schema.Void,
  handler: () => endActiveDictation,
});

export const discordSetupStatus = makeIpcMethod({
  channel: IpcChannels.DISCORD_SETUP_STATUS_CHANNEL,
  payload: Schema.Undefined,
  result: Schema.Struct({
    discordRunning: Schema.Boolean,
    wisprRunning: Schema.Boolean,
    hiddenKey: Schema.String,
    bind: Schema.Literals(["done", "missing", "unknown"]),
  }),
  handler: () =>
    Effect.gen(function* () {
      const platform = yield* HostProcess.Platform;
      const apps = detectRunningApps(yield* Effect.promise(() => listProcessNames(platform)));
      return {
        discordRunning: apps.discord,
        wisprRunning: apps.wispr,
        hiddenKey: hiddenKeyFor(platform),
        bind: yield* Effect.promise(checkDiscordBind),
      };
    }),
});

export const tapDiscordKey = makeIpcMethod({
  channel: IpcChannels.TAP_DISCORD_KEY_CHANNEL,
  payload: Schema.Undefined,
  result: Schema.Void,
  handler: () => tapHiddenKey,
});

export const dictationStarted = makeIpcMethod({
  channel: IpcChannels.DICTATION_STARTED_CHANNEL,
  payload: Schema.Undefined,
  result: Schema.Void,
  handler: () => acknowledgeDictationStart,
});

export const pauseDictationHotkey = makeIpcMethod({
  channel: IpcChannels.PAUSE_DICTATION_HOTKEY_CHANNEL,
  payload: Schema.Boolean,
  result: Schema.Void,
  handler: (paused) => setDictationHotkeyPaused(paused),
});
