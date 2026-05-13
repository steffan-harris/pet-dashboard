from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from aiotractive import Tractive


@dataclass
class TrackerSnapshot:
    tracker_id: str
    tracker_details: dict[str, Any]
    location_report: dict[str, Any]
    hardware_report: dict[str, Any]


class TractiveModuleClient:
    def __init__(self, login: str, password: str, client_id: str, timeout: int) -> None:
        self._tractive = Tractive(
            login=login,
            password=password,
            client_id=client_id,
            timeout=timeout,
        )

    async def close(self) -> None:
        await self._tractive.close()

    async def authenticate(self) -> None:
        credentials = await self._tractive.authenticate()
        if not credentials:
            raise RuntimeError("Failed to authenticate against Tractive API")

    async def resolve_tracker_ids(self, explicit_tracker_ids: list[str]) -> list[str]:
        if explicit_tracker_ids:
            return explicit_tracker_ids

        trackers = await self._tractive.trackers()
        resolved_ids: list[str] = []
        for tracker in trackers:
            details = await tracker.details()
            tracker_id = details.get("_id")
            if isinstance(tracker_id, str) and tracker_id:
                resolved_ids.append(tracker_id)
        return resolved_ids

    async def fetch_tracker_snapshot(self, tracker_id: str) -> TrackerSnapshot:
        tracker = self._tractive.tracker(tracker_id)
        details = await tracker.details()
        location = await tracker.pos_report()
        hardware = await tracker.hw_info()

        return TrackerSnapshot(
            tracker_id=tracker_id,
            tracker_details=details,
            location_report=location,
            hardware_report=hardware,
        )
