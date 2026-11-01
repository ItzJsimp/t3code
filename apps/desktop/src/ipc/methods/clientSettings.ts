import { ClientSettingsSchema, DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import {
  dictationConfigFromSettings,
  reconfigureDictationHotkey,
  sameDictationConfig,
} from "../../dictationHotkey/DictationHotkey.ts";
import * as DesktopEnvironment from "../../app/DesktopEnvironment.ts";
import * as DesktopClientSettings from "../../settings/DesktopClientSettings.ts";
import * as DesktopSnapShot from "../../snapShot/DesktopSnapShot.ts";
import * as IpcChannels from "../channels.ts";
import * as DesktopIpc from "../DesktopIpc.ts";

export const getClientSettings = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.GET_CLIENT_SETTINGS_CHANNEL,
  payload: Schema.Void,
  result: Schema.NullOr(ClientSettingsSchema),
  handler: Effect.fn("desktop.ipc.clientSettings.get")(function* () {
    const clientSettings = yield* DesktopClientSettings.DesktopClientSettings;
    return Option.getOrNull(yield* clientSettings.get);
  }),
});

export const setClientSettings = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.SET_CLIENT_SETTINGS_CHANNEL,
  payload: ClientSettingsSchema,
  result: Schema.Void,
  handler: Effect.fn("desktop.ipc.clientSettings.set")(function* (settings) {
    const clientSettings = yield* DesktopClientSettings.DesktopClientSettings;
    const snapShot = yield* DesktopSnapShot.DesktopSnapShot;
    const { platform } = yield* DesktopEnvironment.DesktopEnvironment;
    const before = dictationConfigFromSettings(
      platform,
      // A corrupt file must not block the save that would repair it.
      Option.getOrElse(
        yield* clientSettings.get.pipe(Effect.orElseSucceed(() => Option.none())),
        () => DEFAULT_CLIENT_SETTINGS,
      ),
    );
    yield* clientSettings.set(settings);
    yield* snapShot.configure(settings);
    const after = dictationConfigFromSettings(platform, settings);
    // Any other setting must not end a dictation that is running.
    if (!sameDictationConfig(before, after)) {
      yield* reconfigureDictationHotkey(after.triggers, after.mode);
    }
  }),
});
