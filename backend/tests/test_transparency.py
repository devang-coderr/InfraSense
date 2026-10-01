import unittest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import get_db, Base
from app.database.models.enums import IssueStatus, Severity, UserRole
from app.database.models.issue import Issue
from app.database.models.user import User
from app.main import app


class TestTransparency(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = TestingSessionLocal()

        def override_get_db():
            try:
                yield self.db
            finally:
                pass

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        # Create a citizen reporter
        self.citizen = User(
            name="Citizen One",
            email="citizen@example.com",
            password_hash="secret",
            role=UserRole.CITIZEN,
        )
        self.db.add(self.citizen)
        self.db.commit()
        self.db.refresh(self.citizen)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_empty_database_returns_valid_zero_stats(self):
        """When there are no reports, endpoint returns 0 totals and 0.0 resolution rate without crashing."""
        resp = self.client.get("/api/v1/transparency/stats")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]

        self.assertEqual(data["total_reports"], 0)
        self.assertEqual(data["resolved"], 0)
        self.assertEqual(data["in_progress"], 0)
        self.assertEqual(data["pending"], 0)
        self.assertEqual(data["resolution_rate"], 0.0)
        self.assertEqual(data["districts"], [])
        self.assertIsNone(data["category_filter"])
        self.assertIn("last_updated", data)
        self.assertIn("categories", data)
        self.assertEqual(len(data["categories"]), 8)

    def test_multi_district_and_status_aggregation(self):
        """Verify district-level counting, status categorization, and resolution rate."""
        now = datetime.now(timezone.utc)

        # Bhopal issues: 3 total (2 resolved, 1 in_progress) -> 66.7% resolution rate
        self.db.add(Issue(
            title="Pothole", category="Pothole", description="P1",
            reported_by=self.citizen.id, latitude=23.25, longitude=77.41,
            state="Madhya Pradesh", district="Bhopal",
            status=IssueStatus.RESOLVED, severity=Severity.HIGH, reported_at=now
        ))
        self.db.add(Issue(
            title="Road Crack", category="Road Crack", description="P2",
            reported_by=self.citizen.id, latitude=23.25, longitude=77.41,
            state="Madhya Pradesh", district="Bhopal",
            status=IssueStatus.RESOLVED, severity=Severity.MEDIUM, reported_at=now
        ))
        self.db.add(Issue(
            title="Streetlight", category="Streetlight", description="P3",
            reported_by=self.citizen.id, latitude=23.25, longitude=77.41,
            state="Madhya Pradesh", district="Bhopal",
            status=IssueStatus.IN_PROGRESS, severity=Severity.LOW, reported_at=now
        ))

        # Indore issues: 2 total (1 in_progress, 1 reported/pending) -> 0.0% resolution rate
        self.db.add(Issue(
            title="Garbage", category="Garbage", description="P4",
            reported_by=self.citizen.id, latitude=22.71, longitude=75.85,
            state="Madhya Pradesh", district="Indore",
            status=IssueStatus.IN_PROGRESS, severity=Severity.MEDIUM, reported_at=now
        ))
        self.db.add(Issue(
            title="Open Manhole", category="Open Manhole", description="P5",
            reported_by=self.citizen.id, latitude=22.71, longitude=75.85,
            state="Madhya Pradesh", district="Indore",
            status=IssueStatus.REPORTED, severity=Severity.CRITICAL, reported_at=now
        ))

        self.db.commit()

        resp = self.client.get("/api/v1/transparency/stats")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]

        self.assertEqual(data["total_reports"], 5)
        self.assertEqual(data["resolved"], 2)
        self.assertEqual(data["in_progress"], 2)
        self.assertEqual(data["pending"], 1)
        self.assertEqual(data["resolution_rate"], 40.0)

        districts = data["districts"]
        self.assertEqual(len(districts), 2)

        # Bhopal
        bhopal = next(d for d in districts if d["district_name"] == "Bhopal")
        self.assertEqual(bhopal["total_reports"], 3)
        self.assertEqual(bhopal["resolved"], 2)
        self.assertEqual(bhopal["in_progress"], 1)
        self.assertEqual(bhopal["pending"], 0)
        self.assertEqual(bhopal["resolution_rate"], 66.7)

        # Indore
        indore = next(d for d in districts if d["district_name"] == "Indore")
        self.assertEqual(indore["total_reports"], 2)
        self.assertEqual(indore["resolved"], 0)
        self.assertEqual(indore["in_progress"], 1)
        self.assertEqual(indore["pending"], 1)
        self.assertEqual(indore["resolution_rate"], 0.0)

    def test_category_filter_param(self):
        """Category query parameter filters results properly."""
        now = datetime.now(timezone.utc)

        self.db.add(Issue(
            title="Pothole", category="Pothole", description="Pothole 1",
            reported_by=self.citizen.id, latitude=23.25, longitude=77.41,
            state="Madhya Pradesh", district="Bhopal",
            status=IssueStatus.RESOLVED, severity=Severity.HIGH, reported_at=now
        ))
        self.db.add(Issue(
            title="Streetlight", category="Streetlight", description="Light 1",
            reported_by=self.citizen.id, latitude=23.25, longitude=77.41,
            state="Madhya Pradesh", district="Bhopal",
            status=IssueStatus.IN_PROGRESS, severity=Severity.LOW, reported_at=now
        ))
        self.db.commit()

        # Query only Pothole
        resp = self.client.get("/api/v1/transparency/stats?category=Pothole")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]

        self.assertEqual(data["total_reports"], 1)
        self.assertEqual(data["resolved"], 1)
        self.assertEqual(data["in_progress"], 0)
        self.assertEqual(data["pending"], 0)
        self.assertEqual(data["resolution_rate"], 100.0)
        self.assertEqual(data["category_filter"], "Pothole")

    def test_public_endpoint_privacy_no_pii_exposed(self):
        """Ensure endpoint is publicly accessible without Auth and does not leak citizen PII."""
        resp = self.client.get("/api/v1/transparency/stats")
        self.assertEqual(resp.status_code, 200)
        raw_text = resp.text

        # Verify no citizen private data leaks
        self.assertNotIn("citizen@example.com", raw_text)
        self.assertNotIn("password_hash", raw_text)
        self.assertNotIn("secret", raw_text)
        self.assertNotIn("reported_by", raw_text)


if __name__ == "__main__":
    unittest.main()
