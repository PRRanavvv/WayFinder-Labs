from typing import Any, TypeAlias

from pydantic import BaseModel, ConfigDict

JsonObject: TypeAlias = dict[str, Any]


class ContractModel(BaseModel):
    """Base request contract shared by every public endpoint."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)
