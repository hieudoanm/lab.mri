"""Identity operations: just-in-time user provisioning."""

from __future__ import annotations

from app.db.pool import Database
from app.models.identity import User
from app.models.project import ProjectRole
from app.repositories import audit, projects, users


async def provision_user(
    database: Database,
    *,
    email: str,
    display_name: str | None = None,
) -> User:
    """Create or refresh the local user record for an authenticated subject."""
    async with database.transaction() as connection:
        return await users.upsert_user(connection, email=email, display_name=display_name)


async def ensure_development_project(
    database: Database,
    *,
    user: User,
    name: str,
) -> None:
    """Give a development user an owned project when they have none.

    Development sign-in is the only caller. It seeds a personal project so the
    workspace is usable locally without an administrative provisioning step. The
    operation is idempotent: a user who already belongs to any project is left
    untouched.
    """
    async with database.transaction() as connection:
        existing = await projects.list_projects_for_user(connection, user_id=user.id, limit=1)
        if existing:
            return
        project = await projects.create_project(connection, owner_id=user.id, name=name)
        await connection.execute(
            """
            INSERT INTO project_members (project_id, user_id, role)
            VALUES (%s, %s, %s)
            """,
            (project.id, user.id, ProjectRole.OWNER.value),
        )
        await audit.record_audit_event(
            connection,
            action="project.created",
            resource_type="project",
            actor_id=user.id,
            resource_id=project.id,
        )
