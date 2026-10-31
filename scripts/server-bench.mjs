#!/usr/bin/env node
// Server read-path benchmark on a frozen snapshot of a real state database.
// It copies the snapshot into a temp home, boots the server of one checkout against it,
// and times what the sidebar and a thread open ask for over HTTP. One JSON line per run.
//   node scripts/server-bench.mjs --root C:/lcw/up-look --label base --fixture C:/lcw/p5/bench-fixture
//   --runs 7  --idle-seconds 60  --out <jsonl>  --keep (keep the temp home)
// The fixture folder holds statev2.sqlite and fixture.json (thread ids by size).
// Git status and the connected-client idle run use apps/server/scripts/server-bench-ws.ts (WebSocket). Per-query counts need a SQL hook.
import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const root = resolve(flag("--root", "."));
const label = flag("--label", "run");
const fixture = resolve(flag("--fixture", "C:/lcw/p5/bench-fixture"));
const runs = Number(flag("--runs", "7"));
const idleSeconds = Number(flag("--idle-seconds", "60"));
const out = resolve(flag("--out", "C:/lcw/p5/bench-results.jsonl"));
const keep = argv.includes("--keep");
// Repo whose git status is timed through the server (a dirty checkout with many files is the hard case).
const gitCwd = resolve(flag("--git-cwd", root));
const entry = join(root, "apps/server/src/bin.ts");
const meta = JSON.parse(readFileSync(join(fixture, "fixture.json"), "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (xs, p) =>
  [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))];
const stat = (xs) => ({
  min: +Math.min(...xs).toFixed(1),
  p50: +pct(xs, 0.5).toFixed(1),
  max: +Math.max(...xs).toFixed(1),
  n: xs.length,
});

const home = mkdtempSync(join(tmpdir(), "leonidas-bench-"));
mkdirSync(join(home, "userdata"));
const copyStart = performance.now();
copyFileSync(join(fixture, "statev2.sqlite"), join(home, "userdata", "statev2.sqlite"));
const copyMs = performance.now() - copyStart;

const env = {
  ...process.env,
  T3CODE_HOME: home,
  T3CODE_NO_BROWSER: "1",
  ELECTRON_RUN_AS_NODE: "1",
  LEONIDAS_SCRIBE_ENGINE_BIN: "",
}; // no Scribe engine: its restart loop would add idle CPU
let server;
let log = "";

function cleanup() {
  if (server?.pid && server.exitCode === null) {
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  }
  try {
    // A file lock outlives the kill by a moment; a failed delete must not hide the result.
    if (!keep) rmSync(home, { recursive: true, force: true, maxRetries: 20, retryDelay: 500 });
  } catch (error) {
    console.error(`[bench] temp home not removed: ${error.code} ${home}`);
  }
}
function fail(reason) {
  console.error(`[bench] FAIL: ${reason}\n${log.slice(-1500)}`);
  cleanup();
  process.exit(1);
}

const freePort = () =>
  new Promise((res, rej) => {
    const probe = createServer();
    probe.once("error", rej);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => res(port));
    });
  });

function cli(args) {
  const r = spawnSync(process.execPath, [entry, ...args, "--base-dir", home], {
    cwd: root,
    env,
    encoding: "utf8",
    timeout: 60_000,
  });
  return r.stdout.trim();
}

// Win32_Process counters of the server tree: file read operations, bytes, CPU 100 ns ticks.
function procCounters(pid) {
  const ps = `$ids=@(${pid}); $all=Get-CimInstance Win32_Process; do{$n=$all|?{$ids -contains $_.ParentProcessId -and $ids -notcontains $_.ProcessId}|%{$_.ProcessId};$ids+=$n}while($n); $p=$all|?{$ids -contains $_.ProcessId}; $o=($p|Measure-Object ReadOperationCount -Sum).Sum; $b=($p|Measure-Object ReadTransferCount -Sum).Sum; $c=($p|Measure-Object UserModeTime -Sum).Sum+($p|Measure-Object KernelModeTime -Sum).Sum; "$o $b $c"`;
  const [ops, bytes, cpu] = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
    encoding: "utf8",
  })
    .stdout.trim()
    .split(" ")
    .map(Number);
  return { ops, bytes, cpuSec: cpu / 1e7 };
}

const port = await freePort();
const origin = `http://127.0.0.1:${port}`;
const bootStart = performance.now();
server = spawn(
  process.execPath,
  [entry, "--base-dir", home, "--host", "127.0.0.1", "--port", String(port), "--no-browser"],
  { cwd: root, env },
);
server.stdout.on("data", (d) => (log = (log + d).slice(-6000)));
server.stderr.on("data", (d) => (log = (log + d).slice(-6000)));
process.on("SIGINT", () => fail("interrupted"));

while (performance.now() - bootStart < 600_000) {
  if (server.exitCode !== null) fail(`server exited ${server.exitCode} before ready`);
  try {
    if (
      (await fetch(`${origin}/.well-known/t3/environment`, { signal: AbortSignal.timeout(5000) }))
        .status === 200
    )
      break;
  } catch {}
  await sleep(250);
}
const bootMs = performance.now() - bootStart;

const token = cli(["auth", "session", "issue", "--token-only"]);
if (!token) fail("no bearer token from auth session issue");
const headers = { authorization: `Bearer ${token}`, "x-t3-orchestration-protocol": "2" };
const timed = async (path, init = {}) => {
  const t = performance.now();
  const res = await fetch(origin + path, { headers, ...init });
  const buf = await res.arrayBuffer();
  if (!res.ok) fail(`${path} -> HTTP ${res.status}: ${Buffer.from(buf).toString().slice(0, 200)}`);
  return { ms: performance.now() - t, bytes: buf.byteLength, body: buf };
};

