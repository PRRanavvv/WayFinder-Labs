from .text import clamp


def calculate_confidence(
    *,
    base: float = 0.82,
    retrieval_score: float | None = None,
    missing_info: list[str] | None = None,
    conflicts: list[object] | None = None,
    fallback_warnings: list[str] | None = None,
    sparse_data: bool = False,
    feasible: bool = True,
    output_completeness: float = 1,
    group_conflict_level: str = "none",
    data_coverage: float = 1,
) -> dict:
    missing_info = missing_info or []
    conflicts = conflicts or []
    fallback_warnings = fallback_warnings or []
    reasons: list[str] = []
    score = 0.48 + clamp(retrieval_score / 100, 0, 1) * 0.42 if retrieval_score is not None else base

    if missing_info:
        score -= min(0.24, len(missing_info) * 0.06)
        reasons.append(f"missing information: {', '.join(missing_info[:3])}")
    if conflicts:
        score -= min(0.3, len(conflicts) * 0.1)
        labels = ", ".join(label_conflict(conflict) for conflict in conflicts[:3])
        reasons.append(f"conflicting preferences: {labels}")
    if fallback_warnings:
        score -= min(0.18, len(fallback_warnings) * 0.06)
        reasons.append(f"fallback used: {', '.join(fallback_warnings[:3])}")
    if sparse_data:
        score -= 0.15
        reasons.append("sparse destination data")
    if not feasible:
        score -= 0.28
        reasons.append("no fully feasible plan available")
    if output_completeness < 1:
        score -= (1 - clamp(output_completeness, 0, 1)) * 0.22
        reasons.append("partial output")
    if data_coverage < 1:
        score -= (1 - clamp(data_coverage, 0, 1)) * 0.16
        reasons.append("partial live data coverage")
    if group_conflict_level == "high":
        score -= 0.12
        reasons.append("high group preference conflict")
    elif group_conflict_level == "medium":
        score -= 0.07
        reasons.append("medium group preference conflict")

    confidence = round(clamp(score, 0.05, 0.99), 2)
    return {
        "confidence": confidence,
        "confidenceLevel": "high" if confidence >= 0.78 else "medium" if confidence >= 0.55 else "low",
        "confidenceReasons": reasons or ["strong deterministic fit"],
    }


def label_conflict(conflict: object) -> str:
    if isinstance(conflict, str):
        return conflict
    if isinstance(conflict, dict):
        return str(conflict.get("type") or conflict.get("message") or "conflict")
    return "conflict"
