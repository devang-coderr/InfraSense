import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.database.models.department import Department
from app.database.models.ward import Ward
from app.main import app


class TestCitizenLifecycle(unittest.TestCase):
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
        db.commit()
        db.close()

    def _register_and_get_token(self, name, email, role="citizen", state="Madhya Pradesh", district="Bhopal"):
        self.client.post(
            "/api/v1/auth/register",
            json={
                "name": name,
                "email": email,
                "password": "Password123!",
                "role": role,
                "state": state,
                "district": district,
                "organization": f"{district or state or 'Municipal'} Authority" if role != "citizen" else None,
            },
        )
        login_res = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "Password123!"},
        )
        return login_res.json()["data"]["access_token"]

    def _create_issue(self, citizen_token, category="Pothole"):
        res = self.client.post(
            "/api/v1/issues",
            json={
                "description": f"Damaged {category} requiring field inspection",
                "latitude": 23.25,
                "longitude": 77.41,
                "state": "Madhya Pradesh",
                "district": "Bhopal",
                "ai_category": category,
            },
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        return int(res.json()["data"]["id"])

    def test_01_citizen_can_access_own_issue(self):
        """Citizen can access their own issue with AI and location metadata."""
        citizen_token = self._register_and_get_token("Citizen A", "citizen_a@example.com", "citizen")
        issue_id = self._create_issue(citizen_token, "Pothole")

        res = self.client.get(f"/api/v1/issues/{issue_id}", headers={"Authorization": f"Bearer {citizen_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(data["id"], str(issue_id))
        self.assertEqual(data["category"], "Pothole")
        self.assertEqual(data["ward"], "Ward 1")

    def test_02_citizen_cannot_access_other_citizen_issue(self):
        """Citizen A cannot access Citizen B's issue (404 Not Found for privacy)."""
        citizen_a_token = self._register_and_get_token("Citizen A", "cit_a2@example.com", "citizen")
        citizen_b_token = self._register_and_get_token("Citizen B", "cit_b2@example.com", "citizen")

        issue_id_b = self._create_issue(citizen_b_token, "Road Crack")

        # Citizen A tries to access Citizen B's issue
        res = self.client.get(f"/api/v1/issues/{issue_id_b}", headers={"Authorization": f"Bearer {citizen_a_token}"})
        self.assertEqual(res.status_code, 404)

    def test_03_citizen_list_issues_automatically_scoped_to_own(self):
        """Citizen calling GET /api/v1/issues automatically receives only their own issues."""
        citizen_a_token = self._register_and_get_token("Citizen A", "cit_a3@example.com", "citizen")
        citizen_b_token = self._register_and_get_token("Citizen B", "cit_b3@example.com", "citizen")

        self._create_issue(citizen_a_token, "Pothole")
        self._create_issue(citizen_a_token, "Streetlight")
        self._create_issue(citizen_b_token, "Open Manhole")

        res_a = self.client.get("/api/v1/issues", headers={"Authorization": f"Bearer {citizen_a_token}"})
        self.assertEqual(res_a.status_code, 200)
        items_a = res_a.json()["data"]["items"]
        self.assertEqual(len(items_a), 2)
        categories_a = [i["category"] for i in items_a]
        self.assertIn("Pothole", categories_a)
        self.assertIn("Streetlight", categories_a)
        self.assertNotIn("Open Manhole", categories_a)

    def test_04_work_order_field_action_transparency(self):
        """Citizen issue response includes citizen-safe work order field action metadata as it transitions."""
        officer_token = self._register_and_get_token("Officer Bhopal", "bhopal_off@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi_cit@example.com", "citizen")

        issue_id = self._create_issue(citizen_token, "Pothole")

        # Initially no work order
        res = self.client.get(f"/api/v1/issues/{issue_id}", headers={"Authorization": f"Bearer {citizen_token}"})
        self.assertIsNone(res.json()["data"]["work_order"])

        # Authority creates work order
        wo_res = self.client.post(
            "/api/v1/work-orders",
            json={"issue_id": issue_id, "department_id": 1, "title": "Asphalt patch"},
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        wo_id = wo_res.json()["data"]["id"]

        # Authority moves to in_progress
        self.client.patch(f"/api/v1/work-orders/{wo_id}", json={"status": "in_progress"}, headers={"Authorization": f"Bearer {officer_token}"})

        # Citizen checks issue -> should see in_progress work order and started_at
        res_progress = self.client.get(f"/api/v1/issues/{issue_id}", headers={"Authorization": f"Bearer {citizen_token}"})
        wo_data = res_progress.json()["data"]["work_order"]
        self.assertIsNotNone(wo_data)
        self.assertEqual(wo_data["status"], "in_progress")
        self.assertEqual(wo_data["department_name"], "Roads")
        self.assertIsNotNone(wo_data["started_at"])

        # Authority completes and verifies
        self.client.patch(
            f"/api/v1/work-orders/{wo_id}",
            json={"status": "completed", "completion_notes": "Filled crater with hot mix asphalt"},
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        self.client.patch(f"/api/v1/work-orders/{wo_id}", json={"status": "verified"}, headers={"Authorization": f"Bearer {officer_token}"})

        # Citizen checks issue -> should see verified work order, completion notes, and resolved issue status
        res_final = self.client.get(f"/api/v1/issues/{issue_id}", headers={"Authorization": f"Bearer {citizen_token}"})
        final_data = res_final.json()["data"]
        self.assertEqual(final_data["status"], "resolved")
        self.assertEqual(final_data["work_order"]["status"], "verified")
        self.assertEqual(final_data["work_order"]["completion_notes"], "Filled crater with hot mix asphalt")
        self.assertIsNotNone(final_data["work_order"]["verified_at"])


if __name__ == "__main__":
    unittest.main()
