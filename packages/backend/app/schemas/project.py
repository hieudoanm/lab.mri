"""Request and response models for projects and memberships."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.project import ProjectRole, ProjectVisibility
from app.schemas.common import RequestModel, UtcTimestamp


class ProjectCreateRequest(RequestModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2_000)
    visibility: ProjectVisibility = ProjectVisibility.PRIVATE

    @field_validator("name", "description", mode="before")
    @classmethod
    def _strip_optional(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class ProjectUpdateRequest(RequestModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2_000)
    visibility: ProjectVisibility | None = None

    @field_validator("name", "description", mode="before")
    @classmethod
    def _strip_optional(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class ProjectSummary(BaseModel):
    id: UUID
    name: str
    description: str | None
    visibility: ProjectVisibility
    role: ProjectRole
    archived: bool
    created_at: UtcTimestamp
    updated_at: UtcTimestamp


class ProjectDetailResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    description: str | None
    visibility: ProjectVisibility
    role: ProjectRole
    archived: bool
    created_at: UtcTimestamp
    updated_at: UtcTimestamp


class ProjectListResponse(BaseModel):
    items: list[ProjectSummary]
    next_cursor: str | None = None
    has_more: bool = False


class MembershipRead(BaseModel):
    user_id: UUID
    email: str
    display_name: str | None
    role: ProjectRole
    created_at: UtcTimestamp


class MembershipListResponse(BaseModel):
    items: list[MembershipRead]


class MembershipCreateRequest(RequestModel):
    email: str = Field(min_length=1, max_length=320)
    role: ProjectRole
    display_name: str | None = Field(default=None, max_length=200)

    @field_validator("email", "display_name", mode="before")
    @classmethod
    def _strip_optional(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class MembershipRoleUpdateRequest(RequestModel):
    role: ProjectRole
