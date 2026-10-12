"""Project tenancy context resolution and role checks."""

from __future__ import annotations

from collections.abc import Collection
from uuid import UUID

from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.pagination import Cursor
from app.db.pool import Database
from app.models.identity import User
from app.models.project import Project, ProjectContext, ProjectRole
from app.repositories import members, projects


async def list_user_projects(
    database: Database,
    *,
    user_id: UUID,
    limit: int,
    cursor: Cursor | None = None,
) -> list[tuple[Project, ProjectRole]]:
    """Return projects the user belongs to, with their role.

    Derived only from the authenticated user's membership rows.
    """
    async with database.connection() as connection:
        return await projects.list_projects_for_user(
            connection, user_id=user_id, limit=limit, cursor=cursor
        )


async def load_project_context(
    database: Database,
    *,
    user: User,
    project_id: UUID,
) -> ProjectContext:
    """Resolve the caller's membership in a project.

    A missing project and a missing membership both raise ``NotFoundError`` so
    that the API never discloses the existence of another tenant's resource.
    """
    async with database.connection() as connection:
        project = await projects.get_project(connection, project_id)
        if project is None:
            raise NotFoundError("The requested project does not exist.")
        membership = await members.get_membership(
            connection, project_id=project_id, user_id=user.id
        )
    if membership is None:
        raise NotFoundError("The requested project does not exist.")
    return ProjectContext(user=user, project=project, membership=membership)


def require_role(context: ProjectContext, allowed: Collection[ProjectRole]) -> None:
    """Raise ``ForbiddenError`` unless the caller holds an allowed role."""
    if context.role not in allowed:
        raise ForbiddenError(
            "Your role in this project does not permit this action.",
            code="insufficient_role",
        )
