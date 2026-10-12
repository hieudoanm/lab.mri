"""API tests for development authentication and the current-user endpoint."""

from __future__ import annotations

from app.main import create_app
from httpx import ASGITransport, AsyncClient
from tests.conftest import bearer, issue_token, make_settings


async def test_development_token_returns_bearer_and_sets_cookie(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/token", json={"email": "alice@example.test"})
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "Bearer"
    assert body["access_token"]
    assert body["expires_at"].endswith("Z")
    assert "mri-lab_session" in response.cookies


async def test_me_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


async def test_me_returns_profile_and_seeded_project(client: AsyncClient) -> None:
    token = await issue_token(client, email="alice@example.test", display_name="Alice")
    response = await client.get("/api/v1/me", headers=bearer(token))
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "alice@example.test"
    assert body["display_name"] == "Alice"
    assert len(body["memberships"]) == 1
    assert body["memberships"][0]["role"] == "owner"


async def test_token_endpoint_is_hidden_when_not_development(migrated_schema: str) -> None:
    app = create_app(make_settings(auth_mode="oidc"))
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
            response = await http_client.post("/api/v1/auth/token", json={})
    assert response.status_code == 404


async def test_logout_clears_the_cookie(client: AsyncClient) -> None:
    await issue_token(client)
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 204


async def test_invalid_token_is_rejected(client: AsyncClient) -> None:
    response = await client.get("/api/v1/me", headers=bearer("not-a-token"))
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_token"
