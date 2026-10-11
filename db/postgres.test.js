import assert from "node:assert/strict";
import test from "node:test";
import {
  checkDatabaseHealth,
  createDatabaseConnection,
  normalizeDatabaseUrl,
  safeDatabaseError,
  selectMigrationDatabaseUrl,
  REQUIRED_DATABASE_TABLES,
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
  assert.equal(parsed.searchParams.has("sslmode"), false);
  assert.equal(parsed.searchParams.has("uselibpqcompat"), false);
  assert.equal(parsed.searchParams.get("connect_timeout"), "5");
  assert.equal(parsed.searchParams.get("query_timeout"), "10000");
  assert.equal(parsed.searchParams.get("application_name"), "game");
  assert.equal(connection.pool.options.max, 1);
  assert.deepEqual(connection.pool.options.ssl, { rejectUnauthorized: false });
  assert.equal(connection.pool.options.idleTimeoutMillis, 10_000);
  const normalized = new URL(
    normalizeDatabaseUrl("postgresql://user:placeholder@aws-0-region.pooler.supabase.com:6543/postgres"),
  );
  assert.equal(normalized.searchParams.get("sslmode"), "require");
  assert.equal(normalized.searchParams.get("uselibpqcompat"), "true");
  await connection.pool.end();
});

test("migrations prefer the separate migration URL and fall back to the runtime URL", () => {
  assert.equal(
    selectMigrationDatabaseUrl({
      MIGRATION_DATABASE_URL: "postgresql://migration.example/db",
      DATABASE_URL: "postgresql://runtime.example/db",
    }),
    "postgresql://migration.example/db",
  );
  assert.equal(
    selectMigrationDatabaseUrl({
      MIGRATION_DATABASE_URL: "  ",
      DATABASE_URL: "postgresql://runtime.example/db",
    }),
    "postgresql://runtime.example/db",
  );
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
    db: "error",
    database: "not_configured",
    tables: {
      status: "unchecked",
      required: REQUIRED_DATABASE_TABLES,
      missing: [],
    },
    error: "DATABASE_URL ayarlanmamış. Supabase PostgreSQL bağlantı adresini ekleyin.",
  });
});

test("database health reports connection failures instead of throwing", async () => {
  const connection = {
    pool: { query: async () => { throw Object.assign(new Error("password and host leaked"), { code: "28P01" }); } },
    state: "configured",
    error: null,
  };

  const result = await checkDatabaseHealth(connection);
  assert.deepEqual(result, {
    status: "error",
    db: "error",
    database: "unavailable",
    tables: {
      status: "unchecked",
      required: REQUIRED_DATABASE_TABLES,
      missing: [],
    },
    error: "Veritabanı kimlik doğrulaması başarısız; Supabase kullanıcı ve parola ayarlarını kontrol edin.",
    code: "28P01",
  });
  assert.equal(JSON.stringify(result).includes("password and host leaked"), false);
});

test("database health reports a successful connection", async () => {
  let queryCount = 0;
  const connection = {
    pool: {
      query: async () => {
        queryCount += 1;
        return queryCount === 1
          ? { rows: [{ "?column?": 1 }] }
          : { rows: REQUIRED_DATABASE_TABLES.map((table_name) => ({ table_name })) };
      },
    },
    state: "configured",
    error: null,
  };
  assert.deepEqual(await checkDatabaseHealth(connection), {
    status: "ok",
    db: "ok",
    database: "connected",
    tables: {
      status: "ok",
      required: REQUIRED_DATABASE_TABLES,
      missing: [],
    },
  });
});

test("database health reports missing required tables", async () => {
  const connection = {
    pool: {
      query: async () => ({ rows: [{ table_name: "shafak_player_profiles" }] }),
    },
    state: "configured",
    error: null,
  };
  const result = await checkDatabaseHealth(connection);
  assert.equal(result.status, "error");
  assert.equal(result.db, "error");
  assert.equal(result.database, "schema_incomplete");
  assert.deepEqual(result.tables.missing, [
    "shafak_duels",
    "shafak_pickup_claims",
    "shafak_store_transactions",
  ]);
});

test("database error summaries never include raw connection details", () => {
  const result = safeDatabaseError(
    Object.assign(new Error("postgresql://user:secret@host/db"), { code: "ETIMEDOUT" }),
  );
  assert.equal(result.code, "ETIMEDOUT");
  assert.equal(result.error, "Veritabanı bağlantısı zaman aşımına uğradı; Supabase pooler ve ağ durumunu kontrol edin.");
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.equal(JSON.stringify(result).includes("host"), false);
});
