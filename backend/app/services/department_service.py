"""
Department assignment (spec section 8). Rule-based.
The backend maps issue categories to responsible municipal departments.
"""
from sqlalchemy.orm import Session

from app.database.models.department import Department

CATEGORY_TO_DEPARTMENT: dict[str, str] = {
    # Roads Department
    "pothole": "Roads",
    "road crack": "Roads",
    "road_crack": "Roads",
    "open manhole": "Roads",
    "open_manhole": "Roads",
    "manhole": "Roads",
    "bridge defect": "Roads",
    "footpath": "Roads",
    "sidewalk": "Roads",
    # Electrical Department
    "streetlight": "Electrical",
    "street light": "Electrical",
    "street_light": "Electrical",
    "lamp": "Electrical",
    # Traffic Department
    "traffic signal": "Traffic",
    "traffic_signal": "Traffic",
    "traffic light": "Traffic",
    "traffic": "Traffic",
    "signal": "Traffic",
    # Sanitation Department
    "garbage": "Sanitation",
    "waste": "Sanitation",
    "trash": "Sanitation",
    "rubbish": "Sanitation",
    # Water & Drainage Department
    "water leakage": "Water",
    "water_leakage": "Water",
    "water leak": "Water",
    "waterlogging": "Water",
    "pipe burst": "Water",
    "drainage": "Water",
    "drain": "Water",
    "blocked drain": "Water",
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
