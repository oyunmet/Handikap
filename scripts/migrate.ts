import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const migrationsPath = resolve("db/migrations");
const migrationFiles = (await readdir(migrationsPath))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const database = new Pool();

try {
  for (const file of migrationFiles) {
    const migrationSql = await readFile(resolve(migrationsPath, file), "utf8");
    await database.query(migrationSql);
    console.log(`Applied ${file}.`);
  }
} finally {
  await database.end();
}
