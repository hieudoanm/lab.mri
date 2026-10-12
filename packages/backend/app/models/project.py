"""Project tenancy domain models.

A project is the tenancy boundary. Membership is the authorisation source of
truth: a user may only reach a project's resources through a ``project_members``
row, and the project identifier supplied by a client is never trusted on its own.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from app.models.identity import User


class ProjectRole(StrEnum):
    """Project membership roles."""

    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"

    @property
    def can_write(self) -> bool:
        """Whether the role may create or modify project resources."""
        return self in {ProjectRole.OWNER, ProjectRole.EDITOR}

    @property
    def can_manage_members(self) -> bool:
        """Whether the role may add, change, or remove members."""
        return self is ProjectRole.OWNER


class ProjectVisibility(StrEnum):
    """Who may discover and open a project."""

    PRIVATE = "private"
    SHARED = "shared"
    PUBLIC = "public"


@dataclass(frozen=True, slots=True)
class Project:
    """A top-level workspace owned by a user."""

    id: UUID
    owner_id: UUID
    name: str
    description: str | None
    visibility: ProjectVisibility
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None

    @property
    def is_archived(self) -> bool:
        return self.archived_at is not None


@dataclass(frozen=True, slots=True)
class ProjectMembership:
    """A user's role within a project."""

    project_id: UUID
    user_id: UUID
    role: ProjectRole
    created_at: datetime


@dataclass(frozen=True, slots=True)
class ProjectMembershipView:
    """A membership joined with the member's profile, for listing and responses."""

    membership: ProjectMembership
    email: str
    display_name: str | None


@dataclass(frozen=True, slots=True)
class ProjectContext:
    """A verified tenant context: the caller, project, and their membership."""

    user: User
    project: Project
    membership: ProjectMembership

    @property
    def role(self) -> ProjectRole:
        return self.membership.role
