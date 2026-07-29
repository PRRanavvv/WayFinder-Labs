from pydantic import Field

from .common import ContractModel, JsonObject


class GroupFusionRequest(ContractModel):
    groupMembers: list[JsonObject] = Field(default_factory=list)
    explicitPreferences: JsonObject = Field(default_factory=dict)
    tripContext: JsonObject = Field(default_factory=dict)
