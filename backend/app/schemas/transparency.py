from datetime import datetime
from pydantic import BaseModel


class DistrictTransparencyStats(BaseModel):
    district_name: str
    state: str | None = None
    total_reports: int
    resolved: int
    in_progress: int
    pending: int
    resolution_rate: float


class CategoryTransparencyStats(BaseModel):
    category: str
    total_reports: int
    resolved: int
    in_progress: int
    pending: int
    resolution_rate: float


class TransparencyOverviewOut(BaseModel):
    total_reports: int
    resolved: int
    in_progress: int
    pending: int
    resolution_rate: float
    category_filter: str | None = None
    last_updated: str | None = None
    districts: list[DistrictTransparencyStats]
    categories: list[CategoryTransparencyStats]
