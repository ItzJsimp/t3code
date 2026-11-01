import * as Effect from "effect/Effect";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Schema from "effect/Schema";

import { endActiveDictation, tapHiddenKey } from "../../dictationHotkey/DictationHotkey.ts";
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
    bind: Schema.Literals(["done", "missing", "unknown"]),
  }),
  handler: () =>
    Effect.gen(function* () {
      const platform = yield* HostProcess.Platform;
      const apps = detectRunningApps(yield* Effect.promise(() => listProcessNames(platform)));
      return {
        discordRunning: apps.discord,
        wisprRunning: apps.wispr,
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