// WebSocket half: apps/server/scripts/server-bench-ws.ts (git status and held subscriptions).
const wsArgs = (mode, extra) => [
  "apps/server/scripts/server-bench-ws.ts",
  "--origin",
  origin,
  "--token",
  token,
  "--cwd",
  gitCwd,
  "--mode",
  mode,
  ...extra,
];
function wsStatus() {
  const r = spawnSync(process.execPath, wsArgs("status", ["--runs", String(runs)]), {
    cwd: root,
    encoding: "utf8",
    timeout: 300_000,
  });
  const line = r.stdout.trim().split(/\r?\n/).pop() || r.stderr.slice(-300);
  try {
    return JSON.parse(line);
  } catch {
    return { error: line.slice(0, 300) };
  }
}

// Let startup work (projection maintenance, indexing) finish before timing reads.
await sleep(20_000);

const result = {
  label,
  root,
  at: new Date().toISOString(),
  fixture: { threads: meta.threads, turnItems: meta.turnItems, maxMigration: meta.maxMigration },
  copyMs: Math.round(copyMs),
  bootMs: Math.round(bootMs),
};

// 1. Sidebar shell snapshot: first call (cold), then warm calls.
const shell0 = await timed("/api/orchestration/shell");
const shellWarm = [];
for (let i = 0; i < runs; i++) shellWarm.push((await timed("/api/orchestration/shell")).ms);
result.shell = { coldMs: +shell0.ms.toFixed(1), bytes: shell0.bytes, warm: stat(shellWarm) };

// 2. Thread open: bounded snapshot of four threads by size.
result.threadOpen = {};
for (const [name, id] of Object.entries(meta.threadIds)) {
  const path = `/api/orchestration/threads/${encodeURIComponent(id)}/bounded?compactTurnItems=1&dedupeBodies=1`;
  const first = await timed(path);
  const warm = [];
  for (let i = 0; i < runs; i++) warm.push((await timed(path)).ms);
  result.threadOpen[name] = {
    turnItems: meta.counts[name],
    coldMs: +first.ms.toFixed(1),
    bytes: first.bytes,
    warm: stat(warm),
  };
}

// 3. Shell reads while the server writes: project.update with a new title, about 20 per second.
const projects = JSON.parse(Buffer.from((await timed("/api/projects")).body).toString());
const project = (projects.projects ?? projects)[0];
if (project) {
  let stop = false;
  let writes = 0;
  const writer = (async () => {
    while (!stop) {
      await fetch(`${origin}/api/projects/mutate`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          type: "project.update",
          commandId: `bench-${Date.now()}-${writes}`,
          projectId: project.id,
          title: `${project.title.replace(/ #\d+$/, "")} #${writes % 100}`,
        }),
      }).catch(() => {});
      writes++;
      await sleep(50);
    }
  })();
  await sleep(500);
  const underWrite = [];
  for (let i = 0; i < runs; i++) underWrite.push((await timed("/api/orchestration/shell")).ms);
  stop = true;
  await writer;
  result.shellUnderWrite = { ...stat(underWrite), writes };
} else {
  result.shellUnderWrite = null;
}

// 3b. Git status through the server over WebSocket, with the raw git time as the floor.
const rawGit = [];
for (let i = 0; i < 3; i++) {
  const t = performance.now();
  spawnSync("git", ["status", "--porcelain=v2", "--branch"], {
    cwd: gitCwd,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  rawGit.push(performance.now() - t);
}
result.gitStatus = { viaServer: wsStatus(), rawGitMs: stat(rawGit) };

// 4. Idle cost: file reads and CPU of the server tree with no client connected.
await sleep(10_000);
const a = procCounters(server.pid);
const t0 = performance.now();
await sleep(idleSeconds * 1000);
const b = procCounters(server.pid);
const mins = (performance.now() - t0) / 60_000;
result.idlePerMin = {
  readOps: Math.round((b.ops - a.ops) / mins),
  readKB: Math.round((b.bytes - a.bytes) / 1024 / mins),
  cpuSec: +((b.cpuSec - a.cpuSec) / mins).toFixed(2),
  seconds: idleSeconds,
};

// 5. Idle cost with the app's subscriptions held open (server config, shell stream, git status).
{
  const holdFor = 15 + idleSeconds + 5;
  const holder = spawn(process.execPath, wsArgs("hold", ["--seconds", String(holdFor)]), {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let holdOut = "";
  holder.stdout.on("data", (d) => (holdOut += d));
  await sleep(15_000);
  const c = procCounters(server.pid);
  const ct0 = performance.now();
  await sleep(idleSeconds * 1000);
  const d = procCounters(server.pid);
  const cm = (performance.now() - ct0) / 60_000;
  result.idleConnectedPerMin = {
    readOps: Math.round((d.ops - c.ops) / cm),
    readKB: Math.round((d.bytes - c.bytes) / 1024 / cm),
    cpuSec: +((d.cpuSec - c.cpuSec) / cm).toFixed(2),
    seconds: idleSeconds,
  };
  await new Promise((r) => {
    holder.on("exit", r);
    setTimeout(() => {
      holder.kill();
      r();
    }, 20_000);
  });
  try {
    result.idleConnectedPerMin.events = JSON.parse(holdOut.trim().split(/\r?\n/).pop()).counts;
  } catch {}
}

appendFileSync(out, JSON.stringify(result) + "\n");
console.log(JSON.stringify(result, null, 2));
cleanup();
