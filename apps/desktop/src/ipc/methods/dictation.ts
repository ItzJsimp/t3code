import * as Effect from "effect/Effect";
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
    Effect.promise(async () => {
      const apps = detectRunningApps(await listProcessNames());
      return {
        discordRunning: apps.discord,
        wisprRunning: apps.wispr,
        bind: await checkDiscordBind(),
      };
    }),
});

export const tapDiscordKey = makeIpcMethod({
  channel: IpcChannels.TAP_DISCORD_KEY_CHANNEL,
  payload: Schema.Undefined,
  result: Schema.Void,
  handler: () => tapHiddenKey,
});
