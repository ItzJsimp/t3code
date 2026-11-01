# Server bench: base vs batch 2 (step 0 of the deferred-7 plan)

Plan: [upstream-triage-2026-10-30.md](./upstream-triage-2026-10-30.md). Date: 2026-10-30.

## What was measured

- **Tool:** `scripts/server-bench.mjs` on branch `upstream-port/2026-10-30` (worktree `C:/lcw/up-port`). It copies a frozen database snapshot to a temp home, boots one checkout's server, and times HTTP reads. It prints one JSON line per run.
- **Data:** a read-only snapshot of the live database (`VACUUM INTO`, no write to the live file). 1131 threads, 179,116 turn items, 5.0 GB, migration 65. The snapshot stays on this machine in `C:/lcw/p5/bench-fixture` and never goes into a repo.
- **Base:** `6a95384a6a` (`origin/main`, worktree `C:/lcw/up-hotfix`). **Batch 2:** `3b3006b754` (5 upstream commits plus the typecheck fix).
- **Runs:** 3 per tree, alternating, 9 timed calls per metric. The Scribe engine was off. The batch 2 boot includes migration 66 (two new indexes).

## Results (median of 3 runs; range in brackets)

| Metric                                           | Base                      | Batch 2                   | Change |
| ------------------------------------------------ | ------------------------- | ------------------------- | ------ |
| Boot to ready (ms)                               | 15,406 [15,377 to 15,418] | 13,487 [10,486 to 14,042] | -12%   |
| Shell snapshot, cold (ms)                        | 402.8 [389 to 861]        | 468.5 [246 to 679]        | +16%   |
| Shell snapshot, warm p50 (ms)                    | 315.2 [271 to 397]        | 298.7 [181 to 311]        | -5%    |
| Thread open, largest (2076 items), warm p50 (ms) | 178.7 [149 to 224]        | 181.9 [134 to 184]        | +2%    |
| Thread open, 797 items, warm p50 (ms)            | 119.9 [105 to 136]        | 135.0 [105 to 151]        | +13%   |
| Shell under write load, p50 (ms)                 | 327.3 [309 to 516]        | 277.5 [245 to 303]        | -15%   |
| Idle file reads per minute                       | 10,337                    | 10,294                    | 0%     |
| Idle read volume (KB per minute)                 | 39,190                    | 39,033                    | 0%     |
| Idle CPU (seconds per minute)                    | 1.16                      | 1.04                      | -11%   |

Shell snapshot size: 2.35 MB on both trees.

## What the numbers say

