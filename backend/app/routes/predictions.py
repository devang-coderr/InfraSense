from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_authority
from app.core.exceptions import AppError
from app.core.response import ok
from app.database.database import get_db
from app.database.models.user import User
from app.database.models.ward import Ward
from app.schemas.prediction import WardRiskOut
from app.services.prediction_service import compute_ward_risks

router = APIRouter(prefix="/api/v1/predictions", tags=["predictions"])


@router.get("/risks")
def risks(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    results = compute_ward_risks(db)
    return ok(
        [
            WardRiskOut(
                ward=r["ward"],
                category=r["category"],
                risk=r["risk"],
                window=r["window"],
                reasons=r["reasons"],
                recommendedActions=r["recommendedActions"],
                isBaseline=r["isBaseline"],
            ).model_dump()
            for r in results
        ]
    )


@router.get("/hotspots")
def hotspots(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    results = compute_ward_risks(db)
    top = [r for r in results if r["risk"] >= 45]
    return ok(top)


@router.get("/{ward_id}")
def ward_prediction(ward_id: int, user: User = Depends(require_authority), db: Session = Depends(get_db)):
    ward = db.get(Ward, ward_id)
    if not ward:
        raise AppError("WARD_NOT_FOUND", "Ward not found.", 404)
    results = [r for r in compute_ward_risks(db) if r["ward_id"] == ward_id]
    return ok(results)
