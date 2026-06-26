import subprocess
import sys
from pathlib import Path

from alembic.config import Config


def test_alembic_config_uses_local_script_location() -> None:
    config = Config("alembic.ini")

    assert config.get_main_option("script_location") == "alembic"


def test_initial_migration_enables_postgis() -> None:
    migration = Path("alembic/versions/0001_enable_postgis.py").read_text()

    assert "CREATE EXTENSION IF NOT EXISTS postgis" in migration


def test_alembic_can_discover_head_revision() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "heads"],
        check=True,
        capture_output=True,
        text=True,
    )

    assert "0005" in result.stdout
