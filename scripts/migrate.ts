import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const migrationPath = resolve("db/migrations/001_shafak_player_profiles.sql");
const migrationSql = await readFile(migrationPath, "utf8");
const database = new Pool();

try {
  await database.query(migrationSql);
  console.log("Applied Shafak player profile schema.");
} finally {
  await database.end();
}
