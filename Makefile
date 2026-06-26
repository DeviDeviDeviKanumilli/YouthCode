.PHONY: dev test lint typecheck check

API_DIR := apps/api
PYTHON ?= $(API_DIR)/.venv/bin/python

dev:
	cd $(API_DIR) && ../../$(PYTHON) -m uvicorn app.main:app --reload

test:
	cd $(API_DIR) && ../../$(PYTHON) -m pytest

lint:
	cd $(API_DIR) && ../../$(PYTHON) -m ruff check .

typecheck:
	cd $(API_DIR) && ../../$(PYTHON) -m mypy app tests

check: lint typecheck test
