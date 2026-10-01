from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.response import ok
from app.database.database import get_db
from app.schemas.transparency import TransparencyOverviewOut
from app.services import transparency_service

router = APIRouter(prefix="/api/v1/transparency", tags=["transparency"])


@router.get("/stats")
def get_transparency_stats(
    category: str | None = Query(default=None, description="Filter statistics by infrastructure category"),
    state: str | None = Query(default=None, description="Filter statistics by state"),
    db: Session = Depends(get_db),
):
    """
    Public-facing transparency endpoint.
    Returns aggregate infrastructure report counts, status distributions,
    and resolution rates across districts and categories without exposing private data.
    """
    data = transparency_service.get_public_transparency_stats(
        db,
        category=category,
        state=state,
    )
    return ok(TransparencyOverviewOut(**data).model_dump())
