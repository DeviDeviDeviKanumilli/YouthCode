from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class StoredFile:
    storage_key: str
    public_url: str | None = None


class StorageAdapter(ABC):
    @abstractmethod
    def get_file_url(self, storage_key: str) -> str | None:
        raise NotImplementedError

    @abstractmethod
    def delete_file(self, storage_key: str) -> None:
        raise NotImplementedError


class LocalStorageAdapter(StorageAdapter):
    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = base_url

    def get_file_url(self, storage_key: str) -> str | None:
        if self.base_url is None:
            return None
        return f"{self.base_url.rstrip('/')}/{storage_key.lstrip('/')}"

    def delete_file(self, _storage_key: str) -> None:
        return None
