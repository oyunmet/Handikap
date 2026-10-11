import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createDatabaseConnection } from "../db/postgres";

const migrationsPath = resolve("db/migrations");
const migrationFiles = (await readdir(migrationsPath))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const databaseConnection = createDatabaseConnection(process.env.DATABASE_URL, {
  max: 1,
});
const database = databaseConnection.pool;

if (!database) {
  console.error(databaseConnection.error);
  process.exitCode = 1;
} else {
  try {
    for (const file of migrationFiles) {
      const migrationSql = await readFile(resolve(migrationsPath, file), "utf8");
      await database.query(migrationSql);
      console.log(`Applied ${file}.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown migration error.";
    console.error(`Migration failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await database.end();
  }
}
