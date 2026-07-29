from typing import Any

from pydantic import Field

from .common import ContractModel, JsonObject


class ItineraryRequest(ContractModel):
    destination: str = Field(default="Kerala", min_length=1, max_length=160)
    days: int = Field(default=1, ge=1, le=60)
    budget: int | None = Field(default=None, ge=0)
    group: JsonObject = Field(default_factory=dict)
    preferences: JsonObject = Field(default_factory=dict)
    weather: JsonObject | str | None = None
    month: str | None = Field(default=None, max_length=32)
    openingHours: dict[str, Any] = Field(default_factory=dict)
    blockedPlaceIds: list[str] = Field(default_factory=list)


class StableReplanRequest(ContractModel):
    previousItinerary: JsonObject
    itineraryInput: JsonObject = Field(default_factory=dict)
    changes: JsonObject = Field(default_factory=dict)
    stabilityOptions: JsonObject = Field(default_factory=dict)
