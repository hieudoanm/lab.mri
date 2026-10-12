"""Audit-event persistence.

Audit records are written inside the same transaction as the mutation they
describe, so an audited change and its audit trail commit or roll back together.
Audit events are append-only and never contain tokens, signed URLs, or voxel data.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg import AsyncConnection

_CONNECTION = AsyncConnection[dict[str, Any]]


async def record_audit_event(
    connection: _CONNECTION,
    *,
    action: str,
    resource_type: str,
    actor_id: UUID | None = None,
    resource_id: UUID | None = None,
) -> None:
    """Append an immutable audit event within the caller's transaction."""
    await connection.execute(
        """
        INSERT INTO audit_events (actor_id, action, resource_type, resource_id)
        VALUES (%s, %s, %s, %s)
        """,
        (actor_id, action, resource_type, resource_id),
    )
