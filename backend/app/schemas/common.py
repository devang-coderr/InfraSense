from pydantic import BaseModel


class SeverityFactorOut(BaseModel):
    label: str
    score: int
    max: int


class PriorityFactorOut(BaseModel):
    label: str
    score: int
    max: int
