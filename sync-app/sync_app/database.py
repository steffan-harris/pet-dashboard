from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import psycopg
from psycopg.types.json import Jsonb


def _as_datetime(unix_timestamp: Any) -> datetime | None:
    if unix_timestamp is None:
        return None
    try:
        return datetime.fromtimestamp(float(unix_timestamp), tz=timezone.utc)
    except (TypeError, ValueError):
        return None


class SyncDatabase:
    def __init__(self, database_url: str) -> None:
        self._connection = psycopg.connect(database_url)

    def close(self) -> None:
        self._connection.close()

    def rollback(self) -> None:
        self._connection.rollback()

    def commit(self) -> None:
        self._connection.commit()

    def ensure_tracker(self, tracker_id: str, details_payload: dict[str, Any]) -> None:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO tractive_trackers (tracker_id, updated_at)
                VALUES (%s, NOW())
                ON CONFLICT (tracker_id)
                DO UPDATE SET updated_at = NOW()
                """,
                (tracker_id,),
            )

    def upsert_location_report(self, tracker_id: str, report: dict[str, Any]) -> None:
        lat = None
        lon = None
        latlong = report.get("latlong")
        if isinstance(latlong, list) and len(latlong) >= 2:
            lat = latlong[0]
            lon = latlong[1]

        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO tractive_location_reports (
                    tracker_id,
                    report_id,
                    payload,
                    latitude,
                    longitude,
                    speed,
                    altitude,
                    observed_at,
                    received_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (report_id)
                DO UPDATE SET
                    payload = EXCLUDED.payload,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    speed = EXCLUDED.speed,
                    altitude = EXCLUDED.altitude,
                    observed_at = EXCLUDED.observed_at,
                    received_at = EXCLUDED.received_at
                """,
                (
                    tracker_id,
                    report.get("report_id"),
                    Jsonb(report),
                    lat,
                    lon,
                    report.get("speed"),
                    report.get("altitude"),
                    _as_datetime(report.get("time")),
                    _as_datetime(report.get("time_rcvd")),
                ),
            )

    def upsert_hardware_report(self, tracker_id: str, report: dict[str, Any]) -> None:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO tractive_hardware_reports (
                    tracker_id,
                    report_id,
                    payload,
                    battery_level,
                    observed_at
                )
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (report_id)
                DO UPDATE SET
                    payload = EXCLUDED.payload,
                    battery_level = EXCLUDED.battery_level,
                    observed_at = EXCLUDED.observed_at
                """,
                (
                    tracker_id,
                    report.get("report_id"),
                    Jsonb(report),
                    report.get("battery_level"),
                    _as_datetime(report.get("time")),
                ),
            )

    def upsert_location_history(
        self, tracker_id: str, points: list[dict[str, Any]]
    ) -> None:
        rows = []
        for point in points:
            observed_at = _as_datetime(point.get("time"))
            if observed_at is None:
                continue

            lat = None
            lon = None
            latlong = point.get("latlong")
            if isinstance(latlong, list) and len(latlong) >= 2:
                lat = latlong[0]
                lon = latlong[1]

            rows.append(
                (
                    tracker_id,
                    Jsonb(point),
                    lat,
                    lon,
                    point.get("alt"),
                    point.get("speed"),
                    point.get("course"),
                    point.get("pos_uncertainty"),
                    point.get("sensor_used"),
                    observed_at,
                )
            )

        if not rows:
            return

        with self._connection.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO tractive_location_history (
                    tracker_id,
                    payload,
                    latitude,
                    longitude,
                    altitude,
                    speed,
                    course,
                    pos_uncertainty,
                    sensor_used,
                    observed_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (tracker_id, observed_at)
                DO UPDATE SET
                    payload = EXCLUDED.payload,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    altitude = EXCLUDED.altitude,
                    speed = EXCLUDED.speed,
                    course = EXCLUDED.course,
                    pos_uncertainty = EXCLUDED.pos_uncertainty,
                    sensor_used = EXCLUDED.sensor_used
                """,
                rows,
            )

    def mark_synced(self, tracker_id: str) -> None:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE tractive_trackers
                SET last_synced_at = NOW(),
                    updated_at = NOW()
                WHERE tracker_id = %s
                """,
                (tracker_id,),
            )
