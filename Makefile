.PHONY: dev api-dev compose-down test lint typecheck check migrate seed

API_DIR := apps/api
PYTHON ?= $(API_DIR)/.venv/bin/python

dev:
	docker compose up --build

api-dev:
	cd $(API_DIR) && ../../$(PYTHON) -m uvicorn app.main:app --reload

test:
	cd $(API_DIR) && ../../$(PYTHON) -m pytest

lint:
	cd $(API_DIR) && ../../$(PYTHON) -m ruff check .

typecheck:
	cd $(API_DIR) && ../../$(PYTHON) -m mypy app tests

check: lint typecheck test

migrate:
	cd $(API_DIR) && ../../$(PYTHON) -m alembic upgrade head

seed:
	cd $(API_DIR) && ../../$(PYTHON) -m app.scripts.seed

compose-down:
	docker compose down
