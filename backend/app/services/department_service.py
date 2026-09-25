"""
Department assignment (spec section 8). Rule-based.
The backend maps issue categories to responsible municipal departments.
"""
from sqlalchemy.orm import Session

from app.database.models.department import Department

CATEGORY_TO_DEPARTMENT: dict[str, str] = {
    "pothole": "Roads",
    "road crack": "Roads",
    "open manhole": "Roads",
    "bridge defect": "Roads",
    "footpath": "Roads",
    "sidewalk": "Roads",
    "streetlight": "Electrical",
    "street light": "Electrical",
    "traffic signal": "Traffic",
    "traffic": "Traffic",
    "garbage": "Sanitation",
    "waste": "Sanitation",
    "water leakage": "Water",
    "waterlogging": "Water",
    "pipe burst": "Water",
}

DEFAULT_DEPARTMENT = "Roads"


def resolve_department_name(category: str) -> str:
    return CATEGORY_TO_DEPARTMENT.get(category.strip().lower(), DEFAULT_DEPARTMENT)


def get_department_by_category(db: Session, category: str) -> Department | None:
    name = resolve_department_name(category)
    dept = db.query(Department).filter(Department.name == name).first()
    if not dept:
        # Fallback to any department or Roads if specific department not seeded
        dept = db.query(Department).first()
    return dept
