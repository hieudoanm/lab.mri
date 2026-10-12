"""Security tests for project-scoped tenancy and role enforcement."""

from __future__ import annotations

from typing import Any
from uuid import UUID

import psycopg
import pytest
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.pool import Database
from app.models.identity import User
from app.models.project import ProjectContext, ProjectRole
from app.repositories import users
from app.services import tenancy
from tests.conftest import create_membership, create_project, create_user

pytestmark = pytest.mark.security

DbConnection = psycopg.Connection[dict[str, Any]]


async def _load_user(database: Database, user_id: UUID) -> User:
    async with database.connection() as connection:
        user = await users.get_user(connection, user_id)
    assert user is not None
    return user


async def test_non_member_cannot_load_project_context(db: DbConnection, database: Database) -> None:
    owner_id = create_user(db, email="owner@example.test")
    stranger_id = create_user(db, email="stranger@example.test")
    project_id = create_project(db, owner_id=owner_id, name="Private")
    create_membership(db, project_id=project_id, user_id=owner_id, role="owner")
    stranger = await _load_user(database, stranger_id)

    with pytest.raises(NotFoundError):
        await tenancy.load_project_context(database, user=stranger, project_id=project_id)


async def test_member_can_load_project_context(db: DbConnection, database: Database) -> None:
    owner_id = create_user(db, email="owner@example.test")
    project_id = create_project(db, owner_id=owner_id, name="Private")
    create_membership(db, project_id=project_id, user_id=owner_id, role="owner")
    owner = await _load_user(database, owner_id)

    context = await tenancy.load_project_context(database, user=owner, project_id=project_id)
    assert isinstance(context, ProjectContext)
    assert context.role is ProjectRole.OWNER


async def test_require_role_rejects_viewer(db: DbConnection, database: Database) -> None:
    owner_id = create_user(db, email="owner@example.test")
    viewer_id = create_user(db, email="viewer@example.test")
    project_id = create_project(db, owner_id=owner_id, name="Shared")
    create_membership(db, project_id=project_id, user_id=owner_id, role="owner")
    create_membership(db, project_id=project_id, user_id=viewer_id, role="viewer")
    viewer = await _load_user(database, viewer_id)

    context = await tenancy.load_project_context(database, user=viewer, project_id=project_id)
    with pytest.raises(ForbiddenError):
        tenancy.require_role(context, {ProjectRole.OWNER})
    tenancy.require_role(context, {ProjectRole.VIEWER, ProjectRole.OWNER})
