import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.database.models.department import Department
from app.database.models.ward import Ward
from app.database.models.enums import WorkOrderStatus
from app.main import app


class TestAnalytics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

        def override_get_db():
            db = cls.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=cls.engine)
        app.dependency_overrides.clear()

    def setUp(self):
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

        # Seed wards and departments
        db = self.TestingSessionLocal()
        db.add(Department(id=1, name="Roads", description="Roads Dept"))
        db.add(Department(id=2, name="Electrical", description="Electrical Dept"))
        db.add(Ward(id=1, name="Ward 1", center_lat=23.25, center_lng=77.41, population=50000))
        db.add(Ward(id=2, name="Ward 2", center_lat=22.71, center_lng=75.85, population=45000))
        db.commit()
        db.close()

    def _register_and_get_token(self, name, email, role="officer", state="Madhya Pradesh", district="Bhopal"):
        self.client.post(
            "/api/v1/auth/register",
            json={
                "name": name,
                "email": email,
                "password": "Password123!",
                "role": role,
                "state": state,
                "district": district,
                "organization": f"{district or state or 'Municipal'} Authority",
            },
        )
        login_res = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "Password123!"},
        )
        return login_res.json()["data"]["access_token"]

    def _create_issue(self, citizen_token, state, district, category="Pothole", lat=23.25, lng=77.41):
        res = self.client.post(
            "/api/v1/issues",
            json={
                "description": f"Damaged {category} requiring field inspection",
                "latitude": lat,
                "longitude": lng,
                "state": state,
                "district": district,
                "ai_category": category,
            },
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        return int(res.json()["data"]["id"])

    def test_01_empty_analytics_dataset(self):
        """Empty database returns zero counts and 0.0% rates without errors."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal1@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        res = self.client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {bhopal_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]

        self.assertEqual(data["summary"]["total_reports"], 0)
        self.assertEqual(data["summary"]["open_issues"], 0)
        self.assertEqual(data["summary"]["resolved_issues"], 0)
        self.assertEqual(data["summary"]["resolution_rate"], 0.0)
        self.assertEqual(data["work_order_stats"]["total"], 0)
        self.assertEqual(data["work_order_stats"]["completion_rate"], 0.0)

    def test_02_analytics_overview_counts_and_resolution(self):
        """Creates open and resolved issues, verifies KPIs."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal2@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen User", "citizen2@example.com", "citizen")

        # 1. Create 3 issues
        issue_1 = self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole")
        issue_2 = self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Open Manhole")
        issue_3 = self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Streetlight")

        # Resolve issue_1
        self.client.patch(
            f"/api/v1/issues/{issue_1}",
            json={"status": "resolved"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )

        res = self.client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {bhopal_token}"})
        self.assertEqual(res.status_code, 200)
        summary = res.json()["data"]["summary"]

        self.assertEqual(summary["total_reports"], 3)
        self.assertEqual(summary["open_issues"], 2)
        self.assertEqual(summary["resolved_issues"], 1)
        self.assertEqual(summary["resolution_rate"], 33.3)

    def test_03_category_breakdown_official_8_classes(self):
        """Category breakdown includes all 8 official taxonomy classes."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal3@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen User", "citizen3@example.com", "citizen")

        self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole")
        self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole")
        self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Traffic Signal")

        res = self.client.get("/api/v1/analytics/categories", headers={"Authorization": f"Bearer {bhopal_token}"})
        self.assertEqual(res.status_code, 200)
        categories = res.json()["data"]

        cat_map = {c["name"]: c["value"] for c in categories}
        self.assertEqual(cat_map.get("Pothole"), 2)
        self.assertEqual(cat_map.get("Traffic Signal"), 1)
        self.assertEqual(cat_map.get("Drainage"), 0)
        self.assertEqual(len(categories), 8)

    def test_04_work_order_analytics_lifecycle(self):
        """Verifies work order workload across lifecycle statuses."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal4@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen User", "citizen4@example.com", "citizen")

        issue_1 = self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole")
        issue_2 = self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Road Crack")

        # Create Work Order 1 -> assigned -> in_progress -> completed -> verified
        wo_1_res = self.client.post(
            "/api/v1/work-orders",
            json={"issue_id": issue_1, "department_id": 1, "title": "Pothole fill"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        wo_1_id = wo_1_res.json()["data"]["id"]
        self.client.patch(f"/api/v1/work-orders/{wo_1_id}", json={"status": "in_progress"}, headers={"Authorization": f"Bearer {bhopal_token}"})
        self.client.patch(f"/api/v1/work-orders/{wo_1_id}", json={"status": "completed", "completion_notes": "Filled"}, headers={"Authorization": f"Bearer {bhopal_token}"})
        self.client.patch(f"/api/v1/work-orders/{wo_1_id}", json={"status": "verified"}, headers={"Authorization": f"Bearer {bhopal_token}"})

        # Create Work Order 2 -> pending
        self.client.post(
            "/api/v1/work-orders",
            json={"issue_id": issue_2, "department_id": 1, "title": "Crack seal"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )

        res = self.client.get("/api/v1/analytics/work-orders", headers={"Authorization": f"Bearer {bhopal_token}"})
        self.assertEqual(res.status_code, 200)
        wo_stats = res.json()["data"]

        self.assertEqual(wo_stats["total"], 2)
        self.assertEqual(wo_stats["pending"], 1)  # Created work order without assigned_to defaults to pending
        self.assertEqual(wo_stats["verified"], 1)
        self.assertEqual(wo_stats["completion_rate"], 50.0)

    def test_05_analytics_jurisdiction_scoping(self):
        """Bhopal authority sees only Bhopal analytics; Indore sees only Indore; Super Admin sees global."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal5@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        indore_token = self._register_and_get_token("Officer Indore", "indore5@gov.in", "officer", "Madhya Pradesh", "Indore")
        admin_token = self._register_and_get_token("Super Admin", "admin5@gov.in", "super_admin", "", "")
        citizen_token = self._register_and_get_token("Citizen User", "citizen5@example.com", "citizen")

        # Create 2 issues in Bhopal, 1 in Indore
        self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole", lat=23.25, lng=77.41)
        self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole", lat=23.25, lng=77.41)
        self._create_issue(citizen_token, "Madhya Pradesh", "Indore", "Streetlight", lat=22.71, lng=75.85)

        # Bhopal
        bhopal_res = self.client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {bhopal_token}"})
        self.assertEqual(bhopal_res.json()["data"]["summary"]["total_reports"], 2)

        # Indore
        indore_res = self.client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {indore_token}"})
        self.assertEqual(indore_res.json()["data"]["summary"]["total_reports"], 1)

        # Super Admin
        admin_res = self.client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(admin_res.json()["data"]["summary"]["total_reports"], 3)

    def test_06_citizen_forbidden(self):
        """Citizen role cannot access analytics endpoints (403)."""
        citizen_token = self._register_and_get_token("Citizen User", "citizen6@example.com", "citizen")
        res = self.client.get("/api/v1/analytics/overview", headers={"Authorization": f"Bearer {citizen_token}"})
        self.assertEqual(res.status_code, 403)


if __name__ == "__main__":
    unittest.main()