- **Batch 2 makes no speed claim.** Every change sits inside the run-to-run spread of the base tree (warm shell: 271 to 397 ms on the same code). No metric moved outside that spread. Do not report batch 2 as faster.
- **Step 1 (SQLite reader pool) shows no gap.** Base shell reads under 20 writes per second took 327 ms, against 315 ms with no writes. The load was light (small `project.update` writes). A heavier writer may show a gap. The plan gate says to drop a step that moves no number.
- **Idle file reads are SQLite page reads, and they are cheap (traced 2026-10-30, see the section below).** With no client connected, the server tree does about 10,300 file reads (39 MB) and 1.1 CPU seconds per minute. That is 172 reads per second, but SQL time is only about 0.2 seconds per minute.
- **Shell snapshot weighs 2.35 MB and takes about 300 ms warm.** This is the number step 4 (#27106, #27098) must lower.

## Not measured (gaps)

- **Git status time through the server:** measured since the WebSocket client was added (see the section below).
- **Query count per minute.** The bench counts file reads of the process tree, which is a proxy. A true count needs a hook in the SQL client.
- **Runs with a connected client:** measured since the WebSocket client was added (see the section below).
- One base run had a bad idle counter (the process tree changed). It is dropped from the idle rows.

## Next

1. Find what causes 172 idle file reads per second (trace which files the server tree reads).
2. Add a WebSocket client to the bench for git status and a connected-client idle run.
3. Re-run both trees with 5 runs each before any speed claim.

## Idle trace (2026-10-30)

Method: a preload (`--import`) counted every `node:sqlite` call and every `fs` call in the idle server (no client, 45 s window after a 30 s settle). A per-process sampler checked the process tree. Scripts: `C:/lcw/p5/idle-probe.mjs`, `sql-probe.mjs`, `fs-probe.mjs`, `page-read-test.mjs` (not in a repo).

- **Source of the reads:** the server's own `node.exe`, 13,400 read operations and 52 MB per minute, 3.9 KB each. Child processes (`nvidia-smi`, `typeperf`, `powershell` from the hardware watch) read almost nothing.
- **SQL:** 117 statements per minute in total, using about 220 ms. The most frequent: `BEGIN IMMEDIATE` and `COMMIT` (16 each), the failed-run check (13), scheduled tasks due (13), saved item effects (13 and 13), the effect outbox lease (10 and 10). The heaviest is the shell thread-rows query (once a minute, 167 ms).
- **fs:** only 289 calls per minute, all `stat`, `access` and `lstat` checks of worktree folders (`C:/lcw` 65 per minute, `C:/` 51). No large file reads.
- **Why 117 statements make 13,400 reads:** one scan of the thread payloads costs 585 read operations (2.3 MB, 3 ms), even from cache. The SQLite page cache is 2 MB (`cache_size -2000`, 4 KB pages), so each query rereads its pages through the OS. The OS file cache serves them.

**Verdict:** the idle read count looks large but costs little. Do not treat it as a defect. Option if the count matters: raise `PRAGMA cache_size` or set `PRAGMA mmap_size` (would cut `ReadFile` calls; needs a before and after bench with a connected client). The remaining idle CPU (about 0.9 of 1.1 seconds per minute) is not SQL or fs. A `--cpu-prof` run would find it. Not done.

## WebSocket bench (2026-10-30, second pass)

Tools: `apps/server/scripts/server-bench-ws.ts` (WebSocket client), `scripts/server-bench.mjs` (adds git status and a connected-client idle run), `scripts/server-bench-git.mjs` (local git status per folder on an empty home). Base `6a95384a6a`, batch 2 `357febc81a`. 3 alternating runs per tree.

| Metric (median of 3)                                           | Base   | Batch 2 |
| -------------------------------------------------------------- | ------ | ------- |
| Shell snapshot, warm p50 (ms)                                  | 219    | 224     |
| Thread open, largest, warm p50 (ms)                            | 134    | 124     |
| Shell under write load, p50 (ms)                               | 208    | 205     |
| Explicit git refresh through the server, warm p50 (ms)         | 2,049  | 2,081   |
| Raw `git status` in the same folder (ms)                       | 103    | 109     |
| First local git status of a new folder through the server (ms) | 1,107  | 1,107   |
| Idle file reads per minute, no client                          | 13,743 | 13,787  |
| Idle file reads per minute, client connected                   | 13,699 | 13,702  |
| Idle CPU seconds per minute, client connected                  | 0.84   | 1.04    |

- **Batch 2 still shows no speed change.** All pairs sit inside the noise. This pass had less noise than the first (warm shell 212 to 228 ms on the base tree).
- **Git status has a real gap (step 2).** A new folder takes about 1.1 s through the server, while raw `git status` takes about 0.11 s in the same folder. That is 10 times slower. The overhead is about 1.0 s for each folder. The explicit refresh takes 2.0 s because it also does a remote check.
- **A connected client adds no idle cost.** The three held subscriptions (server config, shell stream, git status) gave 3 events in 65 s and the same reads as no client.
- **Plan impact:** step 2 (git status, #27103) has a measurable target: bring 1.1 s toward 0.2 s. Steps 1 and 4 still show no gap. Step 3 (connection routing) has no number yet.
- **Not known:** where the 1.0 s goes (extra git commands per status, process start cost on Windows, or serial calls). Count the git processes the server starts for one status. That is the next trace.

## Step 2: git status port (2026-10-31)

Trace of one first local status of a folder, before the port: 20 git processes in about 2.7 s on a cold cache. Four were heavy: `ls-files --others` 644 ms, `status` 216 ms, `diff-index` 197 ms, base `diff --numstat` 161 ms. The other 16 cost 32 to 65 ms each. Windows starts a process in about 20 to 40 ms, so many small serial calls add up.

Changes (branch `upstream-port/2026-10-30`, commit `963c9455dc`, not pushed):

- **Repo detection:** one `rev-parse --is-inside-work-tree --show-toplevel --git-common-dir` instead of three (upstream #27103). A path with a newline falls back to separate calls (test added).
- **Local status:** status, numstat, default branch and remote lookups start together (upstream #27103). The known default branch is passed down, so it is not looked up again.
- **Ahead count and branch totals** run together (upstream #27103).
- **Our addition:** the untracked-file listing (`ls-files --others`, the slowest step) runs beside the merge-base lookup. Upstream does not do this.
- **Left out:** the status broadcaster change in #27103 (it only merges concurrent refreshes), and `isMissingExecutable` handling (needs an earlier upstream commit; our code still fails loudly if `git` is missing).

| First local status of a new folder, through the server | Base      | Step 2    |
| ------------------------------------------------------ | --------- | --------- |
| Median over 6 folders, 3 alternating runs (ms)         | 1,321     | 1,073     |
| After the parallel port alone, before the overlap (ms) | 1,277     | 1,166     |
| Processes started for one status                       | 20        | 17        |
| Raw `git status` in the same folders (ms)              | about 115 | about 115 |

- **Gain:** about 19 percent (250 ms). It is real but small. The target was near 200 ms, and the result is about 1,070 ms.
- **Noise:** single runs range from 0.85 s to 2.8 s. The machine was busier in this pass than in the first (base 1.32 s here, 1.11 s before). Compare medians within one pass only.
- **What remains:** a serial chain of small git calls (about 100 ms to start, then branch lookups, then the 280 ms listing and the 80 ms diff), plus two `config` calls after the totals. A trace shows a 170 ms gap before `remote get-url` that I did not explain. Further speed needs the Changes totals to start earlier or be cached per folder. That is a design change, not a port.
- **Checks:** server `tsc` 0 errors; `src/vcs`, `src/sourceControl` and `src/git` tests pass (510).

## Step 3: the Changes totals start beside status, and a taskkill cost (2026-10-31)

**Cause of the "170 ms gap".** On Windows, the Effect process spawner runs `taskkill /pid /T /F` when a child exits with a non-zero code. It does this in an exit handler and again in the scope cleanup, and the cleanup waits for `taskkill.exe` to finish. This costs about 150 to 230 ms in the calling fiber. Source: `@effect/platform-node-shared` `NodeChildProcessSpawner.js`, lines 398 and 411. `taskkill` starts through `execFile`, so the spawn logger in `spawn-preload.mjs` does not show it.

- The status path had two such exits. `git config --get branch.<b>.gh-merge-base` and `git config --get branch.<b>.remote` both exit 1 when the key is unset (the normal case).
- Proof: the exit code column of `git-trace.mjs` (`x1`) lined up with every gap. After the fix all 18 processes exit 0 and the gaps are gone.

**Changes** (branch `upstream-port/2026-10-30`):

- **Early totals:** the Changes totals chain (`config`, `remote get-url`, `show-ref`, `merge-base`, then the diff) now starts together with `status`, using a fresh `symbolic-ref --short HEAD`. It does not use the cached repository paths, because they keep the old branch for 10 minutes after a checkout. The result is used only when `status` names the same branch. Otherwise the old path runs. Test: `Changes totals follow a checkout made between two status reads`. It fails when both guards are removed.
- **Config reads:** `git config --get --default ""` for `gh-merge-base` and for `readConfigValue`. An unset key now exits 0 with empty output. `readConfigValue` already maps empty output to `null`. Needs Git 2.18 or newer (2018). On an older Git the option is unknown, the call exits non-zero, and the value reads as unset.

| First local status of a new folder, through the server   | Result                                           |
| -------------------------------------------------------- | ------------------------------------------------ |
| Early totals, 3 alternating pairs, 18 runs each (ms)     | 991 to 838 median (15.5 percent)                 |
| Step 2 against early totals, one pass, 18 runs (ms)      | 1,331 to 937 median (29.6 percent), machine busy |
| Early totals against early plus config fix, 5 pairs (ms) | 1,175 to 831 median. Quiet pair: 835 to 721      |
| Processes with a non-zero exit in one status             | 2 to 0                                           |

- **Noise:** this machine was busy (raw `git status` was 105 to 395 ms in the same pass; one run took 3.9 s). Single runs vary by up to 40 percent. The mechanism is certain (the trace), the size of the gain is not. Treat 150 to 300 ms as the range.
- **Not reached:** the target of 300 ms. A first status still takes about 700 to 800 ms in quiet pairs.
- **What remains in the critical path:** repository detection before `status` starts (5 serial small `rev-parse` and `symbolic-ref` calls, about 150 to 210 ms), then `status` itself (about 190 to 330 ms), then the `ls-files --others` scan (about 280 ms, 0 bytes of output in the test folders), then the totals diff (about 85 ms).
- **Wider fix (Jake chose it, 2026-10-31):** every command that exits non-zero on Windows paid the same `taskkill` wait. That includes `show-ref --verify` on a missing remote branch, `remote get-url` with no `origin`, `symbolic-ref` on a detached HEAD, and failing provider and tool commands. A pnpm patch of `@effect/platform-node-shared` (`patches/@effect__platform-node-shared@4.0.2.patch`, commit `8c3e3911a5`) skips both taskkill calls when the child already exited, on Windows only. Other platforms and explicit kills are unchanged. Measured with the real spawner and git (9 runs each): exit 1 took 189 ms median before and 31 ms after. Exit 0 took 22 to 31 ms in both. A new Effect upgrade needs the patch re-made: `pnpm patch @effect/platform-node-shared@<version>`, and check that lines `code !== 0` in `NodeChildProcessSpawner.js` still match.

## Step 4: untracked list from status, and two levers that did not pay (2026-10-31)

Branch `perf/git-status-prelude` in `C:/lcw/up-port`. Bench: 6 adjacent pairs per lever, first status of 6 folders (`C:/lcw/p5/git-bench.mjs`), whole file swapped between runs.

| Lever | Change                                                               | Median pair difference | Pairs faster | Verdict                                                                   |
| ----- | -------------------------------------------------------------------- | ---------------------- | ------------ | ------------------------------------------------------------------------- |
| (c)   | Start the untracked scan beside `status`                             | -20 ms                 | 4 of 6       | Weak, inside noise. Kept (no extra work).                                 |
| (b)   | Run the repository path calls together                               | -48 ms                 | 3 of 6       | No proof. Dropped. It adds 2 spawns in a non-repository and broke a test. |
| (d)   | List untracked files with `status -z -uall`, not `ls-files --others` | -110 ms                | 5 of 6       | Kept. Pooled median 630 to 515 ms.                                        |

- **Why (d) works:** `ls-files --others --exclude-standard` took about 280 ms and `status -uall` about 130 ms for the same list (6 folders, same counts). `ls-files` is slower, probably because it walks ignored folders such as `node_modules`.
- **Checks:** `vp test run src/vcs/GitVcsDriverCore.test.ts src/vcs/GitVcsDriver.test.ts`: 211 pass, 3 skipped. `tsc --noEmit` in `apps/server`: 0 errors. A mock in `reads complete tracked and untracked manifests beyond 1 MB` matched `ls-files`, so it was vacuous after (d): it now matches the new `status` call. New test: untracked names with spaces and non-ASCII.
- **Risk:** the totals now run a second `git status` beside the main one. In an LFS repo with stat-dirty files, the clean filters run twice. `ls-files` did not run them.
- **Not reached:** the target of 300 ms. First status is about 500 ms now.
