from __future__ import annotations

from dataclasses import dataclass

from .database import SyncDatabase
from .tractive_client import TractiveModuleClient


@dataclass
class SyncResult:
    tracker_id: str
    success: bool
    message: str


class TractiveSyncService:
    def __init__(self, client: TractiveModuleClient, database: SyncDatabase) -> None:
        self._client = client
        self._database = database

    async def run(self, tracker_ids: list[str], dry_run: bool) -> list[SyncResult]:
        await self._client.authenticate()
        resolved_tracker_ids = await self._client.resolve_tracker_ids(tracker_ids)

        if not resolved_tracker_ids:
            return [SyncResult(tracker_id="-", success=False, message="No trackers found")]

        results: list[SyncResult] = []

        for tracker_id in resolved_tracker_ids:
            try:
                snapshot = await self._client.fetch_tracker_snapshot(tracker_id)

                if dry_run:
                    results.append(
                        SyncResult(
                            tracker_id=tracker_id,
                            success=True,
                            message="Dry run completed; no database writes performed",
                        )
                    )
                    continue

                self._database.ensure_tracker(snapshot.tracker_id, snapshot.tracker_details)
                self._database.upsert_location_report(snapshot.tracker_id, snapshot.location_report)
                self._database.upsert_hardware_report(snapshot.tracker_id, snapshot.hardware_report)
                self._database.mark_synced(snapshot.tracker_id)
                self._database.commit()

                results.append(
                    SyncResult(
                        tracker_id=tracker_id,
                        success=True,
                        message="Synced tracker data into PostgreSQL",
                    )
                )
            except Exception as error:  # noqa: BLE001
                self._database.rollback()
                results.append(
                    SyncResult(
                        tracker_id=tracker_id,
                        success=False,
                        message=str(error),
                    )
                )

        return results
