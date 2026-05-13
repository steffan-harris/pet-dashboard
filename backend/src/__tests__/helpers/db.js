const { pool } = require("../../db");

async function setupTestDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pets (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      age_years INTEGER NOT NULL DEFAULT 0 CHECK (age_years >= 0),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function clearPets() {
  await pool.query("DELETE FROM pets");
}

async function closeDb() {
  await pool.end();
}

module.exports = { setupTestDb, clearPets, closeDb };
