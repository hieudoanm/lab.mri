"""API tests for projects and membership authorisation."""

from __future__ import annotations

from typing import Any, cast

from httpx import AsyncClient
from tests.conftest import bearer, issue_token


async def _create_project(
    client: AsyncClient, token: str, name: str = "Brain atlas"
) -> dict[str, Any]:
    response = await client.post(
        "/api/v1/projects",
        json={"name": name, "description": "Demo project"},
        headers=bearer(token),
    )
    assert response.status_code == 201, response.text
    return cast("dict[str, Any]", response.json())


async def test_create_project_returns_owner_role(client: AsyncClient) -> None:
    token = await issue_token(client, email="owner@example.test")
    project = await _create_project(client, token)
    assert project["role"] == "owner"
    assert project["visibility"] == "private"
    assert project["archived"] is False


async def test_list_projects_includes_seeded_and_created(client: AsyncClient) -> None:
    token = await issue_token(client, email="owner@example.test")
    await _create_project(client, token, name="Second")
    response = await client.get("/api/v1/projects", headers=bearer(token))
    assert response.status_code == 200
    names = {item["name"] for item in response.json()["items"]}
    assert "Second" in names
    assert len(names) >= 2


async def test_read_project_returns_detail(client: AsyncClient) -> None:
    token = await issue_token(client, email="owner@example.test")
    project = await _create_project(client, token)
    response = await client.get(f"/api/v1/projects/{project['id']}", headers=bearer(token))
    assert response.status_code == 200
    assert response.json()["id"] == project["id"]


async def test_cross_project_access_is_not_found(client: AsyncClient) -> None:
    owner = await issue_token(client, email="owner@example.test")
    project = await _create_project(client, owner)
    intruder = await issue_token(client, email="intruder@example.test")
    response = await client.get(f"/api/v1/projects/{project['id']}", headers=bearer(intruder))
    assert response.status_code == 404


async def test_owner_can_add_member(client: AsyncClient) -> None:
    token = await issue_token(client, email="owner@example.test")
    project = await _create_project(client, token)
    response = await client.post(
        f"/api/v1/projects/{project['id']}/members",
        json={"email": "viewer@example.test", "role": "viewer"},
        headers=bearer(token),
    )
    assert response.status_code == 201, response.text
    assert response.json()["role"] == "viewer"


async def test_viewer_cannot_modify_project(client: AsyncClient) -> None:
    owner = await issue_token(client, email="owner@example.test")
    project = await _create_project(client, owner)
    await client.post(
        f"/api/v1/projects/{project['id']}/members",
        json={"email": "viewer@example.test", "role": "viewer"},
        headers=bearer(owner),
    )
    viewer = await issue_token(client, email="viewer@example.test")
    response = await client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"name": "Renamed"},
        headers=bearer(viewer),
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "insufficient_role"


async def test_viewer_cannot_add_members(client: AsyncClient) -> None:
    owner = await issue_token(client, email="owner@example.test")
    project = await _create_project(client, owner)
    await client.post(
        f"/api/v1/projects/{project['id']}/members",
        json={"email": "viewer@example.test", "role": "viewer"},
        headers=bearer(owner),
    )
    viewer = await issue_token(client, email="viewer@example.test")
    response = await client.post(
        f"/api/v1/projects/{project['id']}/members",
        json={"email": "someone@example.test", "role": "viewer"},
        headers=bearer(viewer),
    )
    assert response.status_code == 403


async def test_archiving_hides_project_from_list(client: AsyncClient) -> None:
    token = await issue_token(client, email="owner@example.test")
    project = await _create_project(client, token, name="ToArchive")
    response = await client.post(f"/api/v1/projects/{project['id']}/archive", headers=bearer(token))
    assert response.status_code == 200
    assert response.json()["archived"] is True
    listed = await client.get("/api/v1/projects", headers=bearer(token))
    assert "ToArchive" not in {item["name"] for item in listed.json()["items"]}


async def test_last_owner_cannot_be_demoted(client: AsyncClient) -> None:
    token = await issue_token(client, email="owner@example.test")
    project = await _create_project(client, token)
    me = (await client.get("/api/v1/me", headers=bearer(token))).json()
    response = await client.patch(
        f"/api/v1/projects/{project['id']}/members/{me['id']}",
        json={"role": "viewer"},
        headers=bearer(token),
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "last_owner"


async def test_invalid_cursor_is_rejected(client: AsyncClient) -> None:
    token = await issue_token(client, email="owner@example.test")
    response = await client.get("/api/v1/projects?cursor=not-a-cursor", headers=bearer(token))
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_cursor"


async def test_project_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/projects")
    assert response.status_code == 401
