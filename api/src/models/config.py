from pydantic import BaseModel
from typing import Any, Literal
from datetime import datetime
from uuid import UUID


class ConfigBase(BaseModel):
    config_type: Literal["rsu", "pension"]
    name: str | None = None
    config_data: dict[str, Any]
    is_default: bool = False


class ConfigCreate(ConfigBase):
    pass


class ConfigUpdate(BaseModel):
    name: str | None = None
    config_data: dict[str, Any] | None = None
    is_default: bool | None = None


class ConfigResponse(ConfigBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
