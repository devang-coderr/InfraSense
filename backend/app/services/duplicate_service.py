"""
Duplicate report detection service.

Provides lightweight perceptual image hashing (dHash) and multi-signal similarity
assessment (image similarity, geographic proximity, category match, reporting time).

Design principles:
- Production-structured and explainable (returns human-understandable similarity signals).
- Non-punitive and strictly neutral ("Possible duplicate of Issue #123").
- Does not block report creation, merge issues automatically, or mark fraud.
- Graceful degradation when optional signals (GPS, images) are missing.
"""
from datetime import datetime, timezone
import io
import logging
from typing import Any, Optional, Tuple

from PIL import Image
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.models.enums import IssueStatus
from app.database.models.issue import Issue
from app.database.models.issue_duplicate import IssueDuplicate
from app.database.models.issue_media import IssueMedia
from app.services.gis_service import haversine_meters

logger = logging.getLogger("infrasense.services.duplicate")


def compute_perceptual_hash(image_bytes: bytes) -> Optional[str]:
    """
    Computes a 64-bit difference hash (dHash) for an image.
    Returns a 16-character hexadecimal string, or None on failure.
    """
    if not image_bytes:
        return None

    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            # 1. Convert to grayscale and resize to 9x8
            resized = img.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
            pixels = list(resized.tobytes())

            # 2. Compare adjacent horizontal pixels (8 rows of 8 comparisons = 64 bits)
            difference = []
            for row in range(8):
                row_start = row * 9
                for col in range(8):
                    pixel_left = pixels[row_start + col]
                    pixel_right = pixels[row_start + col + 1]
                    difference.append(1 if pixel_left > pixel_right else 0)

            # 3. Convert 64 bits to hexadecimal integer
            decimal_value = 0
            for bit in difference:
                decimal_value = (decimal_value << 1) | bit

            return f"{decimal_value:016x}"
    except Exception as exc:
        logger.debug(f"Could not compute perceptual hash: {exc}")
        return None


def hamming_distance(hash1: str, hash2: str) -> int:
    """Computes the Hamming bit distance between two 16-character hex hashes (0 to 64)."""
    try:
        val1 = int(hash1, 16)
        val2 = int(hash2, 16)
        return bin(val1 ^ val2).count("1")
    except Exception:
        return 64


def calculate_hash_similarity(hash1: str, hash2: str) -> float:
    """Returns normalized visual similarity between 0.0 and 1.0."""
    dist = hamming_distance(hash1, hash2)
    return round(1.0 - (dist / 64.0), 3)


def compare_image_hashes(
    hashes1: list[str], hashes2: list[str]
) -> Tuple[Optional[float], str]:
    """
    Compares two lists of image perceptual hashes and returns the maximum similarity.
    Strength: 'strong' (>=0.85), 'moderate' (>=0.75), 'weak' (<0.75), or 'unavailable'.
    """
    valid1 = [h for h in hashes1 if h]
    valid2 = [h for h in hashes2 if h]

    if not valid1 or not valid2:
        return None, "unavailable"

    max_sim = 0.0
    for h1 in valid1:
        for h2 in valid2:
            sim = calculate_hash_similarity(h1, h2)
            if sim > max_sim:
                max_sim = sim

    if max_sim >= settings.DUPLICATE_IMAGE_SIMILARITY_THRESHOLD:
        strength = "strong"
    elif max_sim >= 0.75:
        strength = "moderate"
    else:
        strength = "weak"

    return max_sim, strength


def format_relative_time_diff(seconds: int) -> str:
    """Formats time difference into human-friendly description."""
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''}"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours != 1 else ''}"
    days = hours // 24
    return f"{days} day{'s' if days != 1 else ''}"


