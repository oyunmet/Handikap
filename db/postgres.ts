import { Pool } from "pg";

export type DatabaseConnectionState = "configured" | "not_configured" | "invalid";

export type DatabaseConnection =
  | { pool: Pool; state: "configured"; error: null }
  | { pool: null; state: "not_configured" | "invalid"; error: string };

export type DatabaseHealth =
  | { status: "ok"; database: "connected" }
  | {
      status: "error";
      database: "not_configured" | "invalid" | "unavailable";
      error: string;
    };

type PoolOptions = { max?: number };

const MISSING_URL_ERROR =
  "DATABASE_URL ayarlanmamış. Supabase PostgreSQL bağlantı adresini ekleyin.";
const INVALID_URL_ERROR =
  "DATABASE_URL geçersiz. Geçerli bir postgresql:// veya postgres:// adresi kullanın.";
const CONNECTION_ERROR =
  "Veritabanı bağlantısı kurulamadı. Supabase DATABASE_URL ve pooler ayarlarını kontrol edin.";

export function normalizeDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname
    ) {
      throw new Error("Unsupported database URL.");
    }

    const isSupabase =
      url.hostname.endsWith(".supabase.co") ||
      url.hostname.endsWith(".pooler.supabase.com");

    if (isSupabase) {
      // Supabase requires SSL. Preserve libpq's `require` behavior so pg
      // encrypts the connection without requiring a separately installed CA.
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
        : 10;

    // Supabase transaction pooling only rejects named prepared statements.
    // node-postgres uses them only when a query config includes `name`;
    // this project does not name its queries.
    const pool = new Pool({
      connectionString: normalizedUrl,
      max,
      connectionTimeoutMillis: 5_000,
      query_timeout: 10_000,
    });

    return { pool, state: "configured", error: null };
  } catch {
    return { pool: null, state: "invalid", error: INVALID_URL_ERROR };
  }
}

export async function checkDatabaseHealth(
  connection: DatabaseConnection,
): Promise<DatabaseHealth> {
  if (!connection.pool) {
    return {
      status: "error",
      database: connection.state,
      error: connection.error,
    };
  }

  try {
    await connection.pool.query("SELECT 1");
    return { status: "ok", database: "connected" };
  } catch {
    return {
      status: "error",
      database: "unavailable",
      error: CONNECTION_ERROR,
    };
  }
}
