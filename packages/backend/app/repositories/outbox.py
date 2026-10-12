"""Outbox-event persistence.

Claiming uses ``FOR UPDATE SKIP LOCKED`` so multiple dispatchers can run
concurrently without blocking one another. Consumers must be idempotent because
delivery is at-least-once.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg import AsyncConnection
from psycopg.types.json import Jsonb

from app.models.platform import OutboxEvent, OutboxStatus

_CONNECTION = AsyncConnection[dict[str, Any]]

_COLUMNS = "id, event_type, payload, status, created_at, dispatched_at"


def _to_event(row: dict[str, Any]) -> OutboxEvent:
    return OutboxEvent(
        id=row["id"],
        event_type=row["event_type"],
        payload=row["payload"],
        status=OutboxStatus(row["status"]),
        created_at=row["created_at"],
        dispatched_at=row["dispatched_at"],
    )


async def enqueue_event(
    connection: _CONNECTION,
    *,
    event_type: str,
    payload: dict[str, Any],
) -> OutboxEvent:
    """Append a pending outbox event within the caller's transaction."""
    cursor = await connection.execute(
        f"""
        INSERT INTO outbox_events (event_type, payload)
        VALUES (%s, %s)
        RETURNING {_COLUMNS}
        """,
        (event_type, Jsonb(payload)),
    )
    row = await cursor.fetchone()
    assert row is not None
    return _to_event(row)


async def claim_pending(connection: _CONNECTION, *, limit: int) -> list[OutboxEvent]:
    """Claim a batch of pending events, locking only those rows."""
    cursor = await connection.execute(
        f"""
        SELECT {_COLUMNS}
        FROM outbox_events
        WHERE status = 'pending'
        ORDER BY created_at ASC, id ASC
        LIMIT %s
        FOR UPDATE SKIP LOCKED
        """,
        (limit,),
    )
    return [_to_event(row) async for row in cursor]


async def mark_dispatched(connection: _CONNECTION, *, event_id: UUID) -> None:
    await connection.execute(
        """
        UPDATE outbox_events
        SET status = 'dispatched', dispatched_at = now()
        WHERE id = %s
        """,
        (event_id,),
    )


async def mark_failed(connection: _CONNECTION, *, event_id: UUID) -> None:
    await connection.execute(
        "UPDATE outbox_events SET status = 'failed' WHERE id = %s",
        (event_id,),
    )
