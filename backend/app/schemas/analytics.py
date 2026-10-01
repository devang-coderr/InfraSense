from pydantic import BaseModel


class CategoryCount(BaseModel):
    name: str
    value: int


class TrendPoint(BaseModel):
    week: str
    reports: int


class ResolutionStats(BaseModel):
    total_issues: int
    resolved_issues: int
    resolution_rate: float
    average_resolution_days: float


class SeverityCount(BaseModel):
    severity: str
    label: str
    count: int
    color: str


class WorkOrderAnalytics(BaseModel):
    total: int
    pending: int
    assigned: int
    in_progress: int
    completed: int
    verified: int
    completion_rate: float


class WardAnalyticsItem(BaseModel):
    ward: str
    total_issues: int
    open_issues: int
    resolved_issues: int


class AnalyticsSummary(BaseModel):
    total_reports: int
    open_issues: int
    resolved_issues: int
    critical_issues: int
    high_priority_issues: int
    resolution_rate: float
    average_resolution_days: float


class HealthCategoryOut(BaseModel):
    label: str
    score: int


class HealthResponse(BaseModel):
    city_health_score: int
    categories: list[HealthCategoryOut]
    methodology: str = (
        "Heuristic: 100 minus a weighted penalty per unresolved issue in the "
        "category (critical=-14, high=-8, medium=-4, low=-1), floored at 0. "
        "This is a project scoring heuristic, not a validated infrastructure "
        "index."
    )


class AnalyticsOverviewOut(BaseModel):
    summary: AnalyticsSummary
    severity_distribution: list[SeverityCount]
    category_breakdown: list[CategoryCount]
    work_order_stats: WorkOrderAnalytics
    ward_breakdown: list[WardAnalyticsItem]
    trends: list[TrendPoint]
    health: HealthResponse


class AuthorityDashboardOut(BaseModel):
    total_issues: int
    critical_issues: int
    pending_issues: int
    resolved_issues: int
    average_resolution_days: float
    infrastructure_health: int
    open_work_orders: int = 0
    in_progress_work_orders: int = 0
    completed_work_orders: int = 0