def assess_and_record_duplicates(
    db: Session,
    new_issue: Issue,
    new_media_hashes: Optional[list[str]] = None,
) -> dict[str, Any]:
    """
    Compares `new_issue` against existing open issues in the database using:
    1. Geographic proximity (report latitude/longitude)
    2. Category match (infrastructure defect classification)
    3. Reporting time proximity
    4. Perceptual image similarity across attached evidence photos

    Records duplicate link in `issue_duplicates` table if a strong match is found.
    Returns structured assessment dictionary for API responses.
    """
    # Collect hashes for new issue
    if new_media_hashes is None:
        new_media_hashes = [
            m.perceptual_hash for m in new_issue.media if m.perceptual_hash
        ]

    # Query candidate open/active issues (excluding the newly created issue itself)
    candidates = (
        db.query(Issue)
        .filter(
            Issue.id != new_issue.id,
            Issue.status != IssueStatus.RESOLVED,
        )
        .all()
    )

    if not candidates:
        return {
            "status": "no_clear_match",
            "matched_issue_id": None,
            "matches": [],
        }

    now_utc = datetime.now(timezone.utc)
    new_reported_at = new_issue.reported_at
    if new_reported_at.tzinfo is None:
        new_reported_at = new_reported_at.replace(tzinfo=timezone.utc)

    matched_candidates: list[dict[str, Any]] = []

    for cand in candidates:
        cand_reported_at = cand.reported_at
        if cand_reported_at.tzinfo is None:
            cand_reported_at = cand_reported_at.replace(tzinfo=timezone.utc)

        # 1. Category Signal
        category_match = (
            new_issue.category.strip().lower() == cand.category.strip().lower()
        )

        # 2. Location Signal
        has_new_coords = (
            new_issue.latitude is not None and new_issue.longitude is not None
        )
        has_cand_coords = (
            cand.latitude is not None and cand.longitude is not None
        )
        distance_m: Optional[float] = None
        is_nearby = False

        if has_new_coords and has_cand_coords:
            distance_m = round(
                haversine_meters(
                    new_issue.latitude,
                    new_issue.longitude,
                    cand.latitude,
                    cand.longitude,
                ),
                1,
            )
            is_nearby = distance_m <= settings.DUPLICATE_LOCATION_THRESHOLD_METERS

        # 3. Time Proximity Signal
        time_diff_sec = abs(int((new_reported_at - cand_reported_at).total_seconds()))
        max_time_sec = int(settings.DUPLICATE_TIME_WINDOW_HOURS * 3600)
        is_recent = time_diff_sec <= max_time_sec

        # 4. Image Similarity Signal
        cand_hashes = [m.perceptual_hash for m in cand.media if m.perceptual_hash]
        img_sim, img_strength = compare_image_hashes(new_media_hashes, cand_hashes)
        is_strong_image = img_strength == "strong"

        # Build Explainable Reasons
        reasons: list[str] = []
        if category_match:
            reasons.append(f"Same category ({cand.category})")
        if distance_m is not None:
            if is_nearby:
                reasons.append(
                    f"Reported approximately {distance_m:.0f}m away (within {settings.DUPLICATE_LOCATION_THRESHOLD_METERS:.0f}m threshold)"
                )
            else:
                reasons.append(f"Located {distance_m:.0f}m away")
        if time_diff_sec is not None:
            time_label = format_relative_time_diff(time_diff_sec)
            if is_recent:
                reasons.append(f"Reported {time_label} apart (within recent window)")
            else:
                reasons.append(f"Reported {time_label} apart")
        if img_sim is not None:
            sim_percent = int(img_sim * 100)
            if is_strong_image:
                reasons.append(f"Visually similar photo evidence ({sim_percent}% similarity)")
            elif img_strength == "moderate":
                reasons.append(f"Moderate visual similarity ({sim_percent}%)")

        # Multi-Signal Similarity Score Calculation (0.0 to 1.0)
        score_components = 0.0
        max_possible = 0.0

        # Category weight: 25%
        max_possible += 0.25
        if category_match:
            score_components += 0.25

        # Location weight: 35%
        if distance_m is not None:
            max_possible += 0.35
            if is_nearby:
                # Proportional proximity score within threshold
                loc_factor = max(
                    0.0,
                    1.0 - (distance_m / settings.DUPLICATE_LOCATION_THRESHOLD_METERS),
                )
                score_components += 0.35 * (0.6 + 0.4 * loc_factor)
            elif distance_m <= settings.DUPLICATE_LOCATION_THRESHOLD_METERS * 2.0:
                score_components += 0.10

        # Time weight: 15%
        max_possible += 0.15
        if is_recent:
            time_factor = max(0.0, 1.0 - (time_diff_sec / max_time_sec))
            score_components += 0.15 * (0.5 + 0.5 * time_factor)

        # Image similarity weight: 25%
        if img_sim is not None:
            max_possible += 0.25
            score_components += 0.25 * img_sim

        combined_score = (
            round(score_components / max_possible, 2) if max_possible > 0 else 0.0
        )

        # Evaluation Decision:
        # Match Criteria:
        # A) Category match + Nearby location (<=100m) + Recent (<=24h)
        # B) Strong Image similarity (>=0.85) + Nearby location (<=150m)
        # C) Strong Image similarity (>=0.85) + Category match + Recent (<=48h)
        # D) Combined similarity score >= 0.70
        is_possible_duplicate = False
        if category_match and is_nearby and is_recent:
            is_possible_duplicate = True
        elif is_strong_image and distance_m is not None and distance_m <= 150.0:
            is_possible_duplicate = True
        elif is_strong_image and category_match and time_diff_sec <= (max_time_sec * 2):
            is_possible_duplicate = True
        elif combined_score >= 0.70 and (is_nearby or is_strong_image):
            is_possible_duplicate = True

        if is_possible_duplicate:
            matched_candidates.append(
                {
                    "candidate": cand,
                    "issue_id": str(cand.id),
                    "category_match": category_match,
                    "category": cand.category,
                    "distance_meters": distance_m,
                    "location_nearby": is_nearby,
                    "time_difference_seconds": time_diff_sec,
                    "time_recent": is_recent,
                    "image_similarity": img_sim,
                    "image_strong_match": is_strong_image,
                    "similarity_score": combined_score,
                    "reasons": reasons,
                }
            )

    # Sort matched candidates by similarity score descending
    matched_candidates.sort(key=lambda m: m["similarity_score"], reverse=True)

    if not matched_candidates:
        # Check if insufficient data
        has_coords = (
            new_issue.latitude is not None and new_issue.longitude is not None
        )
        if not has_coords and not new_media_hashes:
            return {
                "status": "insufficient_evidence",
                "matched_issue_id": None,
                "matches": [],
            }
        return {
            "status": "no_clear_match",
            "matched_issue_id": None,
            "matches": [],
        }

    # Best match
    top_match = matched_candidates[0]
    master_cand: Issue = top_match["candidate"]

    # Record duplicate relationship in database
    master_cand.duplicate_count += 1
    reason_str = "; ".join(top_match["reasons"][:3])
    if len(reason_str) > 250:
        reason_str = reason_str[:250]

    duplicate_record = IssueDuplicate(
        master_issue_id=master_cand.id,
        duplicate_issue_id=new_issue.id,
        similarity_score=top_match["similarity_score"],
        distance_meters=top_match["distance_meters"] or 0.0,
        reason=reason_str,
    )
    db.add(duplicate_record)

    # Prepare response items (clean dictionaries without SQLAlchemy models)
    cleaned_matches = []
    for item in matched_candidates[:5]:  # limit to top 5 matches
        cleaned_matches.append(
            {
                "issue_id": item["issue_id"],
                "category_match": item["category_match"],
                "category": item["category"],
                "distance_meters": item["distance_meters"],
                "location_nearby": item["location_nearby"],
                "time_difference_seconds": item["time_difference_seconds"],
                "time_recent": item["time_recent"],
                "image_similarity": item["image_similarity"],
                "image_strong_match": item["image_strong_match"],
                "similarity_score": item["similarity_score"],
                "reasons": item["reasons"],
            }
        )

    return {
        "status": "possible_duplicate",
        "matched_issue_id": top_match["issue_id"],
        "master_issue": master_cand,
        "matches": cleaned_matches,
    }


