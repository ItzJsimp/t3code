// Local git status through the server, per folder, on an empty home (the database does not matter here).
//   node scripts/server-bench-git.mjs --root C:/lcw/up-port --label batch2 --out C:/lcw/p5/git-results.jsonl
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : d;
};
const root = resolve(flag("--root", "."));
const label = flag("--label", "run");
const out = flag("--out", "C:/lcw/p5/git-results.jsonl");
const cwds = flag(
  "--cwds",
  "C:/lcw/up-look,C:/lcw/perf-bench,C:/lcw/celebration,C:/lcw/content-lens,C:/lcw/onboarding-v2,C:/lcw/discord-mute",
).split(",");
const entry = join(root, "apps/server/src/bin.ts");
const home = mkdtempSync(join(tmpdir(), "leonidas-git-"));
const env = {
  ...process.env,
  T3CODE_HOME: home,
  T3CODE_NO_BROWSER: "1",
  ELECTRON_RUN_AS_NODE: "1",
  LEONIDAS_SCRIBE_ENGINE_BIN: "",
};
const port = await new Promise((res) => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => {
    const p = s.address().port;
    s.close(() => res(p));
  });
});
const server = spawn(
  process.execPath,
  [entry, "--base-dir", home, "--host", "127.0.0.1", "--port", String(port), "--no-browser"],
  { cwd: root, env, stdio: "ignore" },
);
const cleanup = () => {
  spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  try {
    rmSync(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch {}
};
process.on("exit", cleanup);
for (let i = 0; i < 240; i++) {
  try {
    if (
      (
        await fetch(`http://127.0.0.1:${port}/.well-known/t3/environment`, {
          signal: AbortSignal.timeout(3000),
        })
      ).status === 200
    )
      break;
  } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
await new Promise((r) => setTimeout(r, 5000));
const token = spawnSync(
  process.execPath,
  [entry, "auth", "session", "issue", "--token-only", "--base-dir", home],
  { cwd: root, env, encoding: "utf8" },
).stdout.trim();
const r = spawnSync(
  process.execPath,
  [
    "apps/server/scripts/server-bench-ws.ts",
    "--origin",
    `http://127.0.0.1:${port}`,
    "--token",
    token,
    "--mode",
    "local",
    "--cwd",
    cwds[0],
    "--cwds",
    cwds.join(","),
  ],
  { cwd: root, encoding: "utf8", timeout: 240000 },
);
let local;
try {
  local = JSON.parse(r.stdout.trim().split(/\r?\n/).pop());
} catch {
  local = { error: (r.stderr || r.stdout).slice(-300) };
}
const raw = cwds.map((c) => {
  const t = performance.now();
  spawnSync("git", ["status", "--porcelain=v2", "--branch"], {
    cwd: c,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  return { cwd: c, ms: +(performance.now() - t).toFixed(1) };
});
const result = { label, at: new Date().toISOString(), local, raw };
appendFileSync(out, JSON.stringify(result) + "\n");
console.log(JSON.stringify(result));
process.exit(0);
