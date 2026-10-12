"""Project and membership operations."""

from __future__ import annotations

from uuid import UUID

from app.core.exceptions import ConflictError, NotFoundError
from app.db.pool import Database
from app.models.identity import User
from app.models.project import (
    Project,
    ProjectMembership,
    ProjectMembershipView,
    ProjectRole,
    ProjectVisibility,
)
from app.repositories import audit, members, projects, users


async def create_project(
    database: Database,
    *,
    actor: User,
    name: str,
    description: str | None = None,
    visibility: ProjectVisibility = ProjectVisibility.PRIVATE,
) -> tuple[Project, ProjectMembership]:
    """Create a project and make the actor its owner."""
    async with database.transaction() as connection:
        project = await projects.create_project(
            connection,
            owner_id=actor.id,
            name=name,
            description=description,
            visibility=visibility,
        )
        membership = await members.create_membership(
            connection,
            project_id=project.id,
            user_id=actor.id,
            role=ProjectRole.OWNER,
        )
        await audit.record_audit_event(
            connection,
            action="project.created",
            resource_type="project",
            actor_id=actor.id,
            resource_id=project.id,
        )
        await audit.record_audit_event(
            connection,
            action="membership.created",
            resource_type="membership",
            actor_id=actor.id,
            resource_id=project.id,
        )
    return project, membership


async def update_project(
    database: Database,
    *,
    actor: User,
    project_id: UUID,
    name: str | None = None,
    description: str | None = None,
    visibility: ProjectVisibility | None = None,
) -> Project:
    async with database.transaction() as connection:
        project = await projects.update_project(
            connection,
            project_id=project_id,
            name=name,
            description=description,
            visibility=visibility,
        )
        if project is None:
            raise NotFoundError("The requested project does not exist.")
        await audit.record_audit_event(
            connection,
            action="project.updated",
            resource_type="project",
            actor_id=actor.id,
            resource_id=project.id,
        )
    return project


async def set_project_archived(
    database: Database,
    *,
    actor: User,
    project_id: UUID,
    archived: bool,
) -> Project:
    async with database.transaction() as connection:
        project = await projects.set_archived(connection, project_id=project_id, archived=archived)
        if project is None:
            raise NotFoundError("The requested project does not exist.")
        await audit.record_audit_event(
            connection,
            action="project.archived" if archived else "project.restored",
            resource_type="project",
            actor_id=actor.id,
            resource_id=project.id,
        )
    return project


async def list_members(database: Database, *, project_id: UUID) -> list[ProjectMembershipView]:
    async with database.connection() as connection:
        return await members.list_memberships(connection, project_id)


async def add_member(
    database: Database,
    *,
    actor: User,
    project_id: UUID,
    email: str,
    role: ProjectRole,
    display_name: str | None = None,
) -> ProjectMembershipView:
    """Add a member by email, provisioning their user record if necessary."""
    async with database.transaction() as connection:
        member = await users.upsert_user(connection, email=email, display_name=display_name)
        membership = await members.create_membership(
            connection,
            project_id=project_id,
            user_id=member.id,
            role=role,
        )
        await audit.record_audit_event(
            connection,
            action="membership.created",
            resource_type="membership",
            actor_id=actor.id,
            resource_id=project_id,
        )
    return ProjectMembershipView(
        membership=membership,
        email=member.email,
        display_name=member.display_name,
    )


async def change_member_role(
    database: Database,
    *,
    actor: User,
    project_id: UUID,
    member_user_id: UUID,
    role: ProjectRole,
) -> ProjectMembershipView:
    """Change a member's role, preserving at least one owner."""
    async with database.transaction() as connection:
        await members.lock_memberships(connection, project_id)
        current = await members.get_membership(
            connection, project_id=project_id, user_id=member_user_id
        )
        if current is None:
            raise NotFoundError("The requested membership does not exist.")
        if current.role is ProjectRole.OWNER and role is not ProjectRole.OWNER:
            owners = await members.count_owners(connection, project_id)
            if owners <= 1:
                raise ConflictError(
                    "A project must always have at least one owner.",
                    code="last_owner",
                )
        updated = await members.update_membership_role(
            connection, project_id=project_id, user_id=member_user_id, role=role
        )
        assert updated is not None
        member = await users.get_user(connection, member_user_id)
        assert member is not None
        await audit.record_audit_event(
            connection,
            action="membership.updated",
            resource_type="membership",
            actor_id=actor.id,
            resource_id=project_id,
        )
    return ProjectMembershipView(
        membership=updated,
        email=member.email,
        display_name=member.display_name,
    )


async def remove_member(
    database: Database,
    *,
    actor: User,
    project_id: UUID,
    member_user_id: UUID,
) -> None:
    """Remove a member, preserving at least one owner."""
    async with database.transaction() as connection:
        await members.lock_memberships(connection, project_id)
        current = await members.get_membership(
            connection, project_id=project_id, user_id=member_user_id
        )
        if current is None:
            raise NotFoundError("The requested membership does not exist.")
        if current.role is ProjectRole.OWNER:
            owners = await members.count_owners(connection, project_id)
            if owners <= 1:
                raise ConflictError(
                    "A project must always have at least one owner.",
                    code="last_owner",
                )
        await members.delete_membership(connection, project_id=project_id, user_id=member_user_id)
        await audit.record_audit_event(
            connection,
            action="membership.removed",
            resource_type="membership",
            actor_id=actor.id,
            resource_id=project_id,
        )
