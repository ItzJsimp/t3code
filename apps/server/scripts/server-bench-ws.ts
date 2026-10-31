// @effect-diagnostics globalFetch:off globalConsole:off globalConsoleInEffect:off preferSchemaOverJson:off globalDateInEffect:off - Host-side bench client that prints raw JSON results for scripts/server-bench.mjs.
// WebSocket half of scripts/server-bench.mjs. Connects like the app does and either
// times git status (--mode status) or holds the same subscriptions open (--mode hold).
//   node apps/server/scripts/server-bench-ws.ts --origin http://127.0.0.1:PORT --token <bearer> --cwd <repo> --mode status --runs 9
//   node apps/server/scripts/server-bench-ws.ts ... --mode hold --seconds 75   (prints counts when done)
//   node apps/server/scripts/server-bench-ws.ts ... --mode local --cwds a,b,c   (first status snapshot per folder, remote checks off)
import { ORCHESTRATION_V2_WS_METHODS, WS_METHODS } from "@t3tools/contracts";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as RpcClient from "effect/rpc/RpcClient";
import * as RpcSerialization from "effect/rpc/RpcSerialization";
import * as Socket from "effect/socket/Socket";

import { makeWsRpcProtocolClient } from "../../../packages/client-runtime/src/rpc/protocol.ts";

const argv = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const origin = flag("--origin")!;
const token = flag("--token")!;
const cwd = flag("--cwd")!;
const mode = flag("--mode", "status");
const runs = Number(flag("--runs", "9"));
const seconds = Number(flag("--seconds", "60"));

const ticketResponse = await fetch(`${origin}/api/auth/websocket-ticket`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: "{}",
});
if (!ticketResponse.ok) throw new Error(`websocket ticket failed: HTTP ${ticketResponse.status}`);
const { ticket } = (await ticketResponse.json()) as { ticket: string };
const socketUrl = `${origin.replace("http", "ws")}/ws?wsTicket=${encodeURIComponent(ticket)}&orchestrationProtocol=2`;

const layerProtocol = Layer.effect(
  RpcClient.Protocol,
  RpcClient.makeProtocolSocket({ pingTimeout: "30 seconds" }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      Socket.layerWebSocket(socketUrl, { openTimeout: Duration.seconds(15) }).pipe(
        Layer.provide(
          Layer.succeed(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url)),
        ),
      ),
      RpcSerialization.layerJson,
    ),
  ),
);

const stat = (xs: ReadonlyArray<number>) => {
  const s = [...xs].sort((a, b) => a - b);
  return {
    min: +s[0]!.toFixed(1),
    p50: +s[Math.floor(s.length / 2)]!.toFixed(1),
    max: +s[s.length - 1]!.toFixed(1),
    n: s.length,
  };
};

const program = Effect.gen(function* () {
  const client = yield* makeWsRpcProtocolClient;
  if (mode === "hold") {
    // The app keeps the server config, the shell stream and git status subscribed. Count their events.
    const counts = { config: 0, shell: 0, vcs: 0 };
    const hold = (stream: Stream.Stream<unknown, unknown>, key: keyof typeof counts) =>
      stream.pipe(
        Stream.runForEach(() => Effect.sync(() => void counts[key]++)),
        Effect.ignore,
        Effect.forkScoped,
      );
    yield* hold(client[WS_METHODS.subscribeServerConfig]({}), "config");
    yield* hold(client[ORCHESTRATION_V2_WS_METHODS.subscribeShell]({}), "shell");
    yield* hold(client[WS_METHODS.subscribeVcsStatus]({ cwd }), "vcs");
    console.log(JSON.stringify({ event: "holding", at: Date.now() }));
    yield* Effect.sleep(Duration.seconds(seconds));
    console.log(JSON.stringify({ event: "done", counts }));
    return;
  }
  if (mode === "local") {
    // What the sidebar waits for: the first local status snapshot of a folder the server has not seen yet.
    const cwds = (flag("--cwds", cwd) ?? cwd).split(",");
    const perCwd: Array<{ cwd: string; ms: number }> = [];
    for (const target of cwds) {
      const t = performance.now();
      yield* client[WS_METHODS.subscribeVcsStatus]({ cwd: target, includeRemote: false }).pipe(
        Stream.take(1),
        Stream.runDrain,
      );
      perCwd.push({ cwd: target, ms: +(performance.now() - t).toFixed(1) });
    }
    console.log(JSON.stringify({ event: "local", perCwd }));
    return;
  }
  const times: number[] = [];
  let first = 0;
  let sample: unknown;
  for (let i = 0; i < runs + 1; i++) {
    const t = performance.now();
    sample = yield* client[WS_METHODS.vcsRefreshStatus]({ cwd });
    const ms = performance.now() - t;
    if (i === 0) first = ms;
    else times.push(ms);
  }
  const s = sample as { isRepo?: boolean; hasWorkingTreeChanges?: boolean; branch?: string | null };
  console.log(
    JSON.stringify({
      event: "status",
      cwd,
      coldMs: +first.toFixed(1),
      warm: stat(times),
      isRepo: s.isRepo,
      dirty: s.hasWorkingTreeChanges,
    }),
  );
});

await Effect.runPromise(Effect.scoped(program).pipe(Effect.provide(layerProtocol))).catch(
  (error) => {
    console.error(
      JSON.stringify({ event: "error", message: String(error?.message ?? error).slice(0, 400) }),
    );
    process.exit(1);
  },
);
process.exit(0);
