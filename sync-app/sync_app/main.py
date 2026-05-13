from __future__ import annotations

import argparse
import asyncio

from .config import get_settings
from .database import SyncDatabase
from .sync_service import TractiveSyncService
from .tractive_client import TractiveModuleClient


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync tracker data from Tractive into the backend PostgreSQL database."
    )
    parser.add_argument(
        "--tracker-id",
        action="append",
        dest="tracker_ids",
        help="Tracker id to sync. Repeat the option for multiple trackers.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Retrieve data from Tractive but do not write to the database.",
    )
    return parser.parse_args()


def _normalize_tracker_ids(raw_tracker_ids: list[str] | None) -> list[str]:
    if not raw_tracker_ids:
        return []
    return [item.strip() for item in raw_tracker_ids if item and item.strip()]


async def _run() -> int:
    args = _parse_args()
    settings = get_settings()
    tracker_ids = _normalize_tracker_ids(args.tracker_ids) or settings.tracker_ids
    dry_run = bool(args.dry_run or settings.dry_run)

    database = SyncDatabase(settings.database_url)
    client = TractiveModuleClient(
        login=settings.tractive_email,
        password=settings.tractive_password,
        client_id=settings.tractive_client_id,
        timeout=settings.request_timeout_seconds,
    )

    try:
        sync_service = TractiveSyncService(client=client, database=database)
        results = await sync_service.run(tracker_ids=tracker_ids, dry_run=dry_run)
    finally:
        await client.close()
        database.close()

    failures = [result for result in results if not result.success]
    for result in results:
        status = "OK" if result.success else "FAIL"
        print(f"[{status}] {result.tracker_id}: {result.message}")

    return 1 if failures else 0


def main() -> int:
    return asyncio.run(_run())


if __name__ == "__main__":
    raise SystemExit(main())
