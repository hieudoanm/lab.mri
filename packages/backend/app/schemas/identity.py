"""Request and response models for identity."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.project import ProjectRole
from app.schemas.common import RequestModel, UtcTimestamp


class DevelopmentTokenRequest(RequestModel):
    """Optional overrides for the development token identity."""

    email: str | None = Field(default=None, max_length=320)
    display_name: str | None = Field(default=None, max_length=200)

    @field_validator("email", "display_name", mode="before")
    @classmethod
    def _strip_optional(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_at: UtcTimestamp


class ProjectMembershipSummary(BaseModel):
    project_id: UUID
    project_name: str
    role: ProjectRole


class CurrentUserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str | None
    memberships: list[ProjectMembershipSummary]
