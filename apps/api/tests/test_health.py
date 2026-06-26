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


def test_database_health_returns_disabled_state(client: TestClient) -> None:
    response = client.get("/health/db")

    assert response.status_code == 200
    assert response.json() == {
        "status": "disabled",
        "component": "database",
        "service": "ecosentinel-api",
        "environment": "test",
        "details": {"reason": "Database health checks are disabled."},
    }


def test_redis_health_returns_disabled_state(client: TestClient) -> None:
    response = client.get("/health/redis")

    assert response.status_code == 200
    assert response.json() == {
        "status": "disabled",
        "component": "redis",
        "service": "ecosentinel-api",
        "environment": "test",
        "details": {"reason": "Redis health checks are disabled."},
    }
