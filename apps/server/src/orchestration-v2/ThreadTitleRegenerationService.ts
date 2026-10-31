import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import {
  CommandId,
  type ChatAttachment,
  type MessageId,
  type ServerSettingsError,
  type ThreadId,
} from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schedule from "effect/Schedule";

import { buildThreadTitlePrompt } from "@t3tools/provider-core/server/textGenerationPrompts";

import * as ServerSettings from "../serverSettings.ts";
import { generateLocalThreadTitle } from "../textGeneration/LocalThreadTitle.ts";
import * as TextGeneration from "../textGeneration/TextGeneration.ts";
import type { OrchestratorV2Error } from "./Orchestrator.ts";
import * as ProjectStore from "./ProjectStore.ts";
import * as ThreadManagementService from "./ThreadManagementService.ts";

import { formatThreadTitleContext } from "@t3tools/provider-core/server/threadTitleContext";
export { formatThreadTitleContext } from "@t3tools/provider-core/server/threadTitleContext";

export class ThreadTitleRegenerationService extends Context.Service<
  ThreadTitleRegenerationService,
  {
    readonly execute: (input: {
      readonly threadId: ThreadId;
      readonly requestId: CommandId;
      readonly kind:
        | { readonly type: "initial"; readonly messageId: MessageId }
        | { readonly type: "regenerate"; readonly hint?: string };
    }) => Effect.Effect<
      void,
      OrchestratorV2Error | ProjectStore.ProjectStoreV2Error | ServerSettingsError
    >;
  }
>()("t3/orchestration-v2/ThreadTitleRegenerationService") {}

const MAX_REMEMBERED_THREADS = 256;

