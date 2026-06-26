from __future__ import annotations

from dataclasses import dataclass
import os

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    tractive_email: str
    tractive_password: str
    tractive_client_id: str
    tracker_ids: list[str]
    database_url: str
    request_timeout_seconds: int
    dry_run: bool
    location_history_hours: int


def _parse_tracker_ids(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def _parse_bool(raw_value: str | None, default_value: bool) -> bool:
    if raw_value is None:
        return default_value
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def get_settings() -> Settings:
    email = os.getenv("TRACTIVE_EMAIL", "").strip()
    password = os.getenv("TRACTIVE_PASSWORD", "").strip()
    client_id = os.getenv("TRACTIVE_CLIENT_ID", "625e533dc3c3b41c28a669f0").strip()
    tracker_ids = _parse_tracker_ids(os.getenv("TRACTIVE_TRACKER_IDS"))
    database_url = os.getenv(
        "DATABASE_URL",
        "postgres://postgres:postgres@localhost:5432/pet_dashboard",
    ).strip()
    timeout_seconds = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "20").strip())
    dry_run = _parse_bool(os.getenv("SYNC_DRY_RUN"), False)
    location_history_hours = int(os.getenv("LOCATION_HISTORY_HOURS", "48").strip())

    if not email:
        raise ValueError("TRACTIVE_EMAIL is required")
    if not password:
        raise ValueError("TRACTIVE_PASSWORD is required")

    return Settings(
        tractive_email=email,
        tractive_password=password,
        tractive_client_id=client_id,
        tracker_ids=tracker_ids,
        database_url=database_url,
        request_timeout_seconds=timeout_seconds,
        dry_run=dry_run,
        location_history_hours=location_history_hours,
    )
