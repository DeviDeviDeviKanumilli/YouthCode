from pydantic import BaseModel, ConfigDict


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
