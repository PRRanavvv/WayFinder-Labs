from fastapi import FastAPI

from .schemas import (
    GroupFusionRequest,
    ItineraryRequest,
    RecommendationExplanationRequest,
    RecommendationRequest,
    StableReplanRequest,
)
from .services.explanation_engine import (
    explain_group_preference_fusion,
    explain_recommendation_selection,
    explain_stable_replan,
)
from .services.group_preference_fusion import fuse_group_preferences
from .services.itinerary_planner import plan_deterministic_itinerary
from .services.recommendation_engine import rank_destination_recommendations
from .services.retrieval_engine import retrieve_context
from .services.stability_engine import replan_with_stability

app = FastAPI(
    title="WayFinder AI Engine",
    version="0.2.0",
    description="Python/FastAPI travel-intelligence service for WayFinder.",
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "wayfinder-ai-engine",
        "runtime": "python-fastapi",
    }


@app.post("/v1/fuse-preferences")
def fuse_preferences(request: GroupFusionRequest) -> dict:
    fusion = fuse_group_preferences(
        groupMembers=request.groupMembers,
        explicitPreferences=request.explicitPreferences,
        tripContext=request.tripContext,
    )
    return {
        "fusion": fusion,
        "explanation": explain_group_preference_fusion(fusion),
    }


@app.post("/v1/itinerary")
def itinerary(request: ItineraryRequest) -> dict:
    return plan_deterministic_itinerary(**dump_model(request))


@app.post("/v1/replan")
def stable_replan(request: StableReplanRequest) -> dict:
    stable = replan_with_stability(
        previousItinerary=request.previousItinerary,
        itineraryInput=request.itineraryInput,
        changes=request.changes,
        stabilityOptions=request.stabilityOptions,
    )
    return {
        "itinerary": stable,
        "explanation": explain_stable_replan(stable),
    }


@app.post("/v1/recommendations")
def recommendations(request: RecommendationRequest) -> dict:
    candidates = request.candidates
    if candidates is None and request.query:
        candidates = retrieve_context(
            query=request.query,
            interests=request.userPreferences.get("interests", []),
            constraints=request.groupPreferences,
            topK=max(request.topK, 8),
        )
    ranked = rank_destination_recommendations(
        candidates=candidates,
        userPreferences=request.userPreferences,
        budgetConstraints=request.budgetConstraints,
        groupPreferences=request.groupPreferences,
        groupMembers=request.groupMembers,
        tripLengthDays=request.tripLengthDays,
        season=request.season,
        month=request.month,
        travelStyle=request.travelStyle,
        weightProfile=request.weightProfile,
        topK=request.topK,
    )
    return {"recommendations": ranked}


@app.post("/v1/explain/recommendation")
def recommendation_explanation(request: RecommendationExplanationRequest) -> dict:
    return explain_recommendation_selection(request.recommendation, tripDNA=request.tripDNA)


def dump_model(model):
    return model.model_dump() if hasattr(model, "model_dump") else model.dict()
