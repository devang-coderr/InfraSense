"""
Severity engine (spec section 12).

WHAT: turns an AI category + a few location signals into a severity_score
      (0-100) and a breakdown of named factors, in the exact shape the
      frontend's `severityFactors` list expects (label/score/max).
WHY IT'S HEURISTIC, NOT "REAL AI": there is no trained damage-assessment
      model behind this yet. The weights below are a documented scoring
      rubric we designed, mirroring the shape already implied by the
      frontend's mock data. When a real vision model is added
      (app/ai/vision.py), only `damage_size` should come from it — the
      rest of this function stays the same.

Scale (matches the mock data's factor maxes exactly):
    damage_size          0-35
    road_importance       0-25
    traffic_exposure      0-20
    nearby_school          0-10
    historical_incidents   0-10
    -----------------------------
    total                  0-100
"""
from app.database.models.enums import Severity

# Baseline per-category damage assumption, used only when a real vision
# model hasn't supplied a measured damage_size. Documented, adjustable.
CATEGORY_DAMAGE_BASELINE: dict[str, int] = {
    "pothole": 30,
    "open manhole": 32,
    "road crack": 12,
    "traffic signal": 22,
    "streetlight": 18,
    "garbage": 16,
    "water leakage": 24,
}

# Road importance is a placeholder constant until real road-classification
# data exists. A ward flagged as high-traffic can be tuned in wards seed data.
DEFAULT_ROAD_IMPORTANCE = 18
DEFAULT_TRAFFIC_EXPOSURE = 12
DEFAULT_NEARBY_SCHOOL = 3
DEFAULT_HISTORICAL_INCIDENTS = 4


def score_to_severity(score: int) -> Severity:
    if score >= 85:
        return Severity.CRITICAL
    if score >= 65:
        return Severity.HIGH
    if score >= 40:
        return Severity.MEDIUM
    return Severity.LOW


def calculate_severity(category: str, damage_size_hint: int | None = None) -> tuple[Severity, int, list[dict]]:
    """
    Returns (severity_enum, severity_score, factors) where `factors` is a
    list of {"label", "score", "max"} dicts ready to store/serialize.
    """
    damage_size = damage_size_hint if damage_size_hint is not None else CATEGORY_DAMAGE_BASELINE.get(
        category.lower(), 20
    )
    damage_size = max(0, min(35, damage_size))

    factors = [
        {"label": "Damage size", "score": damage_size, "max": 35},
        {"label": "Road importance", "score": DEFAULT_ROAD_IMPORTANCE, "max": 25},
        {"label": "Traffic exposure", "score": DEFAULT_TRAFFIC_EXPOSURE, "max": 20},
        {"label": "Nearby school", "score": DEFAULT_NEARBY_SCHOOL, "max": 10},
        {"label": "Historical incidents", "score": DEFAULT_HISTORICAL_INCIDENTS, "max": 10},
    ]
    total = sum(f["score"] for f in factors)
    return score_to_severity(total), total, factors
