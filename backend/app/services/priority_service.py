"""
Priority engine (spec section 14).

Priority (0-100) = how urgently this specific issue should be fixed,
combining severity with real-world context (traffic, nearby schools, how
many other citizens reported the same thing, road importance, and how
long it's been open). This is a documented weighted heuristic, not a
trained model — see severity_service.py for the same disclosure.

Scale (matches mock data's factor maxes exactly):
    severity contribution   0-30  (= severity_score * 0.30, rounded)
    traffic exposure        0-20
    near school              0-15
    reports merged            0-15  (duplicate_count-based)
    road importance          0-10
    age of complaint          0-10  (older + still open = higher)
"""


def _reports_merged_score(duplicate_count: int) -> int:
    # 0 duplicates -> 0, scales up, caps at 15 around 7+ duplicates.
    return min(15, duplicate_count * 2)


def _age_score(age_days: float) -> int:
    # Older unresolved issues get nudged up the queue, caps at 10.
    return min(10, round(age_days))


def calculate_priority(
    severity_score: int,
    duplicate_count: int,
    age_days: float,
    traffic_exposure: int = 12,
    near_school: int = 3,
    road_importance: int = 7,
) -> tuple[int, list[dict]]:
    severity_contribution = round(severity_score * 0.30)
    traffic_contribution = min(20, traffic_exposure)
    school_contribution = min(15, near_school)
    merged_contribution = _reports_merged_score(duplicate_count)
    road_contribution = min(10, road_importance)
    age_contribution = _age_score(age_days)

    factors = [
        {"label": "Severity", "score": severity_contribution, "max": 30},
        {"label": "Traffic exposure", "score": traffic_contribution, "max": 20},
        {"label": "Near school", "score": school_contribution, "max": 15},
        {"label": "Reports merged", "score": merged_contribution, "max": 15},
        {"label": "Road importance", "score": road_contribution, "max": 10},
        {"label": "Age of complaint", "score": age_contribution, "max": 10},
    ]
    total = sum(f["score"] for f in factors)
    return min(100, total), factors
