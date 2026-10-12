"""Current-user identity endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user, get_database
from app.db.pool import Database
from app.models.identity import User
from app.schemas.identity import CurrentUserResponse, ProjectMembershipSummary
from app.services import tenancy

router = APIRouter(tags=["identity"])


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    summary="Describe the authenticated user",
    description=(
        "Returns the caller's profile and project memberships. Provider internals "
        "and access tokens are never included."
    ),
)
async def read_current_user(
    user: User = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> CurrentUserResponse:
    memberships = await tenancy.list_user_projects(database, user_id=user.id, limit=100)
    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        memberships=[
            ProjectMembershipSummary(
                project_id=project.id,
                project_name=project.name,
                role=role,
            )
            for project, role in memberships
        ],
    )
