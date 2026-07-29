from fastapi import APIRouter

from ..contracts import (
    GroupFusionRequest,
    ItineraryRequest,
    RecommendationExplanationRequest,
    RecommendationRequest,
    StableReplanRequest,
)
from ..core.config import ENGINE_VERSION, SERVICE_NAME
from ..engines.explanation_engine import (
    explain_group_preference_fusion,
    explain_recommendation_selection,
    explain_stable_replan,
)
from ..engines.group_preference_fusion import fuse_group_preferences
from ..engines.itinerary_planner import plan_deterministic_itinerary
from ..engines.recommendation_engine import rank_destination_recommendations
from ..engines.retrieval_engine import retrieve_context
from ..engines.stability_engine import replan_with_stability

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "runtime": "python-fastapi",
        "engineVersion": ENGINE_VERSION,
    }


@router.post("/v1/fuse-preferences")
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


@router.post("/v1/itinerary")
def itinerary(request: ItineraryRequest) -> dict:
    return plan_deterministic_itinerary(**request.model_dump())


@router.post("/v1/replan")
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


@router.post("/v1/recommendations")
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


@router.post("/v1/explain/recommendation")
def recommendation_explanation(request: RecommendationExplanationRequest) -> dict:
    return explain_recommendation_selection(request.recommendation, tripDNA=request.tripDNA)
