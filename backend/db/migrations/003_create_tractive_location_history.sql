CREATE TABLE IF NOT EXISTS tractive_location_history (
  id SERIAL PRIMARY KEY,
  tracker_id TEXT NOT NULL REFERENCES tractive_trackers(tracker_id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  course DOUBLE PRECISION,
  pos_uncertainty DOUBLE PRECISION,
  sensor_used TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tracker_id, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_tractive_location_history_tracker_time
  ON tractive_location_history(tracker_id, observed_at DESC);
