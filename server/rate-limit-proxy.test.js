import assert from "node:assert/strict";
import express from "express";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createDuelApi } from "./duelApi.ts";
import { createWorldRewardsApi } from "./worldRewardsApi.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("both server entrypoints trust one proxy before registering middleware", () => {
  for (const relativePath of ["server/index.ts", "api/[...path].ts"]) {
    const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
    const trustProxyIndex = source.indexOf('app.set("trust proxy", 1)');
    const middlewareIndex = source.indexOf("app.use(");

    assert.ok(trustProxyIndex >= 0, `${relativePath} must set trust proxy`);
    assert.ok(
      middlewareIndex < 0 || trustProxyIndex < middlewareIndex,
      `${relativePath} must set trust proxy before registering middleware`,
    );
  }
});

test("duel start and pickup routes accept Vercel proxy headers without rate-limit validation errors", async (t) => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(createDuelApi({}));
  app.use(createWorldRewardsApi({}));

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const validationErrors = [];
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.map((value) => {
      if (value instanceof Error) {
        const code = "code" in value ? ` ${(value).code}` : "";
        return `${value.name}${code}: ${value.message}`;
      }
      return String(value);
    }).join(" ");
    if (message.includes("ERR_ERL_") || message.includes("express-rate-limit")) {
      validationErrors.push(message);
    }
  };

  let duelResponse;
  let pickupResponse;
  try {
    const proxyHeaders = {
      Forwarded: "for=203.0.113.7;proto=https;host=handikap.vercel.app",
      "X-Forwarded-For": "203.0.113.7",
    };
    duelResponse = await fetch(`http://127.0.0.1:${address.port}/api/duels/start`, {
      method: "POST",
      headers: { ...proxyHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ opponentId: "ash-sentinel" }),
    });
    pickupResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/profile/pickups?chapterId=0`,
      { headers: proxyHeaders },
    );
  } finally {
    console.error = originalError;
  }

  assert.equal(duelResponse.status, 401);
  assert.equal(pickupResponse.status, 401);
  assert.deepEqual(validationErrors, []);
});
