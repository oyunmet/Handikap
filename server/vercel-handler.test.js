import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import handler from "../api/[...path].ts";

function getModuleSpecifiers(source) {
  const specifiers = [];
  const staticImports =
    /^\s*(?:import|export)\s+(?:(?:type\s+)?[\s\S]*?\s+from\s*)?["']([^"']+)["']\s*;?/gm;
  const dynamicImports = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const match of source.matchAll(staticImports)) {
    specifiers.push(match[1]);
  }
  for (const match of source.matchAll(dynamicImports)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

test("Vercel API entrypoints use explicit TypeScript extensions throughout their import graph", () => {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const pending = [
    resolve(projectRoot, "api/[...path].ts"),
    resolve(projectRoot, "api/store/catalog.ts"),
  ];
  const visited = new Set();

  while (pending.length > 0) {
    const filePath = pending.pop();
    if (!filePath || visited.has(filePath)) continue;
    visited.add(filePath);

    const specifiers = getModuleSpecifiers(readFileSync(filePath, "utf8"));
    for (const specifier of specifiers.filter((value) => value.startsWith("."))) {
      assert.ok(
        specifier.endsWith(".ts"),
        `${filePath} imports ${specifier} without a native Node TypeScript extension`,
      );
      const importedPath = resolve(dirname(filePath), specifier);
      assert.ok(existsSync(importedPath), `${filePath} imports missing ${specifier}`);
      pending.push(importedPath);
    }
  }
});

test("Vercel API handler initializes lazily and returns health errors as JSON", async (t) => {
  process.env.DATABASE_URL = "";
  process.env.CLERK_SECRET_KEY = "";
  process.env.CLERK_PUBLISHABLE_KEY = "";

  const server = createServer((request, response) => {
    void handler(request, response);
  });

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
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/health`,
  );
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(body, {
    status: "error",
    database: "not_configured",
    error: "DATABASE_URL ayarlanmamış. Supabase PostgreSQL bağlantı adresini ekleyin.",
  });
});
