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


class AuthorityDashboardOut(BaseModel):
    total_issues: int
    critical_issues: int
    pending_issues: int
    resolved_issues: int
    average_resolution_days: float
    infrastructure_health: int
