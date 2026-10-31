# Shared browser release audit exception

Owner: Jake. Expires: 2026-11-01.

Jake approved this exception and release at Gate 2 on 2026-10-31.
It covers only the existing `vp run knip:check` findings listed below.
The shared browser update adds none of these files or dependencies.
New findings are not covered. All scoped code checks must pass.

Existing unused-file findings:

- [Desktop snip preload](../../apps/desktop/src/snip-overlay-preload.ts)
- [Crash worker](../../apps/server/src/crash/crashWorker.ts)
- [OpenRouter schema](../../apps/server/src/orchestration-v2/Adapters/OpenRouterAdapterV2.schema.ts)
- [Event inbox](../../apps/web/src/components/EventInbox.tsx)
- [Legacy sidebar](../../apps/web/src/components/LegacySidebar.tsx)
- [AIOS home card](../../apps/web/src/components/taskBoard/AiosHomeCard.tsx)
- [Goal progress card](../../apps/web/src/components/taskBoard/GoalProgressCard.tsx)
- [Home extra cards](../../apps/web/src/components/taskBoard/HomeExtraCards.tsx)
- [Laya monitor card](../../apps/web/src/components/taskBoard/LayaMonitorCard.tsx)
- [Ponytail card](../../apps/web/src/components/taskBoard/PonytailCard.tsx)
- [Voice log card](../../apps/web/src/components/taskBoard/VoiceLogCard.tsx)
- [Dev health](../../scripts/dev-health.mjs)
- [Prompt style extraction](../../scripts/extract-prompt-style-standard.ts)
- [AIOS folder generation](../../scripts/generate-aios-folders.ts)
- [Harness acceptance](../../scripts/harness-acceptance.mjs)
- [Feedback relay mock](../../scripts/mock-feedback-relay.ts)
- [Performance bench](../../scripts/perf-bench.mjs)
- [Ponytail commit size](../../scripts/ponytail-commit-size.mjs)
- [Server bench](../../scripts/server-bench.mjs)
- [Latency report](../../scripts/trace-latency-report.ts)

Existing dependency findings: `@formkit/auto-animate` in the [web package](../../apps/web/package.json),
and `@vitest/coverage-v8` in the [root package](../../package.json).

This exception does not approve removing these files or dependencies.
