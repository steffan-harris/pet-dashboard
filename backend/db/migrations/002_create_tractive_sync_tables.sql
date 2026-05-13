CREATE TABLE IF NOT EXISTS tractive_trackers (
  id SERIAL PRIMARY KEY,
  tracker_id TEXT NOT NULL UNIQUE,
  pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tractive_location_reports (
  id SERIAL PRIMARY KEY,
  tracker_id TEXT NOT NULL REFERENCES tractive_trackers(tracker_id) ON DELETE CASCADE,
  report_id TEXT,
  payload JSONB NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  observed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id)
);

CREATE TABLE IF NOT EXISTS tractive_hardware_reports (
  id SERIAL PRIMARY KEY,
  tracker_id TEXT NOT NULL REFERENCES tractive_trackers(tracker_id) ON DELETE CASCADE,
  report_id TEXT,
  payload JSONB NOT NULL,
  battery_level INTEGER,
  observed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id)
);

CREATE INDEX IF NOT EXISTS idx_tractive_location_tracker_time
  ON tractive_location_reports(tracker_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_tractive_hardware_tracker_time
  ON tractive_hardware_reports(tracker_id, observed_at DESC);
