import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import test from "node:test";
import { createDiagnosticsApi } from "./diagnosticsApi.ts";

test("anonymous crash logging accepts only a minimal event category", async (t) => {
  const app = express();
  app.use(express.json({ limit: "2kb" }));
  app.use(createDiagnosticsApi());
  const server = createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}/api/diagnostics/crash`;

  const accepted = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "window-error", message: "must not be echoed" }),
  });
  assert.equal(accepted.status, 202);
  assert.equal(accepted.headers.get("cache-control"), "no-store");
  assert.deepEqual(await accepted.json(), { accepted: true });

  const rejected = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "private-message" }),
  });
  assert.equal(rejected.status, 400);
  assert.deepEqual(await rejected.json(), { error: "invalid_diagnostic_kind" });
});
