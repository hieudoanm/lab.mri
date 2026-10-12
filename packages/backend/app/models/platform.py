"""Platform domain models: the transactional outbox."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID


class OutboxStatus(StrEnum):
    PENDING = "pending"
    DISPATCHED = "dispatched"
    FAILED = "failed"


@dataclass(frozen=True, slots=True)
class OutboxEvent:
    """A durable, at-least-once publication of background work."""

    id: UUID
    event_type: str
    payload: dict[str, Any]
    status: OutboxStatus
    created_at: datetime
    dispatched_at: datetime | None
