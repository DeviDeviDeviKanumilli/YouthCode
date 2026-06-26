from fastapi.testclient import TestClient


def test_health_returns_service_status(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ecosentinel-api",
        "environment": "test",
    }


def test_version_returns_current_version(client: TestClient) -> None:
    response = client.get("/version")

    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "ecosentinel-api"
    assert body["environment"] == "test"
    assert body["version"]
