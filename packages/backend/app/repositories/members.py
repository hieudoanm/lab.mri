"""Project membership persistence and project-scoped row locking."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg import AsyncConnection, errors

from app.core.exceptions import ConflictError
from app.models.project import ProjectMembership, ProjectMembershipView, ProjectRole

_CONNECTION = AsyncConnection[dict[str, Any]]

_MEMBERSHIP_COLUMNS = "project_id, user_id, role, created_at"


def _to_membership(row: dict[str, Any]) -> ProjectMembership:
    return ProjectMembership(
        project_id=row["project_id"],
        user_id=row["user_id"],
        role=ProjectRole(row["role"]),
        created_at=row["created_at"],
    )


async def lock_memberships(connection: _CONNECTION, project_id: UUID) -> None:
    """Lock every membership row in a project for the transaction.

    Membership mutations acquire this lock so that the last-owner invariant is
    evaluated against a stable set of rows under concurrent requests.
    """
    await connection.execute(
        "SELECT user_id FROM project_members WHERE project_id = %s FOR UPDATE",
        (project_id,),
    )


async def get_membership(
    connection: _CONNECTION,
    *,
    project_id: UUID,
    user_id: UUID,
) -> ProjectMembership | None:
    cursor = await connection.execute(
        f"""
        SELECT {_MEMBERSHIP_COLUMNS}
        FROM project_members
        WHERE project_id = %s AND user_id = %s
        """,
        (project_id, user_id),
    )
    row = await cursor.fetchone()
    return _to_membership(row) if row is not None else None


async def list_memberships(
    connection: _CONNECTION, project_id: UUID
) -> list[ProjectMembershipView]:
    """List memberships with member profile fields, ordered deterministically."""
    cursor = await connection.execute(
        """
        SELECT m.project_id, m.user_id, m.role, m.created_at,
               u.email AS user_email, u.display_name AS user_display_name
        FROM project_members AS m
        JOIN users AS u ON u.id = m.user_id
        WHERE m.project_id = %s
        ORDER BY m.created_at ASC, m.user_id ASC
        """,
        (project_id,),
    )
    views: list[ProjectMembershipView] = []
    async for row in cursor:
        views.append(
            ProjectMembershipView(
                membership=_to_membership(row),
                email=row["user_email"],
                display_name=row["user_display_name"],
            )
        )
    return views


async def count_owners(connection: _CONNECTION, project_id: UUID) -> int:
    """Count owners of a project."""
    cursor = await connection.execute(
        "SELECT count(*) AS total FROM project_members WHERE project_id = %s AND role = 'owner'",
        (project_id,),
    )
    row = await cursor.fetchone()
    return int(row["total"]) if row is not None else 0


async def create_membership(
    connection: _CONNECTION,
    *,
    project_id: UUID,
    user_id: UUID,
    role: ProjectRole,
) -> ProjectMembership:
    try:
        cursor = await connection.execute(
            f"""
            INSERT INTO project_members (project_id, user_id, role)
            VALUES (%s, %s, %s)
            RETURNING {_MEMBERSHIP_COLUMNS}
            """,
            (project_id, user_id, role.value),
        )
    except errors.UniqueViolation as exc:
        raise ConflictError(
            "The user is already a member of this project.",
            code="membership_exists",
        ) from exc
    row = await cursor.fetchone()
    assert row is not None
    return _to_membership(row)


async def update_membership_role(
    connection: _CONNECTION,
    *,
    project_id: UUID,
    user_id: UUID,
    role: ProjectRole,
) -> ProjectMembership | None:
    cursor = await connection.execute(
        f"""
        UPDATE project_members
        SET role = %s
        WHERE project_id = %s AND user_id = %s
        RETURNING {_MEMBERSHIP_COLUMNS}
        """,
        (role.value, project_id, user_id),
    )
    row = await cursor.fetchone()
    return _to_membership(row) if row is not None else None


async def delete_membership(
    connection: _CONNECTION,
    *,
    project_id: UUID,
    user_id: UUID,
) -> ProjectMembership | None:
    cursor = await connection.execute(
        f"""
        DELETE FROM project_members
        WHERE project_id = %s AND user_id = %s
        RETURNING {_MEMBERSHIP_COLUMNS}
        """,
        (project_id, user_id),
    )
    row = await cursor.fetchone()
    return _to_membership(row) if row is not None else None
