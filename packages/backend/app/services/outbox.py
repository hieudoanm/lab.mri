"""Outbox dispatch: publish pending events to the background broker."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.db.pool import Database
from app.repositories import outbox


class EventPublisher(Protocol):
    """Publish a claimed event to the background broker."""

    def publish(self, *, task_name: str, payload: dict[str, object]) -> None: ...


@dataclass(frozen=True, slots=True)
class DispatchReport:
    claimed: int = 0
    published: int = 0
    failed: int = 0
    batches: int = 0


async def dispatch_pending_events(
    database: Database,
    publisher: EventPublisher,
    *,
    batch_size: int = 100,
    max_batches: int = 20,
) -> DispatchReport:
    """Claim and publish pending outbox events in bounded batches.

    Claiming, publishing, and marking happen inside a single transaction so that
    ``FOR UPDATE SKIP LOCKED`` holds the row lock for the whole operation. If the
    broker is unavailable the transaction rolls back, the events remain pending,
    and the loop stops so a persistent outage does not spin.
    """
    claimed = published = failed = batches = 0
    for _ in range(max_batches):
        try:
            async with database.transaction() as connection:
                events = await outbox.claim_pending(connection, limit=batch_size)
                if not events:
                    return DispatchReport(
                        claimed=claimed, published=published, failed=failed, batches=batches
                    )
                batches += 1
                claimed += len(events)
                for event in events:
                    publisher.publish(task_name=event.event_type, payload=event.payload)
                    await outbox.mark_dispatched(connection, event_id=event.id)
                published += len(events)
        except Exception:
            failed += 1
            break
    return DispatchReport(claimed=claimed, published=published, failed=failed, batches=batches)
