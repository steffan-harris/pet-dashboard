CREATE TABLE IF NOT EXISTS pets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  age_years INTEGER NOT NULL DEFAULT 0 CHECK (age_years >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);
