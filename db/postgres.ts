import { Pool } from "pg";

export type DatabaseConnectionState = "configured" | "not_configured" | "invalid";

export type DatabaseConnection =
  | { pool: Pool; state: "configured"; error: null }
  | { pool: null; state: "not_configured" | "invalid"; error: string };

export const REQUIRED_DATABASE_TABLES = [
  "shafak_player_profiles",
  "shafak_duels",
  "shafak_pickup_claims",
  "shafak_store_transactions",
] as const;

export function selectMigrationDatabaseUrl(
  env: {
    MIGRATION_DATABASE_URL?: string;
    DATABASE_URL?: string;
  } = process.env,
) {
  return env.MIGRATION_DATABASE_URL?.trim() || env.DATABASE_URL;
}

export type DatabaseHealth = {
  status: "ok" | "error";
  db: "ok" | "error";
  database:
    | "connected"
    | "not_configured"
    | "invalid"
    | "unavailable"
    | "schema_incomplete";
  tables: {
    status: "ok" | "missing" | "unavailable" | "unchecked";
    required: readonly string[];
    missing: string[];
  };
  error?: string;
  code?: string;
};

type PoolOptions = { max?: number };

const MISSING_URL_ERROR =
  "DATABASE_URL ayarlanmamış. Supabase PostgreSQL bağlantı adresini ekleyin.";
const INVALID_URL_ERROR =
  "DATABASE_URL geçersiz. Geçerli bir postgresql:// veya postgres:// adresi kullanın.";
const CONNECTION_ERROR =
  "Veritabanı bağlantısı kurulamadı. Supabase DATABASE_URL ve pooler ayarlarını kontrol edin.";

function supabaseUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return (
      hostname.endsWith(".supabase.co") ||
      hostname.endsWith(".pooler.supabase.com")
    );
  } catch {
    return false;
  }
}

function errorCodeFrom(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{3,12}$/.test(code)
    ? code
    : undefined;
}

export function safeDatabaseError(error: unknown) {
  const code = errorCodeFrom(error);
  const messages: Record<string, string> = {
    "28P01": "Veritabanı kimlik doğrulaması başarısız; Supabase kullanıcı ve parola ayarlarını kontrol edin.",
    "3D000": "Veritabanı adı bulunamadı; Supabase bağlantı ayarlarını kontrol edin.",
    "08001": CONNECTION_ERROR,
    "08006": CONNECTION_ERROR,
    ECONNREFUSED: CONNECTION_ERROR,
    ECONNRESET: CONNECTION_ERROR,
    ETIMEDOUT: "Veritabanı bağlantısı zaman aşımına uğradı; Supabase pooler ve ağ durumunu kontrol edin.",
    ENOTFOUND: "Veritabanı sunucu adı çözümlenemedi; bağlantı adresini kontrol edin.",
    EHOSTUNREACH: CONNECTION_ERROR,
    CERT_HAS_EXPIRED: "Veritabanı TLS sertifikasının süresi dolmuş.",
    SELF_SIGNED_CERT_IN_CHAIN: "Veritabanı TLS doğrulaması başarısız.",
  };

  return {
    error: code
      ? messages[code] ?? `Veritabanı işlemi başarısız oldu (kod: ${code}).`
      : CONNECTION_ERROR,
    ...(code ? { code } : {}),
  };
}

export function normalizeDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname
    ) {
      throw new Error("Unsupported database URL.");
    }

    if (supabaseUrl(value)) {
      // Supabase requires SSL. Preserve libpq's `require` behavior so pg
      // encrypts the connection. createDatabaseConnection also sets the SSL
      // object explicitly so the pooler does not depend on CA-chain settings.
      url.searchParams.set("sslmode", "require");
      url.searchParams.set("uselibpqcompat", "true");
    }

    // Bound health checks and requests if a pooler cannot establish a connection.
    url.searchParams.set("connect_timeout", "5");
    url.searchParams.set("query_timeout", "10000");
    return url.toString();
  } catch {
    throw new Error(INVALID_URL_ERROR);
  }
}

export function createDatabaseConnection(
  connectionString: string | undefined = process.env.DATABASE_URL,
  options: PoolOptions = {},
): DatabaseConnection {
  if (!connectionString?.trim()) {
    return { pool: null, state: "not_configured", error: MISSING_URL_ERROR };
  }

  try {
    const normalizedUrl = normalizeDatabaseUrl(connectionString.trim());
    const max =
      Number.isInteger(options.max) && (options.max ?? 0) > 0
        ? options.max!
        : 2;
    const isSupabase = supabaseUrl(normalizedUrl);
    const poolUrl = new URL(normalizedUrl);
    if (isSupabase) {
      // pg-connection-string SSL query parameters replace Pool's `ssl` object.
      // Keep SSL explicit and let pg use the TLS settings below.
      poolUrl.searchParams.delete("sslmode");
      poolUrl.searchParams.delete("uselibpqcompat");
    }

    // Supabase transaction pooling only rejects named prepared statements.
    // node-postgres uses them only when a query config includes `name`;
    // this project does not name its queries.
    const pool = new Pool({
      connectionString: poolUrl.toString(),
      max,
      connectionTimeoutMillis: 5_000,
      query_timeout: 10_000,
      idleTimeoutMillis: 10_000,
      ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
    });

    return { pool, state: "configured", error: null };
  } catch {
    return { pool: null, state: "invalid", error: INVALID_URL_ERROR };
  }
}

export async function checkDatabaseHealth(
  connection: DatabaseConnection,
): Promise<DatabaseHealth> {
  const requiredTables = REQUIRED_DATABASE_TABLES;
  const uncheckedTables = {
    status: "unchecked" as const,
    required: requiredTables,
    missing: [],
  };
  if (!connection.pool) {
    return {
      status: "error",
      db: "error",
      database: connection.state,
      tables: uncheckedTables,
      error: connection.error,
    };
  }

  try {
    await connection.pool.query("SELECT 1");
    const result = await connection.pool.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [[...requiredTables]],
    );
    const found = new Set(result.rows.map((row) => row.table_name));
    const missing = requiredTables.filter((table) => !found.has(table));
    if (missing.length) {
      return {
        status: "error",
        db: "error",
        database: "schema_incomplete",
        tables: { status: "missing", required: requiredTables, missing },
        error: `Gerekli veritabanı tabloları eksik: ${missing.join(", ")}.`,
      };
    }
    return {
      status: "ok",
      db: "ok",
      database: "connected",
      tables: { status: "ok", required: requiredTables, missing: [] },
    };
  } catch (error) {
    const safeError = safeDatabaseError(error);
    return {
      status: "error",
      db: "error",
      database: "unavailable",
      tables: uncheckedTables,
      ...safeError,
    };
  }
}
