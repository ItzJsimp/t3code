# Constraints: the quality bar

Agents read this file before they edit. Never weaken a rule to make a change pass. To change a rule, ask the user and record it in Exceptions.
Run all commands from the repo root, with explicit paths. Measured on 2026-10-16 (branch `main`, dirty tree).

## Floor (block the slice if it fails)

| Rule                                     | Command                                                                                                                                                                                              | Where                     | Why                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------- |
| Zero new type errors in changed paths    | `cd apps/web && ../../node_modules/.bin/vp run typecheck` (web, 2 s). Server: run, then filter output to changed paths.                                                                              | edit loop                 | CI runs typecheck on every PR.      |
| Zero lint errors in changed files        | `node_modules/.bin/vp lint <changed files>`                                                                                                                                                          | edit loop                 | CI runs `vp check`.                 |
| Format clean                             | `node_modules/.bin/vp fmt --check <changed files>`                                                                                                                                                   | edit loop                 | The pre-commit hook runs `vp fmt`.  |
| Related tests pass                       | `node_modules/.bin/vp test run <changed test files>`                                                                                                                                                 | end of slice              | Scoped runs only (AGENTS rule 5).   |
| No secrets or personal paths in the diff | `git diff --cached -U0 \| rg -n "(sk-[A-Za-z0-9]{20,}\|ghp_[A-Za-z0-9]{30,}\|AKIA[0-9A-Z]{16}\|BEGIN [A-Z ]*PRIVATE KEY\|C:\\Users\\\|D:\\Leonidas AIOS)"` must print nothing; no `.env` file staged | before commit             | The repo is public (AGENTS rule 8). |
| No em dash (U+2014) in added lines       | `git diff --cached -U0 \| rg -n "\u2014"` must print nothing                                                                                                                                         | before commit             | AGENTS rule 9.                      |
| No unused files or dependencies          | `vp run knip:check`                                                                                                                                                                                  | review or CI              | CI runs it. About 1 minute.         |
| Server boot works                        | `node scripts/smoke.mjs`                                                                                                                                                                             | when startup code changed | It catches a hung server.           |

## Warn only (report the drift, do not block)

- Performance: every code change passes [performance-gate](.agents/skills/performance-gate/SKILL.md). A perf claim needs a before and after number.
- Coverage: scoped to the changed module, never repo-wide. Command: `node_modules/.bin/vp test run --coverage --coverage.reporter=text-summary --coverage.include='<module>/**' <module test folder>`. Hold the module's baseline below; warn if any metric drops. Needs `@vitest/coverage-v8@5.0.1` (branch `chore/coverage-baseline`, not on `main` yet).
- Task board scan: warm scan 92 ms, Home build 1 ms (agent-playbook, 2026-10-14). Hold these; warn if a change raises them.
- Boot smoke: 7.6 s on the current build. Warn if it passes 10 s.

## Baseline today (failures not caused by a constraints run)

| Check                                                        | Result                                                                                                                | Owner                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Web typecheck                                                | pass, 2 s                                                                                                             | n/a                                |
| Coverage `apps/web/src/lib/usageAnalytics` (35 tests, 1.3 s) | statements 77.31%, branches 78.57%, functions 52%, lines 80.8%                                                        | n/a                                |
| `vp lint apps/web/src/components/ChatView.tsx`               | 3 errors (`shadcn(no-unknown-classes)`: `chat-banner-lane`, `chat-scroll-to-bottom`, `chat-composer-lane`), 1 warning | uncommitted work in `ChatView.tsx` |
| `WelcomeWizard.terminal.test.tsx`                            | 5 of 7 fail                                                                                                           | uncommitted work in that file      |

## Exceptions

| Rule                          | Exception                                                                                                                   | Owner | Expires    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----- | ---------- |
| Lint and test floor           | The two baseline failures above, until the owner commits that work                                                          | Jake  | 2026-10-23 |
| Server typecheck              | Old errors in `aiosDetect.test.ts`, `relativeImportExtensions.test.ts`                                                      | Jake  | 2026-11-16 |
| Coverage                      | Only one module has a baseline; add others when you change them                                                             | Jake  | 2026-11-16 |
| Unused files and dependencies | [Existing shared-browser release baseline](docs/operations/shared-browser-audit-exception.md) only; no new findings allowed | Jake  | 2026-11-01 |
