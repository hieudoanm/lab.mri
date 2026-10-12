"""User persistence: lookup and just-in-time provisioning."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg import AsyncConnection

from app.models.identity import User

_CONNECTION = AsyncConnection[dict[str, Any]]

_USER_COLUMNS = "id, email, display_name, created_at"


def _to_user(row: dict[str, Any]) -> User:
    return User(
        id=row["id"],
        email=row["email"],
        display_name=row["display_name"],
        created_at=row["created_at"],
    )


async def get_user(connection: _CONNECTION, user_id: UUID) -> User | None:
    """Return a user by primary key."""
    cursor = await connection.execute(
        f"SELECT {_USER_COLUMNS} FROM users WHERE id = %s",
        (user_id,),
    )
    row = await cursor.fetchone()
    return _to_user(row) if row is not None else None


async def get_user_by_email(connection: _CONNECTION, email: str) -> User | None:
    """Return a user by case-insensitive email address."""
    cursor = await connection.execute(
        f"SELECT {_USER_COLUMNS} FROM users WHERE lower(email) = lower(%s)",
        (email,),
    )
    row = await cursor.fetchone()
    return _to_user(row) if row is not None else None


async def upsert_user(
    connection: _CONNECTION,
    *,
    email: str,
    display_name: str | None = None,
) -> User:
    """Create a user for an email or refresh their profile fields.

    Profile fields are only overwritten when a value is supplied, so claims that
    omit a display name never erase stored data.
    """
    cursor = await connection.execute(
        f"""
        INSERT INTO users (email, display_name)
        VALUES (%s, %s)
        ON CONFLICT (lower(email)) DO UPDATE
            SET display_name = COALESCE(EXCLUDED.display_name, users.display_name)
        RETURNING {_USER_COLUMNS}
        """,
        (email, display_name),
    )
    row = await cursor.fetchone()
    assert row is not None
    return _to_user(row)