/** cyrb53: a small, fast 53-bit string hash. A rare collision only skips one regenerate. */
function hashString(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Names the exact inputs a regenerate call would send, so an unchanged thread skips the model. */
function titleInputKey(input: {
  readonly message: string;
  readonly attachmentIds: ReadonlyArray<string>;
  readonly title: string;
  readonly hint: string;
}) {
  return hashString(
    JSON.stringify([input.title.trim(), input.hint, input.message, input.attachmentIds]),
  );
}

const make = Effect.gen(function* () {
  const threads = yield* ThreadManagementService.ThreadManagementService;
  const projects = yield* ProjectStore.ProjectStoreV2;
  const serverSettings = yield* ServerSettings.ServerSettingsService;
  const textGeneration = yield* TextGeneration.TextGeneration;

  // Key of the last regenerate result per thread. In memory on purpose: a restart
  // costs at most one extra call and needs no stored-thread change.
  const settledKeys = new Map<string, string>();
  const remember = (threadId: ThreadId, key: string) => {
    settledKeys.delete(threadId);
    settledKeys.set(threadId, key);
    if (settledKeys.size > MAX_REMEMBERED_THREADS) {
      settledKeys.delete(settledKeys.keys().next().value!);
    }
  };

  const complete = (input: {
    readonly threadId: ThreadId;
    readonly requestId: CommandId;
    readonly title?: string;
    readonly failed?: boolean;
  }) =>
    threads
      .dispatch({
        type: "thread.title.regeneration.complete",
        commandId: CommandId.make(`${input.requestId}:title-complete`),
        threadId: input.threadId,
        requestId: input.requestId,
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.failed ? { failed: true } : {}),
      })
      .pipe(Effect.asVoid);

  const execute: ThreadTitleRegenerationService["Service"]["execute"] = Effect.fn(
    "ThreadTitleRegenerationService.execute",
  )(function* (input) {
    const outcome:
      | { readonly type: "stale" }
      | { readonly type: "complete"; readonly title?: string; readonly failed?: true } =
      yield* Effect.gen(function* () {
        const projection = yield* threads.getThreadRecords(
          input.threadId,
          ["messages"],
          input.kind.type === "initial"
            ? { messageIds: [input.kind.messageId] }
            : { messageRoles: ["user", "assistant"] },
        );
        if (projection.thread.titleRegeneration?.requestId !== input.requestId) {
          return { type: "stale" as const };
        }

        const project = yield* projects.get(projection.thread.projectId);
        if (Option.isNone(project)) {
          return { type: "complete" as const };
        }

        let context: {
          readonly message: string;
          readonly attachments: ReadonlyArray<ChatAttachment>;
        };
        if (input.kind.type === "initial") {
          const messageId = input.kind.messageId;
          const message = projection.messages.find(
            (candidate) => candidate.id === messageId && !candidate.streaming,
          );
          context =
            message === undefined
              ? { message: "", attachments: [] }
              : { message: message.text, attachments: message.attachments };
        } else {
          context = formatThreadTitleContext(
            projection.messages.filter((message) => !message.streaming),
          );
        }
        if (context.message.length === 0 && context.attachments.length === 0) {
          return { type: "complete" as const };
        }

        const settings = resolveProjectSettings(
          yield* serverSettings.getSettings,
          projection.thread.projectId,
        ).settings;
        const previousTitle = projection.thread.title;
        const hint = input.kind.type === "regenerate" ? (input.kind.hint?.trim() ?? "") : "";
        const keyFor = (title: string) =>
          titleInputKey({
            message: context.message,
            attachmentIds: context.attachments.map((attachment) => attachment.id),
            title,
            hint,
          });
        if (
          input.kind.type === "regenerate" &&
          settledKeys.get(input.threadId) === keyFor(previousTitle)
        ) {
          // Same thread text, same title, same hint: another call cannot do better.
          return { type: "complete" as const };
        }

        // Free path first: a local model costs no account usage. It cannot read
        // attachments, so those threads go straight to the configured model.
        const localModel = settings.promptPredictionLocalModel.trim();
        const localTitle =
          localModel.length > 0 && context.attachments.length === 0
            ? yield* Effect.promise((signal) =>
                generateLocalThreadTitle({
                  model: localModel,
                  signal,
                  prompt: buildThreadTitlePrompt({
                    message: context.message,
                    ...(input.kind.type === "regenerate" ? { previousTitle } : {}),
                    ...(hint.length > 0 ? { hint } : {}),
                    instructions: settings.threadTitleInstructions,
                  }).prompt,
                }),
              )
            : null;
        const generatedTitle = (
          localTitle ??
          (yield* textGeneration.generateThreadTitle({
            cwd: projection.thread.worktreePath ?? project.value.workspaceRoot,
            message: context.message,
            attachments: context.attachments,
            ...(input.kind.type === "regenerate" ? { previousTitle } : {}),
            ...(hint.length > 0 ? { hint } : {}),
            instructions: settings.threadTitleInstructions,
            modelSelection: settings.textGenerationModelSelection,
          })).title
        ).trim();
        const unchanged =
          generatedTitle === "New thread" ||
          (input.kind.type === "regenerate" && generatedTitle === previousTitle.trim());
        if (input.kind.type === "regenerate") {
          remember(input.threadId, keyFor(unchanged ? previousTitle : generatedTitle));
        }
        return unchanged
          ? { type: "complete" as const }
          : { type: "complete" as const, title: generatedTitle };
      }).pipe(
        Effect.retry({
          times: input.kind.type === "initial" ? 2 : 1,
          schedule: Schedule.exponential("2 seconds"),
        }),
        Effect.catchCause((cause) =>
          Cause.hasInterruptsOnly(cause)
            ? Effect.interrupt
            : Effect.logWarning("Thread title generation failed", {
                threadId: input.threadId,
                requestId: input.requestId,
                cause,
              }).pipe(
                Effect.as(
                  input.kind.type === "initial"
                    ? { type: "complete" as const, failed: true as const }
                    : { type: "complete" as const },
                ),
              ),
        ),
      );

    if (outcome.type === "stale") {
      return;
    }
    yield* complete({
      ...input,
      ...(outcome.title === undefined ? {} : { title: outcome.title }),
      ...(outcome.failed ? { failed: true } : {}),
    });
  });

  return ThreadTitleRegenerationService.of({ execute });
});

export const layer = Layer.effect(ThreadTitleRegenerationService, make);
