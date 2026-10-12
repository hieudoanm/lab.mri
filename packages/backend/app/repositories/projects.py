"""Project persistence with membership-scoped reads."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg import AsyncConnection

from app.core.pagination import Cursor
from app.models.project import Project, ProjectRole, ProjectVisibility

_CONNECTION = AsyncConnection[dict[str, Any]]

_PROJECT_COLUMNS = (
    "id, owner_id, name, description, visibility, created_at, updated_at, archived_at"
)


def _to_project(row: dict[str, Any]) -> Project:
    return Project(
        id=row["id"],
        owner_id=row["owner_id"],
        name=row["name"],
        description=row["description"],
        visibility=ProjectVisibility(row["visibility"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        archived_at=row["archived_at"],
    )


async def get_project(connection: _CONNECTION, project_id: UUID) -> Project | None:
    """Return a project by primary key, regardless of membership."""
    cursor = await connection.execute(
        f"SELECT {_PROJECT_COLUMNS} FROM projects WHERE id = %s",
        (project_id,),
    )
    row = await cursor.fetchone()
    return _to_project(row) if row is not None else None


async def list_projects_for_user(
    connection: _CONNECTION,
    *,
    user_id: UUID,
    limit: int,
    cursor: Cursor | None = None,
) -> list[tuple[Project, ProjectRole]]:
    """List projects the user belongs to with their role, newest first.

    The list is always derived from the user's own membership rows; a
    client-supplied project identifier is never part of the predicate.
    """
    selected = ", ".join(f"p.{column}" for column in _PROJECT_COLUMNS.split(", "))
    if cursor is None:
        result = await connection.execute(
            f"""
            SELECT {selected}, m.role
            FROM projects AS p
            JOIN project_members AS m ON m.project_id = p.id
            WHERE m.user_id = %s AND p.archived_at IS NULL
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT %s
            """,
            (user_id, limit),
        )
    else:
        result = await connection.execute(
            f"""
            SELECT {selected}, m.role
            FROM projects AS p
            JOIN project_members AS m ON m.project_id = p.id
            WHERE m.user_id = %s AND p.archived_at IS NULL
              AND (p.created_at, p.id) < (%s, %s)
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT %s
            """,
            (user_id, cursor.created_at, cursor.id, limit),
        )
    return [(_to_project(row), ProjectRole(row["role"])) async for row in result]


async def create_project(
    connection: _CONNECTION,
    *,
    owner_id: UUID,
    name: str,
    description: str | None = None,
    visibility: ProjectVisibility = ProjectVisibility.PRIVATE,
) -> Project:
    cursor = await connection.execute(
        f"""
        INSERT INTO projects (owner_id, name, description, visibility)
        VALUES (%s, %s, %s, %s)
        RETURNING {_PROJECT_COLUMNS}
        """,
        (owner_id, name, description, visibility.value),
    )
    row = await cursor.fetchone()
    assert row is not None
    return _to_project(row)


async def update_project(
    connection: _CONNECTION,
    *,
    project_id: UUID,
    name: str | None = None,
    description: str | None = None,
    visibility: ProjectVisibility | None = None,
) -> Project | None:
    """Update mutable fields, leaving unaffected columns unchanged."""
    cursor = await connection.execute(
        f"""
        UPDATE projects
        SET name = COALESCE(%s, name),
            description = COALESCE(%s, description),
            visibility = COALESCE(%s, visibility),
            updated_at = now()
        WHERE id = %s
        RETURNING {_PROJECT_COLUMNS}
        """,
        (name, description, visibility.value if visibility is not None else None, project_id),
    )
    row = await cursor.fetchone()
    return _to_project(row) if row is not None else None


async def set_archived(
    connection: _CONNECTION,
    *,
    project_id: UUID,
    archived: bool,
) -> Project | None:
    cursor = await connection.execute(
        f"""
        UPDATE projects
        SET archived_at = CASE WHEN %s THEN now() ELSE NULL END,
            updated_at = now()
        WHERE id = %s
        RETURNING {_PROJECT_COLUMNS}
        """,
        (archived, project_id),
    )
    row = await cursor.fetchone()
    return _to_project(row) if row is not None else None
