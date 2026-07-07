from typing import Any

from pydantic import BaseModel, Field


class GroupFusionRequest(BaseModel):
    groupMembers: list[dict[str, Any]] = Field(default_factory=list)
    explicitPreferences: dict[str, Any] = Field(default_factory=dict)
    tripContext: dict[str, Any] = Field(default_factory=dict)


class ItineraryRequest(BaseModel):
    destination: str = "Kerala"
    days: int = 1
    budget: int | None = None
    group: dict[str, Any] = Field(default_factory=dict)
    preferences: dict[str, Any] = Field(default_factory=dict)
    weather: dict[str, Any] | str | None = None
    month: str | None = None
    openingHours: dict[str, Any] = Field(default_factory=dict)
    blockedPlaceIds: list[str] = Field(default_factory=list)


class StableReplanRequest(BaseModel):
    previousItinerary: dict[str, Any]
    itineraryInput: dict[str, Any] = Field(default_factory=dict)
    changes: dict[str, Any] = Field(default_factory=dict)
    stabilityOptions: dict[str, Any] = Field(default_factory=dict)


class RecommendationRequest(BaseModel):
    query: str = ""
    candidates: list[dict[str, Any]] | None = None
    userPreferences: dict[str, Any] = Field(default_factory=dict)
    budgetConstraints: dict[str, Any] = Field(default_factory=dict)
    groupPreferences: dict[str, Any] = Field(default_factory=dict)
    groupMembers: list[dict[str, Any]] = Field(default_factory=list)
    tripLengthDays: int = 3
    season: str | None = None
    month: str | None = None
    travelStyle: dict[str, Any] = Field(default_factory=dict)
    weightProfile: str | None = None
    topK: int = 10


class RecommendationExplanationRequest(BaseModel):
    recommendation: dict[str, Any]
    tripDNA: dict[str, Any] = Field(default_factory=dict)
