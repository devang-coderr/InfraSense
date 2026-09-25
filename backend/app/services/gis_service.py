"""
GIS service — WITHOUT PostGIS (spec section 15, scoped down).

WHY NO POSTGIS: PostGIS is a real Postgres extension that needs to be
installed/enabled separately, which is a significant hurdle for a
Windows beginner setting this up for the first time (see README, "Do not
overengineer" spec section 51). Everything here works on plain
SQLite/Postgres using ordinary lat/lng float columns and the haversine
formula computed in Python. It's accurate enough for a city-scale MVP.

UPGRADE PATH: if you later add PostGIS, replace `haversine_meters` calls
with a `ST_DWithin` SQL query and replace `nearest_ward` with
`ST_Contains(ward.boundary, point)` — the function signatures below can
stay the same so routes/services don't need to change.
"""
import math

from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.models.issue import Issue
from app.database.models.ward import Ward

EARTH_RADIUS_M = 6_371_000


def haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def nearest_ward(db: Session, lat: float, lng: float) -> Ward | None:
    wards = db.query(Ward).all()
    if not wards:
        return None
    return min(wards, key=lambda w: haversine_meters(lat, lng, w.center_lat, w.center_lng))


def nearby_issues(db: Session, lat: float, lng: float, radius_m: float, exclude_issue_id: int | None = None):
    """
    Simple MVP approach: pull recent issues and filter by real distance in
    Python. Fine at city/college-project scale; if the table grows large,
    first filter with a cheap lat/lng bounding-box WHERE clause before the
    precise haversine check (or move to PostGIS ST_DWithin).
    """
    query = db.query(Issue)
    if exclude_issue_id is not None:
        query = query.filter(Issue.id != exclude_issue_id)
    results = []
    for issue in query.all():
        dist = haversine_meters(lat, lng, issue.latitude, issue.longitude)
        if dist <= radius_m:
            results.append((issue, dist))
    results.sort(key=lambda pair: pair[1])
    return results


def map_xy(lat: float, lng: float) -> tuple[float, float]:
    """
    Converts a lat/lng into the 0-100 x/y the frontend's stylised
    CSS/SVG GIS view (`components/authority/GISMap.tsx`) expects. This is
    a cosmetic normalisation against a configured city bounding box, NOT a
    real map projection — see CITY_LAT_MIN/MAX in core/config.py.
    """
    lat_span = settings.CITY_LAT_MAX - settings.CITY_LAT_MIN
    lng_span = settings.CITY_LNG_MAX - settings.CITY_LNG_MIN

    x = (lng - settings.CITY_LNG_MIN) / lng_span * 100 if lng_span else 50
    # Latitude increases northward but screen y increases downward, so invert.
    y = (settings.CITY_LAT_MAX - lat) / lat_span * 100 if lat_span else 50

    return round(max(0, min(100, x)), 1), round(max(0, min(100, y)), 1)
