"""Shared pytest fixtures.

The suite runs against a real PostgreSQL database. ``TEST_DATABASE_URL`` must
point at an isolated test database; the migration fixture recreates the schema
before the session so tests never depend on leftover state.
"""

from __future__ import annotations

import os
import tempfile
from collections.abc import AsyncIterator, Iterator
from typing import Any, cast
from uuid import UUID

import psycopg
import pytest
from httpx import ASGITransport, AsyncClient

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://mri-lab:mri-lab@localhost:5432/mri-lab_test",
)
TEST_STORAGE_DIR = tempfile.mkdtemp(prefix="mri-lab-test-uploads-")

# Force migrations and settings to use the test database.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ.setdefault("APP_ENV", "test")

TRUNCATE_TABLES = (
    "usage_records",
    "annotations",
    "artifacts",
    "experiment_runs",
    "pipeline_versions",
    "pipelines",
    "upload_sessions",
    "file_assets",
    "dataset_versions",
    "datasets",
    "outbox_events",
    "idempotency_keys",
    "audit_events",
    "project_members",
    "projects",
    "users",
)

from app.core.config import Settings, clear_settings_cache  # noqa: E402
from app.db.pool import Database  # noqa: E402
from app.main import create_app  # noqa: E402


def make_settings(**overrides: object) -> Settings:
    """Build test settings without reading the developer's environment."""
    values: dict[str, object] = {
        "app_env": "test",
        "app_name": "mri-lab-api",
        "app_version": "0.1.0",
        "log_level": "WARNING",
        "log_format": "console",
        "database_url": TEST_DATABASE_URL,
        "database_pool_min_size": 1,
        "database_pool_max_size": 4,
        "auth_mode": "development",
        "local_storage_path": TEST_STORAGE_DIR,
    }
    values.update(overrides)
    return Settings(**values)  # type: ignore[arg-type]


@pytest.fixture(scope="session")
def migrated_database() -> Iterator[str]:
    """Recreate the test schema from migrations once per session."""
    clear_settings_cache()
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    with psycopg.connect(TEST_DATABASE_URL, autocommit=True) as connection:
        connection.execute("DROP SCHEMA IF EXISTS public CASCADE")
        connection.execute("CREATE SCHEMA public")
    from app.db.migrations import upgrade

    upgrade(TEST_DATABASE_URL)
    yield TEST_DATABASE_URL
    clear_settings_cache()


@pytest.fixture
def migrated_schema(migrated_database: str) -> Iterator[str]:
    """Provide a migrated database with all rows removed before each test."""
    _truncate()
    yield migrated_database


def _truncate() -> None:
    with psycopg.connect(TEST_DATABASE_URL, autocommit=True) as connection:
        connection.execute(f"TRUNCATE {', '.join(TRUNCATE_TABLES)} RESTART IDENTITY CASCADE")


@pytest.fixture
def db(migrated_schema: str) -> Iterator[psycopg.Connection[dict[str, Any]]]:
    """Yield a dict-row connection with autocommit for constraint tests."""
    from psycopg.rows import dict_row

    with psycopg.connect(TEST_DATABASE_URL, autocommit=True, row_factory=dict_row) as connection:
        yield connection


@pytest.fixture
async def database(migrated_schema: str) -> AsyncIterator[Database]:
    """A connected pool bound to the test database."""
    instance = Database(make_settings())
    await instance.connect()
    try:
        yield instance
    finally:
        await instance.close()


@pytest.fixture
async def client(migrated_schema: str) -> AsyncIterator[AsyncClient]:
    """An HTTPX client bound to the application with lifespan managed."""
    app = create_app(make_settings())
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
            yield http_client


# ---------------------------------------------------------------------------
# Seed helpers (synchronous, use with the ``db`` fixture)
# ---------------------------------------------------------------------------


def create_user(
    connection: psycopg.Connection[dict[str, Any]],
    *,
    email: str,
    display_name: str | None = None,
) -> UUID:
    """Insert a user and return its identifier."""
    row = connection.execute(
        """
        INSERT INTO users (email, display_name)
        VALUES (%s, %s)
        RETURNING id
        """,
        (email, display_name),
    ).fetchone()
    assert row is not None
    return cast(UUID, row["id"])


def create_project(
    connection: psycopg.Connection[dict[str, Any]],
    *,
    owner_id: UUID,
    name: str,
    visibility: str = "private",
) -> UUID:
    """Insert a project and return its identifier."""
    row = connection.execute(
        """
        INSERT INTO projects (owner_id, name, visibility)
        VALUES (%s, %s, %s)
        RETURNING id
        """,
        (owner_id, name, visibility),
    ).fetchone()
    assert row is not None
    return cast(UUID, row["id"])


def create_membership(
    connection: psycopg.Connection[dict[str, Any]],
    *,
    project_id: UUID,
    user_id: UUID,
    role: str = "owner",
) -> None:
    """Insert a project membership."""
    connection.execute(
        """
        INSERT INTO project_members (project_id, user_id, role)
        VALUES (%s, %s, %s)
        """,
        (project_id, user_id, role),
    )


async def issue_token(
    client: AsyncClient,
    *,
    email: str = "demo@mri-lab.local",
    **extra: str,
) -> str:
    """Mint a development access token through the API and return it."""
    payload: dict[str, str] = {"email": email, **extra}
    response = await client.post("/api/v1/auth/token", json=payload)
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    assert isinstance(token, str)
    return token


def bearer(token: str) -> dict[str, str]:
    """Build an Authorization header for a bearer token."""
    return {"Authorization": f"Bearer {token}"}
