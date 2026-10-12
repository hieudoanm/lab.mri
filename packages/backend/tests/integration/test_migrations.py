"""Integration tests for the SQL migration runner."""

from __future__ import annotations

import psycopg
import pytest
from app.db.migrations import downgrade, upgrade

pytestmark = pytest.mark.integration

EXPECTED_VERSIONS = {
    "0001_identity_and_projects",
    "0002_datasets_and_uploads",
    "0003_pipelines_and_runs",
}


def _applied_versions(database_url: str) -> set[str]:
    with psycopg.connect(database_url) as connection:
        rows = connection.execute("SELECT version FROM schema_migrations").fetchall()
    return {row[0] for row in rows}


def test_all_versions_are_applied(migrated_database: str) -> None:
    assert _applied_versions(migrated_database) == EXPECTED_VERSIONS


def test_upgrade_is_idempotent(migrated_database: str) -> None:
    assert upgrade(migrated_database) == []


def test_downgrade_then_upgrade_round_trips(migrated_database: str) -> None:
    reverted = downgrade(migrated_database)
    assert set(reverted) == EXPECTED_VERSIONS
    with psycopg.connect(migrated_database) as connection:
        row = connection.execute("SELECT to_regclass('public.users')").fetchone()
    assert row is not None and row[0] is None

    replayed = upgrade(migrated_database)
    assert set(replayed) == EXPECTED_VERSIONS
    assert _applied_versions(migrated_database) == EXPECTED_VERSIONS
