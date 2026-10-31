import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Cause from "effect/Cause";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Exit from "effect/Exit";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as TestClock from "effect/testing/TestClock";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as PlatformError from "effect/PlatformError";
import { ChildProcessSpawner } from "effect/process";
import { assert, it } from "@effect/vitest";

import { CheckpointRef, GitCommandError, VcsProcessExitError } from "@t3tools/contracts";
import * as ServerConfig from "../config.ts";
import * as CheckpointStore from "../checkpointing/CheckpointStore.ts";
import * as ProcessRunner from "../processRunner.ts";
import * as GitVcsDriver from "./GitVcsDriver.ts";
import type * as VcsDriver from "./VcsDriver.ts";
import * as VcsDriverRegistry from "./VcsDriverRegistry.ts";
import * as VcsProcess from "./VcsProcess.ts";
import { runVcsDriverContractSuite } from "./testing/VcsDriverContractHarness.ts";

const layerServerConfig = ServerConfig.layerTest(process.cwd(), {
  prefix: "t3-git-vcs-contract-",
});
const layerGitContract = Layer.mergeAll(GitVcsDriver.layerVcs, GitVcsDriver.layer).pipe(
  Layer.provide(layerServerConfig),
  Layer.provideMerge(VcsProcess.layer),
  Layer.provideMerge(NodeServices.layer),
);
const layerGitCaptureContract = Layer.merge(
  layerGitContract,
  ProcessRunner.layer.pipe(Layer.provide(NodeServices.layer)),
);

const runGit = (cwd: string, args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const driver = yield* GitVcsDriver.GitVcsDriver;
    yield* driver.execute({
      operation: "GitVcsDriver.contract.git",
      cwd,
      args,
      timeoutMs: 10_000,
    });
  });

const makeCaptureStore = Effect.fn("test.makeCaptureStore")(function* (
  driver: VcsDriver.VcsDriver["Service"],
  cwd: string,
) {
  const repository = yield* driver.detectRepository(cwd);
  if (repository === null) return yield* Effect.die("Expected a test Git repository");
  const handle = { kind: repository.kind, repository, driver };
  return yield* CheckpointStore.make.pipe(
    Effect.provideService(VcsDriverRegistry.VcsDriverRegistry, {
      get: () => Effect.succeed(driver),
      detect: () => Effect.succeed(handle),
      resolve: () => Effect.succeed(handle),
    }),
  );
});

type GitContractError = GitCommandError | PlatformError.PlatformError;

runVcsDriverContractSuite<GitVcsDriver.GitVcsDriver, GitContractError>({
  name: "Git",
  kind: "git",
  layer: layerGitContract,
  fixture: {
    createRepo: (cwd) =>
      Effect.gen(function* () {
        yield* runGit(cwd, ["init"]);
        yield* runGit(cwd, ["config", "user.email", "test@test.com"]);
        yield* runGit(cwd, ["config", "user.name", "Test"]);
      }),
    writeFile: (cwd, relativePath, contents) =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const absolutePath = path.join(cwd, relativePath);
        yield* fileSystem.makeDirectory(path.dirname(absolutePath), { recursive: true });
        yield* fileSystem.writeFileString(absolutePath, contents);
      }),
    trackFile: (cwd, relativePath) => runGit(cwd, ["add", relativePath]),
    commit: (cwd, message) => runGit(cwd, ["commit", "-m", message]),
    ignorePath: (cwd, pattern) =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        yield* fileSystem.writeFileString(path.join(cwd, ".gitignore"), `${pattern}\n`);
      }),
  },
});

const makeCheckpointFixture = Effect.fn("makeCheckpointFixture")(function* (
  driver: Effect.Success<ReturnType<typeof GitVcsDriver.makeVcsDriverShape>>,
  cwd: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const git = (args: ReadonlyArray<string>) =>
    driver.execute({ operation: "checkpoint-test", cwd, args });
  yield* git(["init"]);
  yield* git(["config", "user.name", "Test"]);
  yield* git(["config", "user.email", "test@test.com"]);
  yield* fileSystem.writeFileString(path.join(cwd, "file.txt"), "initial\n");
  yield* git(["add", "."]);
  yield* git(["commit", "-m", "initial"]);
  const checkpointRef = CheckpointRef.make("refs/t3/checkpoints/test");
  yield* fileSystem.writeFileString(path.join(cwd, "file.txt"), "staged\n");
  yield* git(["add", "."]);
  yield* fileSystem.writeFileString(path.join(cwd, "file.txt"), "unstaged\n");
  return { git, checkpointRef };
});

