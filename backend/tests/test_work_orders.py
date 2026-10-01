import unittest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base
from app.database.database import get_db
from app.database.models.department import Department
from app.database.models.ward import Ward
from app.database.models.issue import Issue
from app.database.models.work_order import WorkOrder
from app.database.models.enums import UserRole, Severity, IssueStatus, WorkOrderStatus
from app.main import app


class TestWorkOrderManagement(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = TestingSessionLocal()

        for d in ["Roads", "Electrical", "Sanitation", "Water", "Traffic"]:
            self.db.add(Department(name=d, description=f"{d} Department"))
        self.db.add(Ward(name="Ward 1", center_lat=23.25, center_lng=77.41, population=50000))
        self.db.add(Ward(name="Ward 2", center_lat=22.71, center_lng=75.85, population=60000))
        self.db.commit()

        def override_get_db():
            try:
                yield self.db
            finally:
                pass

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def _register_and_get_token(self, name, email, role, state=None, district=None, dept="Roads"):
        self.client.post(
            "/api/v1/auth/register",
            json={
                "name": name,
                "email": email,
                "password": "Password123!",
                "role": role,
                "department_name": dept,
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

    def _create_issue(self, citizen_token, state, district, category="Pothole"):
        res = self.client.post(
            "/api/v1/issues",
            json={
                "description": f"Damaged {category} requiring field repair",
                "latitude": 23.25,
                "longitude": 77.41,
                "state": state,
                "district": district,
                "ai_category": category,
            },
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        return int(res.json()["data"]["id"])

    def test_01_create_work_order_valid_jurisdiction(self):
        """1. Create work order for valid jurisdiction issue."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        issue_id = self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole")

        res = self.client.post(
            "/api/v1/work-orders",
            json={
                "issue_id": issue_id,
                "department_id": 1,
                "title": "Fill highway crater",
                "description": "Deploy asphalt crew to seal 2m crater",
            },
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(data["issue_id"], issue_id)
        self.assertEqual(data["title"], "Fill highway crater")
        self.assertEqual(data["description"], "Deploy asphalt crew to seal 2m crater")
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["issue_district"], "Bhopal")

    def test_02_cross_jurisdiction_creation_blocked(self):
        """2. Cross-jurisdiction work order creation blocked (Bhopal officer creating on Indore issue)."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        indore_issue_id = self._create_issue(citizen_token, "Madhya Pradesh", "Indore", "Pothole")

        res = self.client.post(
            "/api/v1/work-orders",
            json={
                "issue_id": indore_issue_id,
                "department_id": 1,
                "title": "Unauthorized cross-district dispatch",
            },
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(res.status_code, 404)

    def test_03_work_orders_list_and_detail_respect_jurisdiction(self):
        """3, 4. List and detail endpoints respect jurisdiction boundaries."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        indore_token = self._register_and_get_token("Officer Indore", "indore@gov.in", "officer", "Madhya Pradesh", "Indore")
        super_token = self._register_and_get_token("Super Admin", "admin@gov.in", "super_admin")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        bhopal_issue_id = self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole")
        indore_issue_id = self._create_issue(citizen_token, "Madhya Pradesh", "Indore", "Drainage")

        # Create Bhopal WO
        b_wo = self.client.post(
            "/api/v1/work-orders",
            json={"issue_id": bhopal_issue_id, "department_id": 1, "title": "Bhopal WO"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        ).json()["data"]
        bhopal_wo_id = b_wo["id"]

        # Create Indore WO
        i_wo = self.client.post(
            "/api/v1/work-orders",
            json={"issue_id": indore_issue_id, "department_id": 3, "title": "Indore WO"},
            headers={"Authorization": f"Bearer {indore_token}"},
        ).json()["data"]
        indore_wo_id = i_wo["id"]

        # Bhopal officer list -> only Bhopal WO
        b_list = self.client.get("/api/v1/work-orders", headers={"Authorization": f"Bearer {bhopal_token}"}).json()["data"]
        self.assertEqual(len(b_list), 1)
        self.assertEqual(b_list[0]["id"], bhopal_wo_id)

        # Indore officer list -> only Indore WO
        i_list = self.client.get("/api/v1/work-orders", headers={"Authorization": f"Bearer {indore_token}"}).json()["data"]
        self.assertEqual(len(i_list), 1)
        self.assertEqual(i_list[0]["id"], indore_wo_id)

        # Super Admin list -> both WOs
        s_list = self.client.get("/api/v1/work-orders", headers={"Authorization": f"Bearer {super_token}"}).json()["data"]
        self.assertEqual(len(s_list), 2)

        # Bhopal officer getting Indore WO -> 404
        get_res = self.client.get(f"/api/v1/work-orders/{indore_wo_id}", headers={"Authorization": f"Bearer {bhopal_token}"})
        self.assertEqual(get_res.status_code, 404)

    def test_04_status_transitions_and_completion_verification(self):
        """5, 6, 7, 8. Valid transitions, invalid transition blocking, notes recording, and verification resolving issue."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        issue_id = self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Open Manhole")

        # Create WO (initial status: pending)
        wo_res = self.client.post(
            "/api/v1/work-orders",
            json={"issue_id": issue_id, "department_id": 1, "title": "Cover Manhole"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        wo_id = wo_res.json()["data"]["id"]

        # 1. Invalid jump: pending -> verified -> 422
        bad_jump = self.client.patch(
            f"/api/v1/work-orders/{wo_id}",
            json={"status": "verified"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(bad_jump.status_code, 422)

        # 2. Valid transition: pending -> in_progress
        start_res = self.client.patch(
            f"/api/v1/work-orders/{wo_id}",
            json={"status": "in_progress"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(start_res.status_code, 200)
        self.assertEqual(start_res.json()["data"]["status"], "in_progress")
        self.assertIsNotNone(start_res.json()["data"]["started_at"])

        # Check underlying issue is now in_progress
        issue = self.db.get(Issue, issue_id)
        self.assertEqual(issue.status, IssueStatus.IN_PROGRESS)

        # 3. Valid transition: in_progress -> completed with completion notes
        comp_res = self.client.patch(
            f"/api/v1/work-orders/{wo_id}",
            json={
                "status": "completed",
                "completion_notes": "Heavy cast iron lid installed and sealed with mortar.",
            },
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(comp_res.status_code, 200)
        self.assertEqual(comp_res.json()["data"]["status"], "completed")
        self.assertIsNotNone(comp_res.json()["data"]["completed_at"])
        self.assertEqual(
            comp_res.json()["data"]["completion_notes"],
            "Heavy cast iron lid installed and sealed with mortar.",
        )

        # 4. Valid transition: completed -> verified
        ver_res = self.client.patch(
            f"/api/v1/work-orders/{wo_id}",
            json={"status": "verified"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(ver_res.status_code, 200)
        self.assertEqual(ver_res.json()["data"]["status"], "verified")
        self.assertIsNotNone(ver_res.json()["data"]["verified_at"])

        # Check underlying issue is now resolved
        self.db.refresh(issue)
        self.assertEqual(issue.status, IssueStatus.RESOLVED)

    def test_05_cross_jurisdiction_mutation_blocked(self):
        """9. Unauthorized authority cannot mutate another jurisdiction's work order."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        indore_token = self._register_and_get_token("Officer Indore", "indore@gov.in", "officer", "Madhya Pradesh", "Indore")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        bhopal_issue_id = self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole")
        bhopal_wo = self.client.post(
            "/api/v1/work-orders",
            json={"issue_id": bhopal_issue_id, "department_id": 1, "title": "Bhopal WO"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        ).json()["data"]

        # Indore officer tries to mutate Bhopal work order -> 404
        mutate_res = self.client.patch(
            f"/api/v1/work-orders/{bhopal_wo['id']}",
            json={"status": "in_progress"},
            headers={"Authorization": f"Bearer {indore_token}"},
        )
        self.assertEqual(mutate_res.status_code, 404)

    def test_06_dashboard_work_order_metrics(self):
        """10. Authority dashboard metrics calculate work order counts with jurisdiction scoping."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        indore_token = self._register_and_get_token("Officer Indore", "indore@gov.in", "officer", "Madhya Pradesh", "Indore")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        b_issue_id = self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole")
        i_issue_id = self._create_issue(citizen_token, "Madhya Pradesh", "Indore", "Streetlight")

        # Bhopal creates 1 WO and sets in_progress
        b_wo = self.client.post(
            "/api/v1/work-orders",
            json={"issue_id": b_issue_id, "department_id": 1, "title": "Bhopal WO"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        ).json()["data"]
        self.client.patch(
            f"/api/v1/work-orders/{b_wo['id']}",
            json={"status": "in_progress"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )

        # Bhopal dashboard stats
        dash = self.client.get("/api/v1/authority/dashboard", headers={"Authorization": f"Bearer {bhopal_token}"}).json()["data"]
        self.assertEqual(dash["open_work_orders"], 1)
        self.assertEqual(dash["in_progress_work_orders"], 1)
        self.assertEqual(dash["completed_work_orders"], 0)

        # Indore dashboard stats
        indore_dash = self.client.get("/api/v1/authority/dashboard", headers={"Authorization": f"Bearer {indore_token}"}).json()["data"]
        self.assertEqual(indore_dash["open_work_orders"], 0)


if __name__ == "__main__":
    unittest.main()
