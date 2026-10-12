"""Identity domain models.

These dataclasses are the boundary between explicit SQL repositories and the
application/API layers. API responses are built from dedicated Pydantic schemas
rather than exposing these objects directly.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class User:
    """An application user mapped to an external identity provider subject."""

    id: UUID
    email: str
    display_name: str | None
    created_at: datetime