it.effect("checkpoint capture skips untracked nested repositories without a commit", () =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3-checkpoint-unborn-" });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    const nested = "scratch/empty [repo]";
    yield* git(["init", nested]);
    yield* git(["init", "another empty"]);
    yield* fileSystem.writeFileString(path.join(cwd, nested, "private.txt"), "nested\n");
    yield* git(["init", "committed"]);
    yield* git([
      "-C",
      "committed",
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@test.com",
      "commit",
      "--allow-empty",
      "-m",
      "initial",
    ]);
    const nestedHead = (yield* git(["-C", "committed", "rev-parse", "HEAD"])).stdout.trim();
    yield* fileSystem.writeFileString(path.join(cwd, "untracked.txt"), "new\n");
    const originalIndex = yield* fileSystem.readFile(path.join(cwd, ".git", "index"));

    yield* driver.checkpoints.captureCheckpoint({ cwd, checkpointRef });

    assert.strictEqual((yield* git(["show", `${checkpointRef}:file.txt`])).stdout, "unstaged\n");
    assert.strictEqual((yield* git(["show", `${checkpointRef}:untracked.txt`])).stdout, "new\n");
    assert.strictEqual((yield* git(["ls-tree", "-r", checkpointRef, "--", nested])).stdout, "");
    assert.strictEqual((yield* git(["ls-tree", checkpointRef, "--", "another empty"])).stdout, "");
    assert.strictEqual(
      (yield* git(["ls-tree", checkpointRef, "--", "committed"])).stdout,
      `160000 commit ${nestedHead}\tcommitted\n`,
    );
    assert.deepEqual(yield* fileSystem.readFile(path.join(cwd, ".git", "index")), originalIndex);
    assert.strictEqual(
      yield* fileSystem.readFileString(path.join(cwd, nested, "private.txt")),
      "nested\n",
    );
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("checkpoint recovery discovers nested HEAD independently of inherited GIT_DIR", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-git-dir-" });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    yield* git(["init", "empty"]);
    const originalIndex = yield* fs.readFile(path.join(cwd, ".git", "index"));
    yield* Effect.acquireUseRelease(
      Effect.sync(() => {
        const previous = process.env.GIT_DIR;
        process.env.GIT_DIR = path.join(cwd, ".git");
        return previous;
      }),
      () => driver.checkpoints.captureCheckpoint({ cwd, checkpointRef }),
      (previous) =>
        Effect.sync(() => {
          if (previous === undefined) delete process.env.GIT_DIR;
          else process.env.GIT_DIR = previous;
        }),
    );
    assert.strictEqual((yield* git(["show", `${checkpointRef}:file.txt`])).stdout, "unstaged\n");
    assert.strictEqual((yield* git(["ls-tree", "-r", checkpointRef, "--", "empty"])).stdout, "");
    assert.deepEqual(yield* fs.readFile(path.join(cwd, ".git", "index")), originalIndex);
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("checkpoint capture still fails when a clean filter rejects a file", () =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "t3-checkpoint-filter-failure-",
    });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    yield* fileSystem.writeFileString(path.join(cwd, ".gitattributes"), "file.txt filter=reject\n");
    yield* git(["config", "filter.reject.clean", "false"]);
    yield* git(["config", "filter.reject.required", "true"]);
    const originalIndex = yield* fileSystem.readFile(path.join(cwd, ".git", "index"));

    const result = yield* Effect.result(
      driver.checkpoints.captureCheckpoint({ cwd, checkpointRef }),
    );

    assert.strictEqual(result._tag, "Failure");
    assert.deepEqual(yield* fileSystem.readFile(path.join(cwd, ".git", "index")), originalIndex);
    assert.isFalse(yield* driver.checkpoints.hasCheckpointRef({ cwd, checkpointRef }));
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("checkpoint capture refuses a truncated nested repository listing", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const liveProcess = yield* VcsProcess.VcsProcess;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-truncated-" });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    yield* git(["init", "empty"]);
    const captureDriver = yield* GitVcsDriver.makeVcsDriverShape().pipe(
      Effect.provideService(VcsProcess.VcsProcess, {
        run: (input) =>
          liveProcess
            .run(input)
            .pipe(
              Effect.map((result) =>
                input.args.includes("--others") ? { ...result, stdoutTruncated: true } : result,
              ),
            ),
      }),
    );

    const result = yield* Effect.result(
      captureDriver.checkpoints.captureCheckpoint({ cwd, checkpointRef }),
    );

    assert.strictEqual(result._tag, "Failure");
    assert.isFalse(yield* driver.checkpoints.hasCheckpointRef({ cwd, checkpointRef }));
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("checkpoint recovery refuses excessive candidates before probing", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const liveProcess = yield* VcsProcess.VcsProcess;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-recovery-cap-" });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    yield* git(["init", "empty0"]);
    for (let i = 1; i < 65; i++)
      yield* fs.copy(path.join(cwd, "empty0"), path.join(cwd, `empty${i}`));
    const originalIndex = yield* fs.readFile(path.join(cwd, ".git", "index"));
    let stageError: VcsProcessExitError | undefined;
    let nestedProbes = 0;
    let stageAttempts = 0;
    const captureDriver = yield* GitVcsDriver.makeVcsDriverShape().pipe(
      Effect.provideService(VcsProcess.VcsProcess, {
        run: (input) => {
          if (input.cwd !== cwd && input.args.includes("rev-parse")) nestedProbes++;
          if (input.args.includes("add") && input.args.includes("-A")) stageAttempts++;
          return liveProcess.run(input).pipe(
            Effect.tapError((error) => {
              if (error._tag === "VcsProcessExitError") stageError = error;
              return Effect.void;
            }),
          );
        },
      }),
    );
    const result = yield* Effect.result(
      captureDriver.checkpoints.captureCheckpoint({ cwd, checkpointRef }),
    );
    assert.strictEqual(nestedProbes, 0);
    assert.strictEqual(stageAttempts, 1);
    assert.strictEqual(result._tag, "Failure");
    if (result._tag === "Failure") assert.strictEqual(result.failure, stageError);
    assert.isFalse(yield* driver.checkpoints.hasCheckpointRef({ cwd, checkpointRef }));
    assert.deepEqual(yield* fs.readFile(path.join(cwd, ".git", "index")), originalIndex);
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect.each([
  { phase: "add", nestedRecovery: false, expireRecovery: false },
  { phase: "update-ref", nestedRecovery: false, expireRecovery: false },
  { phase: "update-ref", nestedRecovery: true, expireRecovery: false },
  { phase: "add", nestedRecovery: true, expireRecovery: false },
  { phase: "add", nestedRecovery: true, expireRecovery: true },
])(
  "checkpoint handles a $phase lock with nestedRecovery=$nestedRecovery, expireRecovery=$expireRecovery",
  ({ phase, nestedRecovery, expireRecovery }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const liveRunner = yield* ProcessRunner.ProcessRunner;
      const driver = yield* GitVcsDriver.makeVcsDriverShape();
      const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-ref-race-" });
      const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
      if (nestedRecovery) yield* git(["init", "empty"]);
      const originalIndex = yield* fs.readFile(path.join(cwd, ".git", "index"));
      const refLockPath = path.join(cwd, ".git", `${checkpointRef}.lock`);
      const failed = yield* Deferred.make<void>();
      const retryReached = yield* Deferred.make<void>();
      const allowRetry = yield* Deferred.make<void>();
      const clock = yield* Clock.Clock;
      const privateIndexes = new Set<string>();
      let racedAttempts = 0;
      let discoveries = 0;
      let stageError: VcsProcessExitError | undefined;
      const captureProcess = yield* VcsProcess.make.pipe(
        Effect.provideService(ProcessRunner.ProcessRunner, {
          run: (input) => {
            if (input.args.includes("--others")) discoveries += 1;
            if (input.env?.GIT_INDEX_FILE) privateIndexes.add(input.env.GIT_INDEX_FILE);
            const initialStage =
              phase === "add" && nestedRecovery && !input.stdin?.includes(":(exclude,literal)");
            if (!input.args.includes(phase) || initialStage || ++racedAttempts !== 1) {
              return liveRunner.run(input);
            }
            const lockPath = phase === "add" ? `${input.env!.GIT_INDEX_FILE!}.lock` : refLockPath;
            return Effect.gen(function* () {
              yield* fs
                .makeDirectory(path.dirname(lockPath), { recursive: true })
                .pipe(Effect.orDie);
              yield* fs.writeFileString(lockPath, "concurrent ref writer").pipe(Effect.orDie);
              return yield* liveRunner.run(input).pipe(
                Effect.ensuring(fs.remove(lockPath).pipe(Effect.orDie)),
                Effect.tap(() => Deferred.succeed(failed, undefined)),
              );
            });
          },
        }),
      );
      const captureDriver = yield* GitVcsDriver.makeVcsDriverShape().pipe(
        Effect.provideService(VcsProcess.VcsProcess, {
          run: (input) =>
            captureProcess.run(input).pipe(
              Effect.tapError((error) => {
                if (input.args.includes("add") && error._tag === "VcsProcessExitError")
                  stageError = error;
                return Effect.void;
              }),
            ),
        }),
      );
      const captureStore = yield* makeCaptureStore(captureDriver, cwd);
      const fiber = yield* captureStore.captureCheckpoint({ cwd, checkpointRef }).pipe(
        Effect.provideService(Clock.Clock, {
          ...clock,
          sleep: (duration) =>
            Duration.toMillis(duration) === 75
              ? Deferred.succeed(retryReached, undefined).pipe(
                  Effect.andThen(Deferred.await(allowRetry)),
                )
              : clock.sleep(duration),
        }),
        Effect.exit,
        Effect.forkScoped,
      );
      yield* Deferred.await(failed);
      yield* Deferred.await(retryReached);
      if (expireRecovery) yield* TestClock.adjust("5 seconds");
      else yield* Deferred.succeed(allowRetry, undefined);
      const result = yield* Fiber.join(fiber);
      if (expireRecovery) {
        if (Exit.isSuccess(result))
          return yield* Effect.die("Expected the recovery deadline to expire");
        const error = Cause.findErrorOption(result.cause);
        assert.isTrue(error._tag === "Some");
        if (error._tag === "Some") assert.strictEqual(error.value, stageError);
      } else assert.isTrue(Exit.isSuccess(result));
      assert.strictEqual(racedAttempts, expireRecovery ? 1 : 2);
      assert.strictEqual(discoveries, nestedRecovery ? 1 : 0);
      assert.strictEqual(privateIndexes.size, 1);
      assert.strictEqual(
        yield* driver.checkpoints.hasCheckpointRef({ cwd, checkpointRef }),
        !expireRecovery,
      );
      for (const index of privateIndexes) {
        assert.isFalse(yield* fs.exists(index));
        assert.isFalse(yield* fs.exists(`${index}.lock`));
      }
      assert.deepEqual(yield* fs.readFile(path.join(cwd, ".git", "index")), originalIndex);
    }).pipe(Effect.scoped, Effect.provide(layerGitCaptureContract)),
);

it.effect.each(["discovery", "probe", "retry"] as const)(
  "checkpoint recovery has one deadline including %s",
  (blockedPhase) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const liveProcess = yield* VcsProcess.VcsProcess;
      const driver = yield* GitVcsDriver.makeVcsDriverShape();
      const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-recovery-timeout-" });
      const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
      yield* git(["init", "empty"]);
      const originalIndex = yield* fs.readFile(path.join(cwd, ".git", "index"));
      const entered = yield* Deferred.make<void>();
      const discovered = yield* Deferred.make<void>();
      let stageError: VcsProcessExitError | undefined;
      let privateIndex: string | undefined;
      let interrupted = false;
      let stagingAttempts = 0;
      const captureDriver = yield* GitVcsDriver.makeVcsDriverShape().pipe(
        Effect.provideService(VcsProcess.VcsProcess, {
          run: (input) => {
            const staging = input.args.includes("add") && input.args.includes("-A");
            if (staging) {
              privateIndex = input.env?.GIT_INDEX_FILE;
              stagingAttempts += 1;
            }
            const block =
              (blockedPhase === "discovery" && input.args.includes("--others")) ||
              (blockedPhase === "probe" && input.cwd !== cwd && input.args.includes("rev-parse")) ||
              (blockedPhase === "retry" && staging && input.stdin?.includes(":(exclude,literal)"));
            if (block)
              return (
                blockedPhase === "retry"
                  ? fs
                      .writeFileString(
                        `${input.env!.GIT_INDEX_FILE!}.lock`,
                        "interrupted index write",
                      )
                      .pipe(Effect.orDie)
                  : Effect.void
              ).pipe(
                Effect.andThen(Deferred.succeed(entered, undefined)),
                Effect.andThen(Effect.never),
                Effect.onInterrupt(() =>
                  Effect.sync(() => {
                    interrupted = true;
                  }),
                ),
              );
            return liveProcess.run(input).pipe(
              Effect.tap(() =>
                blockedPhase === "probe" && input.args.includes("--others")
                  ? Deferred.succeed(discovered, undefined).pipe(
                      Effect.andThen(Effect.sleep("3 seconds")),
                    )
                  : Effect.void,
              ),
              Effect.tapError((error) => {
                if (staging && error._tag === "VcsProcessExitError") stageError = error;
                return Effect.void;
              }),
            );
          },
        }),
      );
      const captureStore = yield* makeCaptureStore(captureDriver, cwd);
      const fiber = yield* captureStore
        .captureCheckpoint({ cwd, checkpointRef })
        .pipe(Effect.flip, Effect.forkScoped);
      if (blockedPhase === "probe") {
        yield* Deferred.await(discovered);
        yield* TestClock.adjust("3 seconds");
      }
      yield* Deferred.await(entered);
      yield* TestClock.adjust(blockedPhase === "probe" ? "2 seconds" : "5 seconds");
      const error = yield* Fiber.join(fiber);
      assert.strictEqual(error, stageError);
      assert.strictEqual(stagingAttempts, blockedPhase === "retry" ? 2 : 1);
      assert.isTrue(interrupted);
      assert.isDefined(privateIndex);
      assert.isFalse(yield* fs.exists(privateIndex!));
      assert.isFalse(yield* fs.exists(`${privateIndex!}.lock`));
      assert.isFalse(yield* driver.checkpoints.hasCheckpointRef({ cwd, checkpointRef }));
      assert.deepEqual(yield* fs.readFile(path.join(cwd, ".git", "index")), originalIndex);
    }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("checkpoint recovery preserves interruption and removes the private index", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const liveProcess = yield* VcsProcess.VcsProcess;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-recovery-interrupt-" });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    yield* git(["init", "empty"]);
    const entered = yield* Deferred.make<void>();
    let privateIndex: string | undefined;
    const captureDriver = yield* GitVcsDriver.makeVcsDriverShape().pipe(
      Effect.provideService(VcsProcess.VcsProcess, {
        run: (input) => {
          if (input.args.includes("add") && input.args.includes("-A"))
            privateIndex = input.env?.GIT_INDEX_FILE;
          return input.args.includes("--others")
            ? Deferred.succeed(entered, undefined).pipe(Effect.andThen(Effect.never))
            : liveProcess.run(input);
        },
      }),
    );
    const fiber = yield* captureDriver.checkpoints
      .captureCheckpoint({ cwd, checkpointRef })
      .pipe(Effect.forkScoped);
    yield* Deferred.await(entered);
    yield* Fiber.interrupt(fiber);
    const exit = yield* Fiber.await(fiber);
    assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause));
    assert.isDefined(privateIndex);
    assert.isFalse(yield* fs.exists(privateIndex!));
    assert.isFalse(yield* driver.checkpoints.hasCheckpointRef({ cwd, checkpointRef }));
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("checkpoint capture does not rerun clean filters for unchanged indexed files", () =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3-checkpoint-cache-" });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    yield* fileSystem.writeFileString(
      path.join(cwd, ".gitattributes"),
      "stable.txt filter=probe\n",
    );
    yield* fileSystem.writeFileString(path.join(cwd, "stable.txt"), "unchanged\n");
    yield* fileSystem.writeFileString(
      path.join(cwd, ".git", "filter.cjs"),
      'require("node:fs").appendFileSync(".git/filter-runs", "read\\n"); process.stdin.pipe(process.stdout);',
    );
    yield* git(["config", "filter.probe.clean", "node .git/filter.cjs"]);
    yield* fileSystem.utimes(path.join(cwd, "stable.txt"), 1_700_000_000, 1_700_000_000);
    yield* git(["add", "."]);
    yield* git(["commit", "-m", "record stable file"]);
    yield* fileSystem.writeFileString(path.join(cwd, ".git", "filter-runs"), "");
    yield* fileSystem.writeFileString(path.join(cwd, "file.txt"), "changed\n");
    const originalIndex = yield* fileSystem.readFile(path.join(cwd, ".git", "index"));

    yield* driver.checkpoints.captureCheckpoint({ cwd, checkpointRef });

    assert.strictEqual(yield* fileSystem.readFileString(path.join(cwd, ".git", "filter-runs")), "");
    assert.strictEqual((yield* git(["show", `${checkpointRef}:file.txt`])).stdout, "changed\n");
    assert.strictEqual((yield* git(["show", `${checkpointRef}:stable.txt`])).stdout, "unchanged\n");
    assert.deepEqual(yield* fileSystem.readFile(path.join(cwd, ".git", "index")), originalIndex);
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect.each(
  [false, true].flatMap((nested) =>
    (["sparse", "flags", "manual-skip", "missing", "non-cone-missing"] as const).map(
      (indexState) => ({ nested, indexState }),
    ),
  ),
)(
  "sparse checkpoint preserves two captures (nested=$nested, index=$indexState)",
  ({ nested, indexState }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const driver = yield* GitVcsDriver.makeVcsDriverShape();
      const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-sparse-" });
      const { git } = yield* makeCheckpointFixture(driver, cwd);
      const write = Effect.fn(function* (name: string, contents: string) {
        yield* fs.makeDirectory(path.dirname(path.join(cwd, name)), { recursive: true });
        yield* fs.writeFileString(path.join(cwd, name), contents);
      });
      for (const name of [
        "scope/in/edit",
        "scope/in/delete",
        "scope/out/deep/absent",
        "scope/out/present",
        "elsewhere/file",
      ]) {
        yield* write(name, "original\n");
      }
      yield* git(["add", "."]);
      yield* git(["commit", "-m", "sparse fixture"]);
      yield* git(["sparse-checkout", "set", "--cone", "--sparse-index", "scope/in", "elsewhere"]);
      if (indexState === "non-cone-missing")
        yield* git(["sparse-checkout", "set", "--no-cone", "/scope/in/", "/elsewhere/"]);
      yield* write("scope/in/edit", "staged\n");
      yield* write("elsewhere/file", "staged outside\n");
      yield* git(["add", "."]);
      if (indexState === "flags")
        yield* git(["update-index", "--assume-unchanged", "scope/in/delete"]);
      if (indexState === "manual-skip")
        yield* git(["update-index", "--skip-worktree", "scope/in/delete"]);
      yield* git(["config", "sparse.expectFilesOutsideOfPatterns", "true"]);
      yield* write("scope/in/edit", "working\n");
      yield* write("scope/out/present", "modified skipped\n");
      yield* write("scope/out/new file", "new outside cone\n");
      yield* write("elsewhere/file", "working outside\n");
      yield* fs.remove(path.join(cwd, "scope/in/delete"));
      const indexPath = path.join(cwd, ".git/index");
      if (indexState.endsWith("missing")) yield* fs.remove(indexPath);
      const originalIndex = yield* fs.readFile(indexPath).pipe(Effect.orElseSucceed(() => null));
      const captureCwd = nested ? path.join(cwd, "scope") : cwd;
      for (const turn of [1, 2]) {
        const ref = CheckpointRef.make(`refs/t3/checkpoints/sparse/${turn}`);
        if (turn === 2) {
          yield* write("scope/in/edit", "second\n");
          yield* fs.remove(path.join(cwd, "scope/out/new file"));
          yield* write("scope/out/second", "second addition\n");
        }
        const capture = driver.checkpoints.captureCheckpoint({
          cwd: captureCwd,
          checkpointRef: ref,
        });
        if (indexState === "non-cone-missing") {
          assert.strictEqual((yield* capture.pipe(Effect.flip))._tag, "VcsProcessExitError");
          assert.isFalse(
            yield* driver.checkpoints.hasCheckpointRef({ cwd: captureCwd, checkpointRef: ref }),
          );
          assert.isFalse(yield* fs.exists(indexPath));
          break;
        }
        yield* capture;
        for (const [name, content] of [
          ["scope/out/deep/absent", "original\n"],
          ["scope/out/present", "modified skipped\n"],
          ["scope/in/edit", turn === 1 ? "working\n" : "second\n"],
          ["elsewhere/file", nested ? "original\n" : "working outside\n"],
          [
            turn === 1 ? "scope/out/new file" : "scope/out/second",
            turn === 1 ? "new outside cone\n" : "second addition\n",
          ],
        ]) {
          assert.strictEqual((yield* git(["show", `${ref}:${name}`])).stdout, content);
        }
        const files = (yield* git(["ls-tree", "-rz", "--name-only", ref])).stdout.split("\0");
        assert.notInclude(files, "scope/in/delete");
        if (turn === 2) assert.notInclude(files, "scope/out/new file");
        assert.deepEqual(
          yield* fs.readFile(indexPath).pipe(Effect.orElseSucceed(() => null)),
          originalIndex,
        );
        assert.isFalse(yield* fs.exists(path.join(cwd, "scope/out/deep/absent")));
        assert.strictEqual(
          yield* fs.readFileString(path.join(cwd, "elsewhere/file")),
          "working outside\n",
        );
      }
    }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("checkpoint capture keeps the legacy path when Git lacks add --sparse", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const liveProcess = yield* VcsProcess.VcsProcess;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-legacy-" });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    yield* git(["sparse-checkout", "set", "--cone", "included"]);
    const originalIndex = yield* fs.readFile(path.join(cwd, ".git/index"));
    const captureDriver = yield* GitVcsDriver.makeVcsDriverShape().pipe(
      Effect.provideService(VcsProcess.VcsProcess, {
        run: (input) => {
          if (input.args.includes("-h"))
            return Effect.succeed({
              exitCode: ChildProcessSpawner.ExitCode(129),
              stdout: "usage: git add",
              stderr: "",
              stdoutTruncated: false,
              stderrTruncated: false,
            });
          return liveProcess.run(
            input.args.includes("--sparse")
              ? {
                  ...input,
                  args: input.args.map((arg) =>
                    arg === "--sparse" ? "--unsupported-sparse" : arg,
                  ),
                }
              : input,
          );
        },
      }),
    );
    yield* captureDriver.checkpoints.captureCheckpoint({ cwd, checkpointRef });
    assert.strictEqual((yield* git(["show", `${checkpointRef}:file.txt`])).stdout, "unstaged\n");
    assert.deepEqual(yield* fs.readFile(path.join(cwd, ".git/index")), originalIndex);
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect.each(
  (["normal", "flags", "sparse"] as const).flatMap((indexMode) =>
    [1, 3, 4096].map((chunkSize) => ({ indexMode, chunkSize })),
  ),
)(
  "checkpoint index inspection handles entries beyond the output cap (index=$indexMode, chunk=$chunkSize)",
  ({ indexMode, chunkSize }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const liveProcess = yield* VcsProcess.VcsProcess;
      const driver = yield* GitVcsDriver.makeVcsDriverShape();
      const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-inspection-" });
      const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
      yield* fs.writeFileString(path.join(cwd, ".gitattributes"), "stable filter=probe\n");
      yield* fs.writeFileString(path.join(cwd, "stable"), "unchanged\n");
      yield* fs.writeFileString(path.join(cwd, "z-skipped"), "original\n");
      yield* fs.makeDirectory(path.join(cwd, "excluded"));
      yield* fs.writeFileString(path.join(cwd, "excluded/file"), "absent\n");
      yield* fs.writeFileString(
        path.join(cwd, ".git/filter.cjs"),
        'require("node:fs").appendFileSync(".git/reads", "read\\n"); process.stdin.pipe(process.stdout);',
      );
      yield* git(["config", "filter.probe.clean", "node .git/filter.cjs"]);
      yield* fs.utimes(path.join(cwd, "stable"), 1_700_000_000, 1_700_000_000);
      yield* git(["add", "."]);
      yield* git(["commit", "-m", "inspection fixture"]);
      if (indexMode === "flags") yield* git(["update-index", "--skip-worktree", "z-skipped"]);
      if (indexMode === "sparse")
        yield* git(["sparse-checkout", "set", "--cone", "--sparse-index", "included"]);
      yield* fs.writeFileString(path.join(cwd, "z-skipped"), "modified\n");
      yield* fs.writeFileString(path.join(cwd, ".git/reads"), "");
      const originalIndex = yield* fs.readFile(path.join(cwd, ".git/index"));
      const captureDriver = yield* GitVcsDriver.makeVcsDriverShape().pipe(
        Effect.provideService(VcsProcess.VcsProcess, {
          run: (input) =>
            liveProcess.run(
              input.args.includes("ls-files")
                ? {
                    ...input,
                    maxOutputBytes: 8,
                    onStdoutChunk: (chunk) => {
                      for (let i = 0; i < chunk.length; i += chunkSize)
                        input.onStdoutChunk?.(chunk.subarray(i, i + chunkSize));
                    },
                  }
                : input,
            ),
        }),
      );
      yield* captureDriver.checkpoints.captureCheckpoint({ cwd, checkpointRef });
      assert.strictEqual((yield* git(["show", `${checkpointRef}:z-skipped`])).stdout, "modified\n");
      if (indexMode !== "flags")
        assert.strictEqual(yield* fs.readFileString(path.join(cwd, ".git/reads")), "");
      assert.deepEqual(yield* fs.readFile(path.join(cwd, ".git/index")), originalIndex);
    }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect.each([1_700_000_000, 1_700_000_000.9999])(
  "checkpoint capture preserves same-size edits with racy index timestamps (%s)",
  (timestamp) =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const driver = yield* GitVcsDriver.makeVcsDriverShape();
      const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3-checkpoint-racy-" });
      const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
      const filePath = path.join(cwd, "file.txt");
      const indexPath = path.join(cwd, ".git", "index");
      yield* git(["config", "core.trustctime", "false"]);
      yield* fileSystem.writeFileString(filePath, "before\n");
      yield* fileSystem.utimes(filePath, timestamp, timestamp);
      yield* git(["add", "file.txt"]);
      yield* git(["commit", "-m", "record racy file"]);
      yield* fileSystem.utimes(indexPath, timestamp, timestamp);
      const originalIndex = yield* fileSystem.readFile(indexPath);
      const originalIndexMtime = (yield* fileSystem.stat(indexPath)).mtime;
      yield* fileSystem.writeFileString(filePath, "after!\n");
      yield* fileSystem.utimes(filePath, timestamp, timestamp);

      yield* driver.checkpoints.captureCheckpoint({ cwd, checkpointRef });

      assert.strictEqual((yield* git(["show", `${checkpointRef}:file.txt`])).stdout, "after!\n");
      assert.deepEqual(yield* fileSystem.readFile(indexPath), originalIndex);
      assert.deepEqual((yield* fileSystem.stat(indexPath)).mtime, originalIndexMtime);
    }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);
it.effect.each(
  [false, true].flatMap((nested) =>
    (["sparse", "flags", "manual-skip", "missing", "non-cone-missing"] as const).map(
      (indexState) => ({ nested, indexState }),
    ),
  ),
)(
  "sparse checkpoint preserves two captures (nested=$nested, index=$indexState)",
  ({ nested, indexState }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const driver = yield* GitVcsDriver.makeVcsDriverShape();
      const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-sparse-" });
      const { git } = yield* makeCheckpointFixture(driver, cwd);
      const write = Effect.fn(function* (name: string, contents: string) {
        yield* fs.makeDirectory(path.dirname(path.join(cwd, name)), { recursive: true });
        yield* fs.writeFileString(path.join(cwd, name), contents);
      });
      for (const name of [
        "scope/in/edit",
        "scope/in/delete",
        "scope/out/deep/absent",
        "scope/out/present",
        "elsewhere/file",
      ]) {
        yield* write(name, "original\n");
      }
      yield* git(["add", "."]);
      yield* git(["commit", "-m", "sparse fixture"]);
      yield* git(["sparse-checkout", "set", "--cone", "--sparse-index", "scope/in", "elsewhere"]);
      if (indexState === "non-cone-missing")
        yield* git(["sparse-checkout", "set", "--no-cone", "/scope/in/", "/elsewhere/"]);
      yield* write("scope/in/edit", "staged\n");
      yield* write("elsewhere/file", "staged outside\n");
      yield* git(["add", "."]);
      if (indexState === "flags")
        yield* git(["update-index", "--assume-unchanged", "scope/in/delete"]);
      if (indexState === "manual-skip")
        yield* git(["update-index", "--skip-worktree", "scope/in/delete"]);
      yield* git(["config", "sparse.expectFilesOutsideOfPatterns", "true"]);
      yield* write("scope/in/edit", "working\n");
      yield* write("scope/out/present", "modified skipped\n");
      yield* write("scope/out/new file", "new outside cone\n");
      yield* write("elsewhere/file", "working outside\n");
      yield* fs.remove(path.join(cwd, "scope/in/delete"));
      const indexPath = path.join(cwd, ".git/index");
      if (indexState.endsWith("missing")) yield* fs.remove(indexPath);
      const originalIndex = yield* fs.readFile(indexPath).pipe(Effect.orElseSucceed(() => null));
      const captureCwd = nested ? path.join(cwd, "scope") : cwd;
      for (const turn of [1, 2]) {
        const ref = CheckpointRef.make(`refs/t3/checkpoints/sparse/${turn}`);
        if (turn === 2) {
          yield* write("scope/in/edit", "second\n");
          yield* fs.remove(path.join(cwd, "scope/out/new file"));
          yield* write("scope/out/second", "second addition\n");
        }
        const capture = driver.checkpoints.captureCheckpoint({
          cwd: captureCwd,
          checkpointRef: ref,
        });
        if (indexState === "non-cone-missing") {
          assert.strictEqual((yield* capture.pipe(Effect.flip))._tag, "VcsProcessExitError");
          assert.isFalse(
            yield* driver.checkpoints.hasCheckpointRef({ cwd: captureCwd, checkpointRef: ref }),
          );
          assert.isFalse(yield* fs.exists(indexPath));
          break;
        }
        yield* capture;
        for (const [name, content] of [
          ["scope/out/deep/absent", "original\n"],
          ["scope/out/present", "modified skipped\n"],
          ["scope/in/edit", turn === 1 ? "working\n" : "second\n"],
          ["elsewhere/file", nested ? "original\n" : "working outside\n"],
          [
            turn === 1 ? "scope/out/new file" : "scope/out/second",
            turn === 1 ? "new outside cone\n" : "second addition\n",
          ],
        ]) {
          assert.strictEqual((yield* git(["show", `${ref}:${name}`])).stdout, content);
        }
        const files = (yield* git(["ls-tree", "-rz", "--name-only", ref])).stdout.split("\0");
        assert.notInclude(files, "scope/in/delete");
        if (turn === 2) assert.notInclude(files, "scope/out/new file");
        assert.deepEqual(
          yield* fs.readFile(indexPath).pipe(Effect.orElseSucceed(() => null)),
          originalIndex,
        );
        assert.isFalse(yield* fs.exists(path.join(cwd, "scope/out/deep/absent")));
        assert.strictEqual(
          yield* fs.readFileString(path.join(cwd, "elsewhere/file")),
          "working outside\n",
        );
      }
    }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("checkpoint capture preserves racy edits made after resetting the index", () =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const liveProcess = yield* VcsProcess.VcsProcess;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3-checkpoint-racy-reset-" });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    const racyPath = path.join(cwd, "racy.txt");
    const indexPath = path.join(cwd, ".git", "index");
    const timestamp = 1_700_000_000;
    yield* git(["config", "core.trustctime", "false"]);
    yield* fileSystem.writeFileString(racyPath, "before\n");
    yield* fileSystem.utimes(racyPath, timestamp, timestamp);
    yield* git(["add", "."]);
    yield* git(["commit", "-m", "record racy file"]);
    yield* fileSystem.writeFileString(path.join(cwd, "file.txt"), "staged\n");
    yield* git(["add", "file.txt"]);
    yield* fileSystem.utimes(indexPath, timestamp, timestamp);
    const originalIndex = yield* fileSystem.readFile(indexPath);
    const originalIndexMtime = (yield* fileSystem.stat(indexPath)).mtime;
    const captureDriver = yield* GitVcsDriver.makeVcsDriverShape().pipe(
      Effect.provideService(VcsProcess.VcsProcess, {
        run: Effect.fn(function* (input: VcsProcess.VcsProcessInput) {
          const result = yield* liveProcess.run(input);
          if (input.args.includes("read-tree") && input.args.includes("--reset")) {
            yield* fileSystem.writeFileString(racyPath, "after!\n").pipe(Effect.orDie);
            yield* fileSystem.utimes(racyPath, timestamp, timestamp).pipe(Effect.orDie);
          }
          return result;
        }),
      }),
    );

    yield* captureDriver.checkpoints.captureCheckpoint({ cwd, checkpointRef });

    assert.strictEqual((yield* git(["show", `${checkpointRef}:racy.txt`])).stdout, "after!\n");
    assert.strictEqual((yield* git(["show", `${checkpointRef}:file.txt`])).stdout, "staged\n");
    assert.deepEqual(yield* fileSystem.readFile(indexPath), originalIndex);
    assert.deepEqual((yield* fileSystem.stat(indexPath)).mtime, originalIndexMtime);
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect.each(
  [false, true].flatMap((nested) =>
    (["normal", "flags", "split"] as const).map((indexMode) => ({ nested, indexMode })),
  ),
)(
  "checkpoint index reuse preserves two turns (nested=$nested, index=$indexMode)",
  ({ nested, indexMode }) =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const driver = yield* GitVcsDriver.makeVcsDriverShape();
      const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3-checkpoint-turns-" });
      const { git } = yield* makeCheckpointFixture(driver, cwd);
      const write = (name: string, contents: string) =>
        fileSystem.writeFileString(path.join(cwd, name), contents);
      yield* fileSystem.makeDirectory(path.join(cwd, "scope"));
      for (const name of [
        "scope/staged",
        "scope/deleted",
        "scope/assumed",
        "scope/skipped",
        "outside",
      ]) {
        yield* write(name, "original\n");
      }
      yield* git(["add", "."]);
      yield* git(["commit", "-m", "initial scoped files"]);
      yield* write("scope/staged", "staged\n");
      yield* write("scope/new-deleted", "staged then deleted\n");
      yield* write("outside", "staged outside\n");
      yield* git(["add", "."]);
      if (indexMode === "flags") {
        yield* git(["update-index", "--assume-unchanged", "scope/assumed"]);
        yield* git(["update-index", "--skip-worktree", "scope/skipped"]);
      }
      if (indexMode === "split") {
        yield* git(["update-index", "--split-index"]);
      }
      const originalIndex = yield* fileSystem.readFile(path.join(cwd, ".git", "index"));
      for (const name of ["scope/staged", "scope/assumed", "scope/skipped", "outside"]) {
        yield* write(name, "working\n");
      }
      yield* write("scope/new", "first\n");
      yield* fileSystem.remove(path.join(cwd, "scope/deleted"));
      yield* fileSystem.remove(path.join(cwd, "scope/new-deleted"));
      const captureCwd = nested ? path.join(cwd, "scope") : cwd;
      const first = CheckpointRef.make("refs/t3/checkpoints/turns/1");
      const second = CheckpointRef.make("refs/t3/checkpoints/turns/2");
      yield* driver.checkpoints.captureCheckpoint({ cwd: captureCwd, checkpointRef: first });
      for (const name of ["scope/staged", "scope/assumed", "scope/skipped"]) {
        assert.strictEqual((yield* git(["show", `${first}:${name}`])).stdout, "working\n");
      }
      assert.strictEqual(
        (yield* git(["show", `${first}:outside`])).stdout,
        nested ? "original\n" : "working\n",
      );
      const files = (yield* git(["ls-tree", "-r", "--name-only", first])).stdout.split("\n");
      assert.notInclude(files, "scope/deleted");
      assert.notInclude(files, "scope/new-deleted");
      assert.include(files, "scope/new");

      yield* write("scope/staged", "second\n");
      yield* fileSystem.remove(path.join(cwd, "scope/new"));
      yield* write("scope/second", "added in second turn\n");
      yield* driver.checkpoints.captureCheckpoint({ cwd: captureCwd, checkpointRef: second });
      assert.strictEqual(
        (yield* git(["diff", "--name-only", first, second])).stdout,
        "scope/new\nscope/second\nscope/staged\n",
      );
      assert.strictEqual((yield* git(["show", `${second}:scope/staged`])).stdout, "second\n");
      assert.strictEqual(
        (yield* git(["show", `${second}:scope/second`])).stdout,
        "added in second turn\n",
      );
      assert.deepEqual(yield* fileSystem.readFile(path.join(cwd, ".git", "index")), originalIndex);
    }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect.each(["missing", "invalid"] as const)(
  "checkpoint capture falls back when the user index is %s",
  (indexState) =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const driver = yield* GitVcsDriver.makeVcsDriverShape();
      const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3-checkpoint-index-" });
      const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
      const indexPath = path.join(cwd, ".git", "index");
      if (indexState === "missing") {
        yield* fileSystem.remove(indexPath);
      } else {
        yield* fileSystem.writeFileString(indexPath, "invalid index");
      }

      yield* driver.checkpoints.captureCheckpoint({ cwd, checkpointRef });

      assert.strictEqual((yield* git(["show", `${checkpointRef}:file.txt`])).stdout, "unstaged\n");
      if (indexState === "missing") {
        assert.isFalse(yield* fileSystem.exists(indexPath));
      } else {
        assert.strictEqual(yield* fileSystem.readFileString(indexPath), "invalid index");
      }
    }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("restores empty checkpoints without changing paths outside the workspace", () =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    for (const nested of [false, true]) {
      const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3-empty-checkpoint-" });
      yield* runGit(root, ["init"]);
      yield* runGit(root, ["config", "user.email", "test@test.com"]);
      yield* runGit(root, ["config", "user.name", "Test"]);
      if (nested) {
        yield* fileSystem.writeFileString(path.join(root, "outside.txt"), "original\n");
        yield* runGit(root, ["add", "."]);
      }
      yield* runGit(root, ["commit", "--allow-empty", "-m", "initial"]);
      const cwd = nested ? path.join(root, "nested") : root;
      yield* fileSystem.makeDirectory(cwd, { recursive: true });
      const checkpointRef = CheckpointRef.make("refs/t3/checkpoints/empty");
      yield* driver.checkpoints.captureCheckpoint({ cwd, checkpointRef });
      if (nested) {
        yield* fileSystem.writeFileString(path.join(root, "outside.txt"), "changed\n");
        yield* runGit(root, ["add", "outside.txt"]);
      }
      for (const staged of [false, true]) {
        const addedPath = path.join(cwd, "added.txt");
        // The restore may remove the empty workspace folder, which the next pass needs again.
        yield* fileSystem.makeDirectory(cwd, { recursive: true });
        yield* fileSystem.writeFileString(addedPath, "new\n");
        if (staged) yield* runGit(cwd, ["add", "added.txt"]);
        assert.isTrue(
          yield* driver.checkpoints.restoreCheckpoint({
            cwd,
            checkpointRef,
            fallbackToHead: false,
          }),
        );
        assert.isFalse(yield* fileSystem.exists(addedPath));
      }
      // Git for Windows can init without the info folder.
      yield* fileSystem.makeDirectory(path.join(root, ".git", "info"), { recursive: true });
      yield* fileSystem.writeFileString(
        path.join(root, ".git", "info", "exclude"),
        "ignored.txt\n",
      );
      yield* fileSystem.makeDirectory(cwd, { recursive: true });
      yield* fileSystem.writeFileString(path.join(cwd, "ignored.txt"), "keep\n");
      yield* fileSystem.makeDirectory(path.join(cwd, "untracked"));
      yield* fileSystem.writeFileString(path.join(cwd, "untracked", "file.txt"), "remove\n");
      assert.isTrue(
        yield* driver.checkpoints.restoreCheckpoint({ cwd, checkpointRef, fallbackToHead: false }),
      );
      assert.strictEqual(yield* fileSystem.readFileString(path.join(cwd, "ignored.txt")), "keep\n");
      assert.isFalse(yield* fileSystem.exists(path.join(cwd, "untracked")));
      if (nested) {
        assert.strictEqual(
          yield* fileSystem.readFileString(path.join(root, "outside.txt")),
          "changed\n",
        );
        const staged = yield* driver.execute({
          operation: "test",
          cwd: root,
          args: ["diff", "--cached", "--name-only"],
        });
        assert.strictEqual(staged.stdout.trim(), "outside.txt");
      }
    }
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("GitVcsDriver forwards execute env to the VCS process", () => {
  let observedEnv: NodeJS.ProcessEnv | undefined;
  let observedAppendTruncationMarker: boolean | undefined;
  let observedOutputMode: VcsProcess.VcsProcessInput["outputMode"];

  return Effect.gen(function* () {
    const driver = yield* GitVcsDriver.makeVcsDriverShape();

    yield* driver.execute({
      operation: "GitVcsDriver.test.env",
      cwd: "/repo",
      args: ["status"],
      env: {
        GIT_INDEX_FILE: "/tmp/t3-index",
      },
      appendTruncationMarker: true,
      outputMode: "error",
    });

    assert.deepStrictEqual(observedEnv, {
      GIT_INDEX_FILE: "/tmp/t3-index",
    });
    assert.strictEqual(observedAppendTruncationMarker, true);
    assert.strictEqual(observedOutputMode, "error");
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        NodeServices.layer,
        Layer.mock(VcsProcess.VcsProcess)({
          run: (input) =>
            Effect.sync(() => {
              observedEnv = input.env;
              observedAppendTruncationMarker = input.appendTruncationMarker;
              observedOutputMode = input.outputMode;
              return {
                exitCode: ChildProcessSpawner.ExitCode(0),
                stdout: "",
                stderr: "",
                stdoutTruncated: false,
                stderrTruncated: false,
              };
            }),
        }),
      ),
    ),
  );
});

it.effect("GitVcsDriver batches checkpoint object durability and fsyncs the published ref", () => {
  const observedArgs: ReadonlyArray<string>[] = [];
  const observedStdin = new Map<ReadonlyArray<string>, ReadonlyArray<string>>();

  return Effect.gen(function* () {
    const driver = yield* GitVcsDriver.makeVcsDriverShape();

    yield* driver.checkpoints.captureCheckpoint({
      cwd: "/repo",
      checkpointRef: CheckpointRef.make("refs/t3/checkpoints/thread/turn/1"),
    });

    const status = observedArgs.find((args) => args.includes("status"));
    assert.isDefined(status);
    assert.include(status, "--porcelain=v1");
    for (const setting of ["core.fsmonitor=false", "core.untrackedCache=false"]) {
      assert.strictEqual(status[status.indexOf(setting) - 1], "-c", status.join(" "));
    }
    const add = observedArgs.find((args) => args.includes("add") && !args.includes("-h"));
    assert.isDefined(add);
    assert.notInclude(add, ".");
    assert.deepStrictEqual(observedStdin.get(add), [
      ":(top,literal)changed.txt",
      ":(top,literal)renamed new.txt",
      ":(top,literal)renamed old.txt",
      ":(top,literal)copied.txt",
      ":(top,literal)copy source.txt",
      ":(top,literal)untracked.txt",
    ]);

    const writeCommands = ["add", "write-tree", "commit-tree", "update-ref"];
    const writes = observedArgs.filter((args) =>
      writeCommands.some((command) => args.includes(command)),
    );
    assert.strictEqual(writes.length, 4);
    for (const args of writes.slice(0, -1)) {
      const command = args.findIndex((arg) => writeCommands.includes(arg));
      for (const setting of ["core.fsync=objects", "core.fsyncMethod=batch"]) {
        const index = args.indexOf(setting);
        assert.strictEqual(args[index - 1], "-c", args.join(" "));
        assert.isBelow(index, command);
      }
    }
    assert.deepStrictEqual(observedArgs.at(-1), [
      "-C",
      "/repo",
      "-c",
      "core.fsync=reference",
      "-c",
      "core.fsyncMethod=fsync",
      "update-ref",
      "refs/t3/checkpoints/thread/turn/1",
      "commit0000",
    ]);
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        NodeServices.layer,
        Layer.mock(VcsProcess.VcsProcess)({
          run: (input) =>
            Effect.sync(() => {
              observedArgs.push(input.args);
              if (input.stdin !== undefined) {
                observedStdin.set(input.args, input.stdin.split("\0").slice(0, -1));
              }
              const stdout = input.args.includes("status")
                ? [
                    " M changed.txt",
                    "R  renamed new.txt",
                    "renamed old.txt",
                    "C  copied.txt",
                    "copy source.txt",
                    "?? untracked.txt",
                    "",
                  ].join("\0")
                : input.args.includes("write-tree")
                  ? "tree0000\n"
                  : input.args.includes("commit-tree")
                    ? "commit0000\n"
                    : input.args.includes("--git-common-dir")
                      ? ".git\n"
                      : "";
              return {
                exitCode: ChildProcessSpawner.ExitCode(0),
                stdout,
                stderr: "",
                stdoutTruncated: false,
                stderrTruncated: false,
              };
            }),
        }),
      ),
    ),
  );
});

it.effect.each(["reused", "missing"] as const)(
  "checkpoint staged from status paths matches a whole-tree add (index=%s)",
  (indexState) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const driver = yield* GitVcsDriver.makeVcsDriverShape();
      const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-status-" });
      const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
      const write = Effect.fn(function* (name: string, contents: string) {
        yield* fs.makeDirectory(path.dirname(path.join(cwd, name)), { recursive: true });
        yield* fs.writeFileString(path.join(cwd, name), contents);
      });
      const unusual = ["sp ace.txt", "-dash.txt", "[brackets].txt", "ünï ćode.txt"];
      for (const name of ["keep.txt", "gone.txt", "sub dir/old name.txt", ...unusual]) {
        yield* write(name, `${name} original\n`);
      }
      yield* git(["add", "."]);
      yield* git(["commit", "-m", "fixture"]);

      // A staged rename, a tracked deletion, edits to odd names, and untracked files.
      yield* git(["mv", "sub dir/old name.txt", "sub dir/new name.txt"]);
      yield* fs.remove(path.join(cwd, "gone.txt"));
      yield* write("keep.txt", "keep edited\n");
      for (const name of unusual) yield* write(name, `${name} edited\n`);
      yield* write("untracked file.txt", "untracked\n");
      yield* write("deep/er/untracked.txt", "deep\n");
      yield* write("copy of keep.txt", "keep edited\n");
      if (indexState === "missing") yield* fs.remove(path.join(cwd, ".git/index"));

      yield* driver.checkpoints.captureCheckpoint({ cwd, checkpointRef });

      // Whole-tree add into a private index is the behavior this optimization must match.
      const oracleIndex = path.join(cwd, ".git", "oracle-index");
      const oracle = (args: ReadonlyArray<string>) =>
        driver.execute({
          operation: "checkpoint-test",
          cwd,
          args,
          env: { ...process.env, GIT_INDEX_FILE: oracleIndex },
        });
      yield* oracle(["read-tree", "HEAD"]);
      yield* oracle(["add", "-A", "--", "."]);
      const expectedTree = (yield* oracle(["write-tree"])).stdout.trim();
      assert.strictEqual(
        (yield* git(["rev-parse", `${checkpointRef}^{tree}`])).stdout.trim(),
        expectedTree,
      );

      const files = (yield* git(["ls-tree", "-rz", "--name-only", checkpointRef])).stdout.split(
        "\0",
      );
      assert.notInclude(files, "gone.txt");
      assert.notInclude(files, "sub dir/old name.txt");
      for (const name of ["sub dir/new name.txt", "copy of keep.txt", "deep/er/untracked.txt"]) {
        assert.include(files, name);
      }
      assert.strictEqual(
        (yield* git(["show", `${checkpointRef}:-dash.txt`])).stdout,
        "-dash.txt edited\n",
      );
    }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("checkpoint capture sees edits that a stale fsmonitor hook hides", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-fsmonitor-" });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    yield* git(["add", "."]);
    yield* git(["commit", "-m", "fixture"]);
    // A hook that always reports "nothing changed" is the worst-case stale monitor. The private
    // index is rebuilt from HEAD, so the monitor's valid bits must never reach the status pass.
    yield* git(["config", "core.fsmonitor", "printf 'token\\0' #"]);
    yield* git(["config", "core.untrackedCache", "true"]);
    yield* git(["update-index", "--fsmonitor"]);
    yield* git(["status", "--porcelain"]);
    yield* fs.writeFileString(path.join(cwd, "file.txt"), "edited behind the monitor\n");
    yield* fs.writeFileString(path.join(cwd, "added.txt"), "added behind the monitor\n");
    // The precondition: the configured monitor really hides the edit from plain status.
    assert.strictEqual((yield* git(["status", "--porcelain"])).stdout, "");

    yield* driver.checkpoints.captureCheckpoint({ cwd, checkpointRef });

    assert.strictEqual(
      (yield* git(["show", `${checkpointRef}:file.txt`])).stdout,
      "edited behind the monitor\n",
    );
    assert.strictEqual(
      (yield* git(["show", `${checkpointRef}:added.txt`])).stdout,
      "added behind the monitor\n",
    );
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect.each([
  { name: "empty status skips add", status: { stdout: "", truncated: false, exitCode: 0 } },
  {
    name: "truncated status stages the whole tree",
    status: { stdout: " M a.txt\0", truncated: true, exitCode: 0 },
  },
  {
    name: "failed status stages the whole tree",
    status: { stdout: "", truncated: false, exitCode: 128 },
  },
])("checkpoint $name", ({ status, name }) => {
  const adds: Array<string | undefined> = [];
  return Effect.gen(function* () {
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    yield* driver.checkpoints.captureCheckpoint({
      cwd: "/repo",
      checkpointRef: CheckpointRef.make("refs/t3/checkpoints/thread/turn/1"),
    });
    if (name.startsWith("empty")) assert.deepStrictEqual(adds, []);
    else assert.deepStrictEqual(adds, [".\0"]);
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        NodeServices.layer,
        Layer.mock(VcsProcess.VcsProcess)({
          run: (input) =>
            Effect.sync(() => {
              if (input.args.includes("add") && !input.args.includes("-h")) adds.push(input.stdin);
              const isStatus = input.args.includes("status");
              const stdout = isStatus
                ? status.stdout
                : input.args.includes("write-tree")
                  ? "tree0000\n"
                  : input.args.includes("commit-tree")
                    ? "commit0000\n"
                    : input.args.includes("--git-common-dir")
                      ? ".git\n"
                      : "";
              return {
                exitCode: ChildProcessSpawner.ExitCode(isStatus ? status.exitCode : 0),
                stdout,
                stderr: "",
                stdoutTruncated: isStatus && status.truncated,
                stderrTruncated: false,
              };
            }),
        }),
      ),
    ),
  );
});

it.effect("checkpoint capture handles an unborn nested repository as the only change", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-nested-only-" });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    yield* git(["add", "."]);
    yield* git(["commit", "-m", "clean"]);
    yield* git(["init", "empty"]);

    yield* driver.checkpoints.captureCheckpoint({ cwd, checkpointRef });

    assert.strictEqual((yield* git(["ls-tree", checkpointRef, "--", "empty"])).stdout, "");
    assert.strictEqual((yield* git(["show", `${checkpointRef}:file.txt`])).stdout, "unstaged\n");
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect("checkpoint capture records a moved submodule even when status ignores it", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const driver = yield* GitVcsDriver.makeVcsDriverShape();
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-submodule-" });
    const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
    const sub = path.join(cwd, "sub");
    const subGit = (args: ReadonlyArray<string>) =>
      driver.execute({ operation: "checkpoint-test", cwd: sub, args });
    yield* git(["init", "sub"]);
    yield* subGit(["config", "user.name", "Test"]);
    yield* subGit(["config", "user.email", "test@test.com"]);
    yield* fs.writeFileString(path.join(sub, "a.txt"), "one\n");
    yield* subGit(["add", "."]);
    yield* subGit(["commit", "-m", "one"]);
    yield* git(["add", "."]);
    yield* git(["commit", "-m", "with submodule"]);
    yield* git(["config", "diff.ignoreSubmodules", "all"]);
    yield* fs.writeFileString(path.join(sub, "a.txt"), "two\n");
    yield* subGit(["commit", "-am", "two"]);
    const moved = (yield* subGit(["rev-parse", "HEAD"])).stdout.trim();

    yield* driver.checkpoints.captureCheckpoint({ cwd, checkpointRef });

    assert.include((yield* git(["ls-tree", checkpointRef, "--", "sub"])).stdout, moved);
  }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect.each([
  { indexState: "reused", statusRuns: 0 },
  { indexState: "missing", statusRuns: 1 },
] as const)(
  "checkpoint runs the status pass only when the index is rebuilt (index=$indexState)",
  ({ indexState, statusRuns }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const liveProcess = yield* VcsProcess.VcsProcess;
      const driver = yield* GitVcsDriver.makeVcsDriverShape();
      const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-checkpoint-status-gate-" });
      const { git, checkpointRef } = yield* makeCheckpointFixture(driver, cwd);
      yield* git(["add", "."]);
      yield* git(["commit", "-m", "fixture"]);
      yield* fs.writeFileString(path.join(cwd, "file.txt"), "edited\n");
      if (indexState === "missing") yield* fs.remove(path.join(cwd, ".git/index"));
      let observed = 0;
      const captureDriver = yield* GitVcsDriver.makeVcsDriverShape().pipe(
        Effect.provideService(VcsProcess.VcsProcess, {
          run: (input) => {
            if (input.args.includes("status")) observed += 1;
            return liveProcess.run(input);
          },
        }),
      );

      yield* captureDriver.checkpoints.captureCheckpoint({ cwd, checkpointRef });

      assert.strictEqual(observed, statusRuns);
      assert.strictEqual((yield* git(["show", `${checkpointRef}:file.txt`])).stdout, "edited\n");
    }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);

it.effect.skipIf(process.platform === "win32")(
  "GitVcsDriver detects a repository whose path contains a newline",
  () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const parent = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3-newline-repo-" });
      const cwd = path.join(parent, "multi\nline");
      yield* fileSystem.makeDirectory(cwd);
      yield* runGit(cwd, ["init"]);
      const driver = yield* GitVcsDriver.makeVcsDriverShape();

      const repository = yield* driver.detectRepository(cwd);
      assert.strictEqual(repository?.rootPath, yield* fileSystem.realPath(cwd));
      assert.strictEqual(repository?.metadataPath, ".git");
    }).pipe(Effect.scoped, Effect.provide(layerGitContract)),
);
