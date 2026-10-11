import assert from "node:assert/strict";
import test from "node:test";
import {
  checkDatabaseHealth,
  createDatabaseConnection,
  normalizeDatabaseUrl,
} from "./postgres.ts";

test("a missing or invalid DATABASE_URL is reported without creating a pool", () => {
  const missing = createDatabaseConnection("");
  assert.equal(missing.pool, null);
  assert.equal(missing.state, "not_configured");
  assert.match(missing.error, /DATABASE_URL/);

  const invalid = createDatabaseConnection("not-a-postgres-url");
  assert.equal(invalid.pool, null);
  assert.equal(invalid.state, "invalid");
  assert.match(invalid.error, /postgres/);
});

test("Supabase URLs require SSL and use bounded connection timeouts", async () => {
  const connection = createDatabaseConnection(
    "postgresql://postgres.example:placeholder@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require&application_name=game",
    { max: 1 },
  );

  assert.equal(connection.state, "configured");
  assert.ok(connection.pool);
  const parsed = new URL(connection.pool.options.connectionString);
  assert.equal(parsed.searchParams.get("sslmode"), "require");
  assert.equal(parsed.searchParams.get("uselibpqcompat"), "true");
  assert.equal(parsed.searchParams.get("connect_timeout"), "5");
  assert.equal(parsed.searchParams.get("query_timeout"), "10000");
  assert.equal(parsed.searchParams.get("application_name"), "game");
  assert.equal(connection.pool.options.max, 1);
  await connection.pool.end();
});

test("non-Supabase database URLs keep their SSL mode", () => {
  const normalized = new URL(
    normalizeDatabaseUrl("postgresql://user:placeholder@db.example.com/postgres?sslmode=require"),
  );
  assert.equal(normalized.searchParams.get("sslmode"), "require");
});

test("database health gives a clear error when no database is configured", async () => {
  const result = await checkDatabaseHealth(createDatabaseConnection(""));
  assert.deepEqual(result, {
    status: "error",
    database: "not_configured",
    error: "DATABASE_URL ayarlanmamış. Supabase PostgreSQL bağlantı adresini ekleyin.",
  });
});

test("database health reports connection failures instead of throwing", async () => {
  const connection = {
    pool: { query: async () => { throw new Error("private connection detail"); } },
    state: "configured",
    error: null,
  };

  const result = await checkDatabaseHealth(connection);
  assert.deepEqual(result, {
    status: "error",
    database: "unavailable",
    error: "Veritabanı bağlantısı kurulamadı. Supabase DATABASE_URL ve pooler ayarlarını kontrol edin.",
  });
});

test("database health reports a successful connection", async () => {
  const connection = {
    pool: { query: async () => ({ rows: [{ "?column?": 1 }] }) },
    state: "configured",
    error: null,
  };
  assert.deepEqual(await checkDatabaseHealth(connection), {
    status: "ok",
    database: "connected",
  });
});
