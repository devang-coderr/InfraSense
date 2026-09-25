"""
Prediction service — BASELINE / RULE-BASED (spec section 22, 52).

NOT A TRAINED ML MODEL. There isn't enough historical data in a fresh
project to train anything meaningful yet. This computes a ward's risk
score from data that already exists in THIS database: how many open
issues of a category sit in that ward, weighted by severity. It is
honestly labelled `is_baseline=True` everywhere it's used.

UPGRADE PATH: once you have months of real historical + weather + traffic
data, replace `compute_ward_risks` with real feature engineering + a
trained model, keeping the same WardRiskOut shape.
"""
from collections import defaultdict

from sqlalchemy.orm import Session

from app.database.models.issue import Issue
from app.database.models.ward import Ward

SEVERITY_WEIGHT = {"critical": 4, "high": 3, "medium": 2, "low": 1}


def compute_ward_risks(db: Session) -> list[dict]:
    wards = {w.id: w for w in db.query(Ward).all()}
    issues = db.query(Issue).filter(Issue.status != "resolved").all()

    # (ward_id, category) -> {"weight": int, "count": int}
    buckets: dict[tuple[int, str], dict] = defaultdict(lambda: {"weight": 0, "count": 0})
    for issue in issues:
        if issue.ward_id is None:
            continue
        key = (issue.ward_id, issue.category)
        buckets[key]["weight"] += SEVERITY_WEIGHT.get(issue.severity.value, 1)
        buckets[key]["count"] += 1

    results = []
    for (ward_id, category), agg in buckets.items():
        ward = wards.get(ward_id)
        if not ward:
            continue
        # Simple bounded heuristic: weight*8 capped at 100, plus a small
        # bump for report volume.
        risk_score = min(100, agg["weight"] * 8 + agg["count"] * 2)
        if risk_score < 20:
            continue  # not worth surfacing as a "risk"

        reasons = [
            f"{agg['count']} open '{category}' report(s) in {ward.name}",
            f"Severity-weighted load: {agg['weight']} (critical=4, high=3, medium=2, low=1)",
        ]
        recommended_actions = [
            f"Inspect {ward.name} for {category.lower()} issues this week",
        ]
        if agg["count"] >= 3:
            recommended_actions.append("Prioritise this category in the next maintenance cycle")

        results.append(
            {
                "ward": ward.name,
                "category": category,
                "risk": risk_score,
                "window": "Next 30 days",
                "reasons": reasons,
                "recommendedActions": recommended_actions,
                "isBaseline": True,
                "ward_id": ward_id,
            }
        )

    results.sort(key=lambda r: r["risk"], reverse=True)
    return results
