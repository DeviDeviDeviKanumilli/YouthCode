from pydantic import BaseModel, ConfigDict


class ComponentHealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    component: str
    service: str
    environment: str
    details: dict[str, str] | None = None


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    service: str
    environment: str


class VersionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    service: str
    version: str
    environment: str
