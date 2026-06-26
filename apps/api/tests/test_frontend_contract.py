import json
from pathlib import Path

from app.main import create_app


def test_frozen_openapi_contract_matches_app_schema() -> None:
    frozen_schema = json.loads(Path("docs/openapi.json").read_text())

    assert frozen_schema == create_app().openapi()
