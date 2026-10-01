from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_authority
from app.core.response import ok
from app.database.database import get_db
from app.database.models.user import User
from app.schemas.analytics import (
    ResolutionStats,
    HealthResponse,
    AnalyticsOverviewOut,
    WorkOrderAnalytics,
    SeverityCount,
    WardAnalyticsItem,
    CategoryCount,
    TrendPoint,
)
from app.services import analytics_service

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/overview")
def overview(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    data = analytics_service.analytics_overview(db, user=user)
    return ok(AnalyticsOverviewOut(**data).model_dump())


@router.get("/categories")
def categories(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    data = analytics_service.category_breakdown(db, user=user)
    return ok([CategoryCount(**item).model_dump() for item in data])


@router.get("/severity")
def severity(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    data = analytics_service.severity_distribution(db, user=user)
    return ok([SeverityCount(**item).model_dump() for item in data])


@router.get("/work-orders")
def work_orders(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    data = analytics_service.work_order_analytics(db, user=user)
    return ok(WorkOrderAnalytics(**data).model_dump())


@router.get("/wards")
def wards(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    data = analytics_service.ward_analytics(db, user=user)
    return ok([WardAnalyticsItem(**item).model_dump() for item in data])


@router.get("/trends")
def trends(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    data = analytics_service.weekly_trend(db, user=user)
    return ok([TrendPoint(**item).model_dump() for item in data])


@router.get("/resolution")
def resolution(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    return ok(ResolutionStats(**analytics_service.resolution_stats(db, user=user)).model_dump())


@router.get("/health")
def health(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    data = analytics_service.infrastructure_health(db, user=user)
    return ok(HealthResponse(city_health_score=data["city_health_score"], categories=data["categories"]).model_dump())
