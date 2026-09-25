"""
Development seed script (spec section 35).

Run with:  python seed.py
(after `alembic upgrade head` has created the tables)

Creates: 5 departments, 4 wards, one admin/officer/citizen test account
each, and a handful of sample issues so the dashboards aren't empty.

IMPORTANT: the credentials below are for LOCAL DEVELOPMENT ONLY. Change
or remove them before any real deployment — see README "Security checklist".
"""
from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.database.database import SessionLocal
from app.database.models import Base
from app.database.database import engine
from app.database.models.department import Department
from app.database.models.ward import Ward
from app.database.models.user import User
from app.database.models.enums import UserRole, Severity, IssueStatus
from app.database.models.issue import Issue, IssueSeverityFactor, IssuePriorityFactor
from app.services.gis_service import nearest_ward

DEPARTMENTS = ["Roads", "Electrical", "Sanitation", "Water", "Traffic"]

WARDS = [
    {"name": "Ward 1", "center_lat": 22.7196, "center_lng": 75.8577, "population": 42000},
    {"name": "Ward 5", "center_lat": 22.7300, "center_lng": 75.8700, "population": 38000},
    {"name": "Ward 12", "center_lat": 22.6900, "center_lng": 75.8400, "population": 51000},
    {"name": "Ward 20", "center_lat": 22.7500, "center_lng": 75.8900, "population": 29500},
]

SAMPLE_ISSUES = [
    {"category": "Pothole", "lat": 22.7196, "lng": 75.8577, "severity": Severity.HIGH, "severity_score": 78, "days_ago": 2},
    {"category": "Streetlight", "lat": 22.7300, "lng": 75.8700, "severity": Severity.MEDIUM, "severity_score": 48, "days_ago": 5},
    {"category": "Garbage", "lat": 22.6900, "lng": 75.8400, "severity": Severity.LOW, "severity_score": 25, "days_ago": 1},
    {"category": "Open Manhole", "lat": 22.7205, "lng": 75.8585, "severity": Severity.CRITICAL, "severity_score": 91, "days_ago": 0},
    {"category": "Water Leakage", "lat": 22.7500, "lng": 75.8900, "severity": Severity.HIGH, "severity_score": 70, "days_ago": 8},
]


def run():
    Base.metadata.create_all(bind=engine)  # harmless no-op if alembic already created tables
    db = SessionLocal()
    try:
        if db.query(Department).count() == 0:
            for name in DEPARTMENTS:
                db.add(Department(name=name, description=f"{name} department"))
            db.commit()
            print(f"Created {len(DEPARTMENTS)} departments")

        if db.query(Ward).count() == 0:
            for w in WARDS:
                db.add(Ward(**w))
            db.commit()
            print(f"Created {len(WARDS)} wards")

        if db.query(User).filter(User.email == "admin@infrasense.test").count() == 0:
            roads_dept = db.query(Department).filter(Department.name == "Roads").first()
            users = [
                User(
                    name="Super Admin",
                    email="admin@infrasense.test",
                    password_hash=hash_password("Password123!"),
                    role=UserRole.SUPER_ADMIN,
                ),
                User(
                    name="Roads Officer",
                    email="officer@infrasense.test",
                    password_hash=hash_password("Password123!"),
                    role=UserRole.OFFICER,
                    department_id=roads_dept.id if roads_dept else None,
                ),
                User(
                    name="Test Citizen",
                    email="citizen@infrasense.test",
                    password_hash=hash_password("Password123!"),
                    role=UserRole.CITIZEN,
                ),
            ]
            db.add_all(users)
            db.commit()
            print("Created 3 test accounts (see README for credentials)")

        if db.query(Issue).count() == 0:
            citizen = db.query(User).filter(User.email == "citizen@infrasense.test").first()
            dept_by_category = {
                "Pothole": "Roads", "Open Manhole": "Roads", "Streetlight": "Electrical",
                "Garbage": "Sanitation", "Water Leakage": "Water",
            }
            for sample in SAMPLE_ISSUES:
                ward = nearest_ward(db, sample["lat"], sample["lng"])
                dept_name = dept_by_category.get(sample["category"], "Roads")
                dept = db.query(Department).filter(Department.name == dept_name).first()

                issue = Issue(
                    title=sample["category"],
                    category=sample["category"],
                    description=f"Sample seeded {sample['category'].lower()} report.",
                    image_description=f"Seed data — {sample['category']}",
                    reported_by=citizen.id,
                    latitude=sample["lat"],
                    longitude=sample["lng"],
                    ward_id=ward.id if ward else None,
                    severity=sample["severity"],
                    severity_score=sample["severity_score"],
                    priority_score=min(100, sample["severity_score"] + 5),
                    confidence=75,
                    status=IssueStatus.AI_VERIFIED,
                    department_id=dept.id if dept else None,
                    duplicate_count=0,
                    reported_at=datetime.now(timezone.utc) - timedelta(days=sample["days_ago"]),
                )
                db.add(issue)
                db.flush()
                db.add(IssueSeverityFactor(issue_id=issue.id, label="Damage size", score=30, max=35))
                db.add(IssuePriorityFactor(issue_id=issue.id, label="Severity", score=23, max=30))
            db.commit()
            print(f"Created {len(SAMPLE_ISSUES)} sample issues")

        print("\nSeed complete. Test accounts (LOCAL DEV ONLY — change before production):")
        print("  admin@infrasense.test    / Password123!  (super_admin)")
        print("  officer@infrasense.test  / Password123!  (officer, Roads dept)")
        print("  citizen@infrasense.test  / Password123!  (citizen)")
    finally:
        db.close()


if __name__ == "__main__":
    run()
