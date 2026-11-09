import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import test from "node:test";
import { createDebugToolsApi } from "./debugToolsApi.ts";

async function startDebugApi(t, enabled) {
  const app = express();
  app.use(createDebugToolsApi(enabled));
  const server = createServer(app);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );

  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}/api/debug-tools/status`;
}

test("debug final-scene gate is not discoverable when DEBUG_TOOLS is disabled", async (t) => {
  const endpoint = await startDebugApi(t, false);
  const response = await fetch(endpoint);

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { error: "not_found" });
});

test("debug final-scene gate only reports enabled when the server enables it", async (t) => {
  const endpoint = await startDebugApi(t, true);
  const response = await fetch(endpoint);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { enabled: true });
});
