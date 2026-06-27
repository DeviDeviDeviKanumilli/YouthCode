from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class StoredFile:
    storage_key: str
    public_url: str | None = None


class StorageAdapter(ABC):
    @abstractmethod
    def save_file(self, storage_key: str, content: bytes) -> StoredFile:
        raise NotImplementedError

    @abstractmethod
    def get_file_url(self, storage_key: str) -> str | None:
        raise NotImplementedError

    @abstractmethod
    def delete_file(self, storage_key: str) -> None:
        raise NotImplementedError


class LocalStorageAdapter(StorageAdapter):
    def __init__(self, storage_dir: str = ".local/storage", base_url: str | None = None) -> None:
        self.storage_dir = Path(storage_dir)
        self.base_url = base_url

    def save_file(self, storage_key: str, content: bytes) -> StoredFile:
        target = safe_storage_path(self.storage_dir, storage_key)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        return StoredFile(storage_key=storage_key, public_url=self.get_file_url(storage_key))

    def get_file_url(self, storage_key: str) -> str | None:
        if self.base_url is None:
            return None
        return f"{self.base_url.rstrip('/')}/{storage_key.lstrip('/')}"

    def delete_file(self, _storage_key: str) -> None:
        return None


def safe_storage_path(storage_dir: Path, storage_key: str) -> Path:
    root = storage_dir.resolve()
    target = (root / storage_key).resolve()
    if root != target and root not in target.parents:
        raise ValueError("storage_key must stay inside the configured storage directory")
    return target
