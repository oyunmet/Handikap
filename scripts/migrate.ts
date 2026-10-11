import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createDatabaseConnection,
  safeDatabaseError,
  selectMigrationDatabaseUrl,
} from "../db/postgres";

const migrationsPath = resolve("db/migrations");
const migrationFiles = (await readdir(migrationsPath))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const migrationDatabaseUrl = selectMigrationDatabaseUrl();
const databaseConnection = createDatabaseConnection(migrationDatabaseUrl, {
  max: 1,
});
const database = databaseConnection.pool;

if (!database) {
  console.error(
    databaseConnection.state === "not_configured"
      ? "MIGRATION_DATABASE_URL veya DATABASE_URL ayarlanmamış. Supabase Session pooler ya da Direct bağlantısını kullanın."
      : databaseConnection.error,
  );
  process.exitCode = 1;
} else {
  try {
    for (const file of migrationFiles) {
      const migrationSql = await readFile(resolve(migrationsPath, file), "utf8");
      await database.query("BEGIN");
      try {
        await database.query(migrationSql);
        await database.query("COMMIT");
      } catch (error) {
        await database.query("ROLLBACK");
        throw error;
      }
      console.log(`Applied ${file}.`);
    }
  } catch (error) {
    const safeError = safeDatabaseError(error);
    console.error(
      `Migration failed: ${safeError.error}${safeError.code ? ` (code: ${safeError.code})` : ""}`,
    );
    process.exitCode = 1;
  } finally {
    await database.end();
  }
}
