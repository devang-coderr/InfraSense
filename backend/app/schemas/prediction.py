from pydantic import BaseModel


class WardRiskOut(BaseModel):
    """Field names match the frontend's WardRisk interface in lib/types.ts."""

    ward: str
    category: str
    risk: int
    window: str
    reasons: list[str]
    recommendedActions: list[str]
    isBaseline: bool = True
