const fs = require("fs/promises");
const path = require("path");
const { pool } = require("../src/db");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query("SELECT filename FROM schema_migrations");
  return new Set(result.rows.map((row) => row.filename));
}

async function run() {
  const migrationsDir = path.join(__dirname, "..", "db", "migrations");
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  for (const filename of migrationFiles) {
    if (applied.has(filename)) {
      continue;
    }

    const filePath = path.join(migrationsDir, filename);
    const sql = await fs.readFile(filePath, "utf8");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [filename],
      );
      await client.query("COMMIT");
      console.log(`Applied migration: ${filename}`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`Failed migration: ${filename}`);
      throw error;
    } finally {
      client.release();
    }
  }

  console.log("Migrations complete");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
