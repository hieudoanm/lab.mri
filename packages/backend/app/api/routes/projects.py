"""Project and membership endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import (
    get_current_user,
    get_database,
    get_project_context,
    get_settings,
)
from app.core.config import Settings
from app.core.pagination import decode_cursor, encode_cursor
from app.db.pool import Database
from app.models.identity import User
from app.models.project import Project, ProjectContext, ProjectMembershipView, ProjectRole
from app.schemas.project import (
    MembershipCreateRequest,
    MembershipListResponse,
    MembershipRead,
    MembershipRoleUpdateRequest,
    ProjectCreateRequest,
    ProjectDetailResponse,
    ProjectListResponse,
    ProjectSummary,
    ProjectUpdateRequest,
)
from app.services import projects as projects_service
from app.services import tenancy

router = APIRouter(prefix="/projects", tags=["projects"])


def _summary(project: Project, role: ProjectRole) -> ProjectSummary:
    return ProjectSummary(
        id=project.id,
        name=project.name,
        description=project.description,
        visibility=project.visibility,
        role=role,
        archived=project.is_archived,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def _detail(project: Project, role: ProjectRole) -> ProjectDetailResponse:
    return ProjectDetailResponse(
        id=project.id,
        owner_id=project.owner_id,
        name=project.name,
        description=project.description,
        visibility=project.visibility,
        role=role,
        archived=project.is_archived,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def _membership_read(view: ProjectMembershipView) -> MembershipRead:
    membership = view.membership
    return MembershipRead(
        user_id=membership.user_id,
        email=view.email,
        display_name=view.display_name,
        role=membership.role,
        created_at=membership.created_at,
    )


@router.post(
    "",
    response_model=ProjectDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project and make the caller an owner",
)
async def create_project(
    payload: ProjectCreateRequest,
    user: User = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> ProjectDetailResponse:
    project, membership = await projects_service.create_project(
        database,
        actor=user,
        name=payload.name,
        description=payload.description,
        visibility=payload.visibility,
    )
    return _detail(project, membership.role)


@router.get(
    "",
    response_model=ProjectListResponse,
    summary="List projects accessible to the caller",
)
async def list_projects(
    page_size: int | None = Query(default=None, ge=1),
    cursor: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    database: Database = Depends(get_database),
    settings: Settings = Depends(get_settings),
) -> ProjectListResponse:
    limit = min(page_size or settings.default_page_size, settings.max_page_size)
    parsed = decode_cursor(cursor) if cursor else None
    rows = await tenancy.list_user_projects(
        database, user_id=user.id, limit=limit + 1, cursor=parsed
    )
    has_more = len(rows) > limit
    page = rows[:limit]
    next_cursor = (
        encode_cursor(created_at=page[-1][0].created_at, id=page[-1][0].id)
        if has_more and page
        else None
    )
    return ProjectListResponse(
        items=[_summary(project, role) for project, role in page],
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.get(
    "/{project_id}",
    response_model=ProjectDetailResponse,
    summary="Read a project the caller belongs to",
)
async def read_project(
    context: ProjectContext = Depends(get_project_context),
) -> ProjectDetailResponse:
    return _detail(context.project, context.role)


@router.patch(
    "/{project_id}",
    response_model=ProjectDetailResponse,
    summary="Update a project (editor or owner)",
)
async def update_project(
    payload: ProjectUpdateRequest,
    context: ProjectContext = Depends(get_project_context),
    database: Database = Depends(get_database),
) -> ProjectDetailResponse:
    tenancy.require_role(context, {ProjectRole.OWNER, ProjectRole.EDITOR})
    project = await projects_service.update_project(
        database,
        actor=context.user,
        project_id=context.project.id,
        name=payload.name,
        description=payload.description,
        visibility=payload.visibility,
    )
    return _detail(project, context.role)


@router.post(
    "/{project_id}/archive",
    response_model=ProjectDetailResponse,
    summary="Archive a project (owner only)",
)
async def archive_project(
    context: ProjectContext = Depends(get_project_context),
    database: Database = Depends(get_database),
) -> ProjectDetailResponse:
    tenancy.require_role(context, {ProjectRole.OWNER})
    project = await projects_service.set_project_archived(
        database, actor=context.user, project_id=context.project.id, archived=True
    )
    return _detail(project, context.role)


@router.post(
    "/{project_id}/restore",
    response_model=ProjectDetailResponse,
    summary="Restore an archived project (owner only)",
)
async def restore_project(
    context: ProjectContext = Depends(get_project_context),
    database: Database = Depends(get_database),
) -> ProjectDetailResponse:
    tenancy.require_role(context, {ProjectRole.OWNER})
    project = await projects_service.set_project_archived(
        database, actor=context.user, project_id=context.project.id, archived=False
    )
    return _detail(project, context.role)


@router.get(
    "/{project_id}/members",
    response_model=MembershipListResponse,
    summary="List project members",
)
async def list_members(
    context: ProjectContext = Depends(get_project_context),
    database: Database = Depends(get_database),
) -> MembershipListResponse:
    views = await projects_service.list_members(database, project_id=context.project.id)
    return MembershipListResponse(items=[_membership_read(view) for view in views])


@router.post(
    "/{project_id}/members",
    response_model=MembershipRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a project member (owner only)",
)
async def add_member(
    payload: MembershipCreateRequest,
    context: ProjectContext = Depends(get_project_context),
    database: Database = Depends(get_database),
) -> MembershipRead:
    tenancy.require_role(context, {ProjectRole.OWNER})
    view = await projects_service.add_member(
        database,
        actor=context.user,
        project_id=context.project.id,
        email=payload.email,
        role=payload.role,
        display_name=payload.display_name,
    )
    return _membership_read(view)


@router.patch(
    "/{project_id}/members/{user_id}",
    response_model=MembershipRead,
    summary="Change a member's role (owner only)",
)
async def change_member_role(
    user_id: UUID,
    payload: MembershipRoleUpdateRequest,
    context: ProjectContext = Depends(get_project_context),
    database: Database = Depends(get_database),
) -> MembershipRead:
    tenancy.require_role(context, {ProjectRole.OWNER})
    view = await projects_service.change_member_role(
        database,
        actor=context.user,
        project_id=context.project.id,
        member_user_id=user_id,
        role=payload.role,
    )
    return _membership_read(view)


@router.delete(
    "/{project_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a project member (owner only)",
)
async def remove_member(
    user_id: UUID,
    context: ProjectContext = Depends(get_project_context),
    database: Database = Depends(get_database),
) -> None:
    tenancy.require_role(context, {ProjectRole.OWNER})
    await projects_service.remove_member(
        database,
        actor=context.user,
        project_id=context.project.id,
        member_user_id=user_id,
    )
