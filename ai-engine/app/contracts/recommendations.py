from pydantic import Field

from .common import ContractModel, JsonObject


class RecommendationRequest(ContractModel):
    query: str = Field(default="", max_length=2_000)
    candidates: list[JsonObject] | None = None
    userPreferences: JsonObject = Field(default_factory=dict)
    budgetConstraints: JsonObject = Field(default_factory=dict)
    groupPreferences: JsonObject = Field(default_factory=dict)
    groupMembers: list[JsonObject] = Field(default_factory=list)
    tripLengthDays: int = Field(default=3, ge=1, le=60)
    season: str | None = Field(default=None, max_length=32)
    month: str | None = Field(default=None, max_length=32)
    travelStyle: JsonObject = Field(default_factory=dict)
    weightProfile: str | None = Field(default=None, max_length=64)
    topK: int = Field(default=10, ge=1, le=50)


class RecommendationExplanationRequest(ContractModel):
    recommendation: JsonObject
    tripDNA: JsonObject = Field(default_factory=dict)
