// @effect-diagnostics nodeBuiltinImport:off globalDate:off - Owns a real Chrome process and temporary HTTP fixture outside Effect.
import * as NodeFSP from "node:fs/promises";
import * as NodeHttp from "node:http";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { SHARED_BROWSER_PROFILE_ID } from "@t3tools/contracts";
import { expect, it } from "vite-plus/test";
import { ServerBrowserContexts } from "./ServerBrowserContexts.ts";

// Opt-in real-browser proof. Uses fresh temporary storage and never a user's browser profile.
it.skipIf(!process.env.T3_TEST_BROWSER_EXECUTABLE)(
  "shared website storage survives closing and restarting the browser",
  async () => {
    const root = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "shared-browser-proof-"));
    const server = NodeHttp.createServer((_request, response) =>
      response.end("<title>Storage proof</title>"),
    );
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("No test server port");
    const url = `http://127.0.0.1:${address.port}`;
    const options = {
      profilesDir: root,
      executable: async () => process.env.T3_TEST_BROWSER_EXECUTABLE!,
    };
    let pool = new ServerBrowserContexts(options);
    try {
      const first = await pool.contextFor(SHARED_BROWSER_PROFILE_ID);
      expect(await pool.contextFor(SHARED_BROWSER_PROFILE_ID)).toBe(first);
      await first.addCookies([
        {
          name: "test-login",
          value: "retained",
          url,
          expires: Math.floor(Date.now() / 1000) + 3600,
        },
      ]);
      const page = await first.newPage();
      await page.goto(url);
      await page.evaluate(() => localStorage.setItem("login-proof", "retained"));
      await pool.close();
      pool = new ServerBrowserContexts(options);
      const restarted = await pool.contextFor(SHARED_BROWSER_PROFILE_ID);
      expect(
        (await restarted.cookies(url)).find((cookie) => cookie.name === "test-login")?.value,
      ).toBe("retained");
      const after = await restarted.newPage();
      await after.goto(url);
      expect(await after.evaluate(() => localStorage.getItem("login-proof"))).toBe("retained");
      expect(await (await pool.contextFor("default", "isolated-agent")).cookies(url)).toEqual([]);
    } finally {
      await pool.close();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await NodeFSP.rm(root, { recursive: true, force: true });
    }
  },
  30_000,
);
