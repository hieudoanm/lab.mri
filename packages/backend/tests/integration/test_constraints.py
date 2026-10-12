"""Integration tests for database constraints."""

from __future__ import annotations

from typing import Any

import psycopg
import pytest
from tests.conftest import create_membership, create_project, create_user

pytestmark = pytest.mark.integration


def test_email_is_unique_case_insensitively(db: psycopg.Connection[dict[str, Any]]) -> None:
    create_user(db, email="Case@example.test")
    with pytest.raises(psycopg.errors.UniqueViolation):
        create_user(db, email="case@example.test")


def test_project_name_must_not_be_blank(db: psycopg.Connection[dict[str, Any]]) -> None:
    owner_id = create_user(db, email="owner@example.test")
    with pytest.raises(psycopg.errors.CheckViolation):
        db.execute(
            "INSERT INTO projects (owner_id, name) VALUES (%s, %s)",
            (owner_id, "   "),
        )


def test_membership_primary_key_prevents_duplicates(
    db: psycopg.Connection[dict[str, Any]],
) -> None:
    owner_id = create_user(db, email="owner@example.test")
    project_id = create_project(db, owner_id=owner_id, name="P")
    create_membership(db, project_id=project_id, user_id=owner_id, role="owner")
    with pytest.raises(psycopg.errors.UniqueViolation):
        create_membership(db, project_id=project_id, user_id=owner_id, role="viewer")


def test_invalid_role_is_rejected(db: psycopg.Connection[dict[str, Any]]) -> None:
    owner_id = create_user(db, email="owner@example.test")
    project_id = create_project(db, owner_id=owner_id, name="P")
    with pytest.raises(psycopg.errors.InvalidTextRepresentation):
        create_membership(db, project_id=project_id, user_id=owner_id, role="admin")


def test_upload_session_project_must_match_dataset(
    db: psycopg.Connection[dict[str, Any]],
) -> None:
    owner_id = create_user(db, email="owner@example.test")
    project_a = create_project(db, owner_id=owner_id, name="A")
    project_b = create_project(db, owner_id=owner_id, name="B")
    row = db.execute(
        """
        INSERT INTO datasets (project_id, name, source_type)
        VALUES (%s, 'volume', 'upload')
        RETURNING id
        """,
        (project_a,),
    ).fetchone()
    assert row is not None
    dataset_id = row["id"]

    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        db.execute(
            """
            INSERT INTO upload_sessions (dataset_id, project_id, expires_at)
            VALUES (%s, %s, now() + interval '1 hour')
            """,
            (dataset_id, project_b),
        )


def test_file_asset_size_must_be_non_negative(db: psycopg.Connection[dict[str, Any]]) -> None:
    owner_id = create_user(db, email="owner@example.test")
    project_id = create_project(db, owner_id=owner_id, name="P")
    dataset = db.execute(
        """
        INSERT INTO datasets (project_id, name, source_type)
        VALUES (%s, 'volume', 'upload')
        RETURNING id
        """,
        (project_id,),
    ).fetchone()
    assert dataset is not None
    version = db.execute(
        """
        INSERT INTO dataset_versions (dataset_id, version)
        VALUES (%s, '1')
        RETURNING id
        """,
        (dataset["id"],),
    ).fetchone()
    assert version is not None
    with pytest.raises(psycopg.errors.CheckViolation):
        db.execute(
            """
            INSERT INTO file_assets (dataset_version_id, object_key, checksum, size_bytes, media_type)
            VALUES (%s, 'k', 'sha256:0', -1, 'application/gzip')
            """,
            (version["id"],),
        )
