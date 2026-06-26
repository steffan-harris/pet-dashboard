import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import LocationMap from "./LocationMap";

type Summary = {
  petCount: number;
  trackerCount: number;
  locationReportCount: number;
  hardwareReportCount: number;
  latestSyncAt: string | null;
  averageBatteryLevel: number | null;
};

type TrackerRow = {
  trackerId: string;
  lastSyncedAt: string | null;
  petId: number | null;
  petName: string | null;
  petSpecies: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  altitude: number | null;
  locationObservedAt: string | null;
  batteryLevel: number | null;
  hardwareObservedAt: string | null;
};

const fmtInteger = new Intl.NumberFormat("en-US");

function formatDate(value: string | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function formatCoord(lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) return "N/A";
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function batteryTone(level: number | null): "good" | "warn" | "low" | "na" {
  if (level === null) return "na";
  if (level >= 60) return "good";
  if (level >= 25) return "warn";
  return "low";
}

function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trackers, setTrackers] = useState<TrackerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryResponse, trackerResponse] = await Promise.all([
        fetch("/api/dashboard/summary"),
        fetch("/api/dashboard/trackers"),
      ]);

      if (!summaryResponse.ok || !trackerResponse.ok) {
        throw new Error("Dashboard API request failed");
      }

      const summaryPayload = (await summaryResponse.json()) as Summary;
      const trackerPayload = (await trackerResponse.json()) as TrackerRow[];

      setSummary(summaryPayload);
      setTrackers(trackerPayload);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unknown dashboard error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadDashboard();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [loadDashboard]);

  const freshestTracker = useMemo(
    () =>
      trackers.find((tracker) => tracker.lastSyncedAt) ??
      (trackers.length > 0 ? trackers[0] : null),
    [trackers],
  );

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar">
        <div>
          <p className="eyebrow">Pet Operations Console</p>
          <h1>Telemetry Dashboard</h1>
          <p className="subhead">
            Live view of pets, trackers, and incoming Tractive sync activity.
          </p>
        </div>
        <button
          type="button"
          className="refresh"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </header>

      {error ? (
        <div className="error-banner">Failed to load dashboard: {error}</div>
      ) : null}

      <section className="kpi-grid">
        <article className="kpi-card">
          <h2>Pets</h2>
          <p>{summary ? fmtInteger.format(summary.petCount) : "-"}</p>
        </article>
        <article className="kpi-card">
          <h2>Trackers</h2>
          <p>{summary ? fmtInteger.format(summary.trackerCount) : "-"}</p>
        </article>
        <article className="kpi-card">
          <h2>Location Reports</h2>
          <p>
            {summary ? fmtInteger.format(summary.locationReportCount) : "-"}
          </p>
        </article>
        <article className="kpi-card">
          <h2>Hardware Reports</h2>
          <p>
            {summary ? fmtInteger.format(summary.hardwareReportCount) : "-"}
          </p>
        </article>
        <article className="kpi-card">
          <h2>Average Battery</h2>
          <p>
            {summary && summary.averageBatteryLevel !== null
              ? `${summary.averageBatteryLevel}%`
              : "N/A"}
          </p>
        </article>
        <article className="kpi-card">
          <h2>Last Sync</h2>
          <p className="small-value">
            {summary ? formatDate(summary.latestSyncAt) : "-"}
          </p>
        </article>
      </section>

      {freshestTracker ? (
        <section className="panel map-panel">
          <h2>Last 48 Hours</h2>
          <LocationMap trackerId={freshestTracker.trackerId} hours={48} />
        </section>
      ) : null}

      <section className="split-layout">
        <article className="panel">
          <h2>Latest Tracker Snapshot</h2>
          {freshestTracker ? (
            <dl className="snapshot-list">
              <div>
                <dt>Tracker</dt>
                <dd>{freshestTracker.trackerId}</dd>
              </div>
              <div>
                <dt>Pet</dt>
                <dd>
                  {freshestTracker.petName
                    ? `${freshestTracker.petName} (${freshestTracker.petSpecies ?? "unknown"})`
                    : "Unassigned"}
                </dd>
              </div>
              <div>
                <dt>Battery</dt>
                <dd
                  className={`battery ${batteryTone(freshestTracker.batteryLevel)}`}
                >
                  {freshestTracker.batteryLevel !== null
                    ? `${freshestTracker.batteryLevel}%`
                    : "N/A"}
                </dd>
              </div>
              <div>
                <dt>Coordinates</dt>
                <dd>
                  {formatCoord(
                    freshestTracker.latitude,
                    freshestTracker.longitude,
                  )}
                </dd>
              </div>
              <div>
                <dt>Speed</dt>
                <dd>
                  {freshestTracker.speed !== null
                    ? `${freshestTracker.speed.toFixed(2)} m/s`
                    : "N/A"}
                </dd>
              </div>
              <div>
                <dt>Synced At</dt>
                <dd>{formatDate(freshestTracker.lastSyncedAt)}</dd>
              </div>
            </dl>
          ) : (
            <p className="empty-state">No tracker records found yet.</p>
          )}
        </article>

        <article className="panel">
          <h2>Tracker Feed</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tracker</th>
                  <th>Pet</th>
                  <th>Battery</th>
                  <th>Location</th>
                  <th>Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {trackers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      No telemetry synced yet.
                    </td>
                  </tr>
                ) : (
                  trackers.map((row) => (
                    <tr key={row.trackerId}>
                      <td>{row.trackerId}</td>
                      <td>{row.petName ?? "Unassigned"}</td>
                      <td
                        className={`battery ${batteryTone(row.batteryLevel)}`}
                      >
                        {row.batteryLevel !== null
                          ? `${row.batteryLevel}%`
                          : "N/A"}
                      </td>
                      <td>{formatCoord(row.latitude, row.longitude)}</td>
                      <td>{formatDate(row.lastSyncedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <footer className="dashboard-footer">
        <p>
          Data source: Backend API endpoints <code>/api/dashboard/summary</code>{" "}
          and <code>/api/dashboard/trackers</code>
        </p>
      </footer>
    </div>
  );
}

export default App;
