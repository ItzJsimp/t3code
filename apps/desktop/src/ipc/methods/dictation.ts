import * as Schema from "effect/Schema";

import { endActiveDictation } from "../../dictationHotkey/DictationHotkey.ts";
import * as IpcChannels from "../channels.ts";
import { makeIpcMethod } from "../DesktopIpc.ts";

export const dictationEnded = makeIpcMethod({
  channel: IpcChannels.DICTATION_ENDED_CHANNEL,
  payload: Schema.Undefined,
  result: Schema.Void,
  handler: () => endActiveDictation,
});
