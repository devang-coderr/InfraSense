from pydantic import BaseModel


class DepartmentOut(BaseModel):
    id: int
    name: str
    description: str | None = None


class WardOut(BaseModel):
    id: int
    name: str
    center_lat: float
    center_lng: float
    population: int | None = None
