import pytest


@pytest.mark.asyncio
async def test_root_returns_welcome(client):
    response = await client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert "message" in body
    assert "Berta" in body["message"] or "Scribe" in body["message"]


@pytest.mark.asyncio
async def test_healthcheck_returns_ready(client):
    response = await client.get("/healthcheck")
    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Ready"
