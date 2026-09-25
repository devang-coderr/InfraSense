from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_authority
from app.core.response import ok
from app.database.database import get_db
from app.database.models.user import User
from app.schemas.analytics import ResolutionStats, HealthResponse
from app.services import analytics_service

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/categories")
def categories(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    return ok(analytics_service.category_breakdown(db))


@router.get("/trends")
def trends(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    return ok(analytics_service.weekly_trend(db))


@router.get("/resolution")
def resolution(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    return ok(ResolutionStats(**analytics_service.resolution_stats(db)))


@router.get("/health")
def health(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    data = analytics_service.infrastructure_health(db)
    return ok(HealthResponse(city_health_score=data["city_health_score"], categories=data["categories"]))