# Backwards compatibility helper for existing callers
def find_possible_duplicate(
    db: Session,
    category: str,
    lat: Optional[float],
    lng: Optional[float],
    exclude_issue_id: Optional[int] = None,
) -> Optional[Tuple[Issue, float]]:
    """Legacy helper maintained for backward compatibility."""
    if lat is None or lng is None:
        return None

    query = db.query(Issue).filter(
        Issue.category == category, Issue.status != IssueStatus.RESOLVED
    )
    if exclude_issue_id is not None:
        query = query.filter(Issue.id != exclude_issue_id)

    now = datetime.now(timezone.utc)
    best: Optional[Issue] = None
    best_distance: Optional[float] = None

    for candidate in query.all():
        if candidate.latitude is None or candidate.longitude is None:
            continue
        reported_at = candidate.reported_at
        if reported_at.tzinfo is None:
            reported_at = reported_at.replace(tzinfo=timezone.utc)
        age_days = (now - reported_at).total_seconds() / 86400
        if age_days > (settings.DUPLICATE_TIME_WINDOW_HOURS / 24.0):
            continue

        distance = haversine_meters(lat, lng, candidate.latitude, candidate.longitude)
        if distance <= settings.DUPLICATE_LOCATION_THRESHOLD_METERS and (
            best_distance is None or distance < best_distance
        ):
            best, best_distance = candidate, distance

    if best is None:
        return None
    return best, best_distance


def record_duplicate(
    db: Session, master: Issue, new_issue: Issue, distance_m: float
) -> None:
    """Legacy helper maintained for backward compatibility."""
    master.duplicate_count += 1
    link = IssueDuplicate(
        master_issue_id=master.id,
        duplicate_issue_id=new_issue.id,
        similarity_score=1.0,
        distance_meters=distance_m,
        reason=f"Same category, within {settings.DUPLICATE_LOCATION_THRESHOLD_METERS:.0f}m",
    )
    db.add(link)
