from .data import enriched_travel_places
from .text import clamp, tokenize


def build_retrieval_text(place: dict) -> str:
    return " ".join(
        [
            place.get("name", ""),
            place.get("category", ""),
            place.get("summary", ""),
            place.get("semantic_summary", ""),
            *place.get("mood", []),
            *place.get("ideal_for", []),
            *place.get("retrieval_terms", place.get("retrievalTerms", [])),
            *place.get("tags", []),
        ]
    )


def retrieve_context(
    *,
    query: str = "",
    interests: list[str] | None = None,
    constraints: dict | None = None,
    topK: int = 8,
    top_k: int | None = None,
    places: list[dict] | None = None,
) -> list[dict]:
    requested_top_k = top_k or topK
    query_terms = set(tokenize(" ".join([query, *(interests or []), " ".join(str(value) for value in (constraints or {}).values())])))
    scored = []
    for place in places or enriched_travel_places():
        terms = set(tokenize(build_retrieval_text(place)))
        overlap = len(query_terms.intersection(terms))
        score = 52 + overlap * 12
        if constraints and constraints.get("groupType") in place.get("ideal_for", []):
            score += 8
        if constraints and constraints.get("budgetBand") == "low" and place.get("budget_level", 5) <= 2:
            score += 8
        scored.append({
            **place,
            "sourceId": place["id"],
            "retrievalScore": round(clamp(score, 0, 100), 2),
            "retrievalReasons": build_retrieval_reasons(place, query_terms, terms),
        })
    return sorted(scored, key=lambda item: item["retrievalScore"], reverse=True)[:requested_top_k]


def build_retrieval_reasons(place: dict, query_terms: set[str], place_terms: set[str]) -> list[str]:
    matched = sorted(query_terms.intersection(place_terms))[:4]
    reasons = [f"matched {term}" for term in matched]
    if place.get("budget_level", 5) <= 2:
        reasons.append("budget-friendly candidate")
    if place.get("family_friendly"):
        reasons.append("family-friendly metadata")
    return reasons[:5]
