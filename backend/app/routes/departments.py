from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.response import ok
from app.database.database import get_db
from app.database.models.department import Department
from app.database.models.ward import Ward
from app.schemas.department import DepartmentOut, WardOut

router = APIRouter(prefix="/api/v1", tags=["departments"])


@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).all()
    return ok([DepartmentOut(id=d.id, name=d.name, description=d.description) for d in departments])


@router.get("/wards")
def list_wards(db: Session = Depends(get_db)):
    wards = db.query(Ward).all()
    return ok(
        [
            WardOut(id=w.id, name=w.name, center_lat=w.center_lat, center_lng=w.center_lng, population=w.population)
            for w in wards
        ]
    )


@router.get("/wards/{ward_id}")
def get_ward(ward_id: int, db: Session = Depends(get_db)):
    from app.core.exceptions import AppError

    ward = db.get(Ward, ward_id)
    if not ward:
        raise AppError("WARD_NOT_FOUND", "Ward not found.", 404)
    return ok(WardOut(id=ward.id, name=ward.name, center_lat=ward.center_lat, center_lng=ward.center_lng, population=ward.population))
