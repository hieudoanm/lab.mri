"""Unit tests for opaque cursor pagination."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from app.core.exceptions import UnprocessableEntityError
from app.core.pagination import decode_cursor, encode_cursor


def test_cursor_round_trips() -> None:
    created_at = datetime(2026, 1, 2, 3, 4, 5, tzinfo=UTC)
    identifier = uuid4()
    cursor = decode_cursor(encode_cursor(created_at=created_at, id=identifier))
    assert cursor.created_at == created_at
    assert cursor.id == identifier


def test_cursor_is_url_safe_and_opaque() -> None:
    cursor = encode_cursor(created_at=datetime.now(UTC), id=uuid4())
    assert "=" not in cursor
    assert "/" not in cursor
    assert "+" not in cursor


def test_malformed_cursor_is_rejected() -> None:
    with pytest.raises(UnprocessableEntityError):
        decode_cursor("not-a-cursor")


def test_cursor_decoded_to_utc() -> None:
    created_at = datetime(2026, 1, 2, 3, 4, 5, tzinfo=UTC)
    cursor = decode_cursor(encode_cursor(created_at=created_at, id=uuid4()))
    assert cursor.created_at.tzinfo is not None
