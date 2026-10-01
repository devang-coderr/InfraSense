import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base
from app.database.database import get_db
from app.database.models.department import Department
from app.database.models.ward import Ward
from app.database.models.issue import Issue
from app.database.models.enums import UserRole, Severity, IssueStatus
from app.main import app


class TestAuthorityJurisdiction(unittest.TestCase):
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
        login = self.client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
        return login.json()["data"]["access_token"]

    def _create_issue(self, token, description, state=None, district=None, lat=23.25, lng=77.41):
        headers = {"Authorization": f"Bearer {token}"}
        resp = self.client.post(
            "/api/v1/issues",
            json={
                "description": description,
                "latitude": lat,
                "longitude": lng,
                "state": state,
                "district": district,
            },
            headers=headers,
        )
        self.assertEqual(resp.status_code, 200)
        return resp.json()["data"]

    def test_authority_jurisdiction_scoping_and_security(self):
        # 1. Register test users
        citizen_token = self._register_and_get_token("Citizen Dave", "dave@example.com", "citizen")
        bhopal_auth_token = self._register_and_get_token(
            "Officer Bhopal", "bhopal.officer@infrasense.gov", "officer", state="Madhya Pradesh", district="Bhopal"
        )
        indore_auth_token = self._register_and_get_token(
            "Officer Indore", "indore.officer@infrasense.gov", "officer", state="Madhya Pradesh", district="Indore"
        )
        super_admin_token = self._register_and_get_token(
            "Admin Global", "admin@infrasense.gov", "super_admin"
        )

        # 2. Create issues across different jurisdictions
        # Issue 1: Bhopal, MP
        issue_bhopal = self._create_issue(
            citizen_token, "Pothole on VIP Road Bhopal", state="Madhya Pradesh", district="Bhopal", lat=23.2599, lng=77.4126
        )
        # Issue 2: Indore, MP
        issue_indore = self._create_issue(
            citizen_token, "Road crack on AB Road Indore", state="Madhya Pradesh", district="Indore", lat=22.7196, lng=75.8577
        )
        # Issue 3: Delhi (Different State)
        issue_delhi = self._create_issue(
            citizen_token, "Garbage dump near Connaught Place", state="Delhi", district="New Delhi", lat=28.6139, lng=77.2090
        )
        # Issue 4: Legacy issue without state/district (NULL)
        issue_legacy = self._create_issue(
            citizen_token, "Old unassigned pothole report", state=None, district=None, lat=0.0, lng=0.0
        )

        bhopal_headers = {"Authorization": f"Bearer {bhopal_auth_token}"}
        indore_headers = {"Authorization": f"Bearer {indore_auth_token}"}
        admin_headers = {"Authorization": f"Bearer {super_admin_token}"}
        citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

        # Scenario A: Bhopal Authority accessing Bhopal Issue -> 200 OK
        resp = self.client.get(f"/api/v1/authority/issues/{issue_bhopal['id']}", headers=bhopal_headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["data"]["id"], issue_bhopal["id"])

        # Scenario B: Bhopal Authority accessing Indore Issue -> 404 (Blocked)
        resp = self.client.get(f"/api/v1/authority/issues/{issue_indore['id']}", headers=bhopal_headers)
        self.assertEqual(resp.status_code, 404)

        # Scenario C: Bhopal Authority accessing Delhi Issue -> 404 (Blocked)
        resp = self.client.get(f"/api/v1/authority/issues/{issue_delhi['id']}", headers=bhopal_headers)
        self.assertEqual(resp.status_code, 404)

        # Scenario D: Citizen owns all issues -> Citizen can still access all their own reports
        resp = self.client.get(f"/api/v1/issues/{issue_bhopal['id']}", headers=citizen_headers)
        self.assertEqual(resp.status_code, 200)
        resp = self.client.get(f"/api/v1/issues/{issue_indore['id']}", headers=citizen_headers)
        self.assertEqual(resp.status_code, 200)

        # Scenario E: Authority Issue List is strictly jurisdiction-scoped
        resp = self.client.get("/api/v1/authority/issues", headers=bhopal_headers)
        self.assertEqual(resp.status_code, 200)
        items = resp.json()["data"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["id"], issue_bhopal["id"])

        resp = self.client.get("/api/v1/authority/issues", headers=indore_headers)
        self.assertEqual(resp.status_code, 200)
        items = resp.json()["data"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["id"], issue_indore["id"])

        # Scenario F: Authority Dashboard counts are jurisdiction-scoped
        resp = self.client.get("/api/v1/authority/dashboard", headers=bhopal_headers)
        self.assertEqual(resp.status_code, 200)
        dash = resp.json()["data"]
        self.assertEqual(dash["total_issues"], 1)

        resp = self.client.get("/api/v1/authority/dashboard", headers=indore_headers)
        self.assertEqual(resp.status_code, 200)
        dash = resp.json()["data"]
        self.assertEqual(dash["total_issues"], 1)

        # Scenario G: Authority GIS map contains only jurisdiction issues
        resp = self.client.get("/api/v1/authority/map", headers=bhopal_headers)
        self.assertEqual(resp.status_code, 200)
        map_items = resp.json()["data"]
        self.assertEqual(len(map_items), 1)
        self.assertEqual(map_items[0]["id"], issue_bhopal["id"])

        # Scenario H: Authority Priority Queue contains only jurisdiction issues
        resp = self.client.get("/api/v1/authority/priority", headers=bhopal_headers)
        self.assertEqual(resp.status_code, 200)
        pq_items = resp.json()["data"]
        self.assertEqual(len(pq_items), 1)
        self.assertEqual(pq_items[0]["id"], issue_bhopal["id"])

        # Scenario I: Analytics is jurisdiction-scoped
        resp = self.client.get("/api/v1/analytics/categories", headers=bhopal_headers)
        self.assertEqual(resp.status_code, 200)
        cats = resp.json()["data"]
        self.assertEqual(sum(c["value"] for c in cats), 1)

        # Scenario J: Super Admin has global access to all 4 issues
        resp = self.client.get("/api/v1/authority/issues", headers=admin_headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()["data"]), 4)

        # Scenario K: Cross-jurisdiction patch is blocked
        resp = self.client.patch(
            f"/api/v1/issues/{issue_indore['id']}",
            json={"status": "in_progress"},
            headers=bhopal_headers,
        )
        self.assertEqual(resp.status_code, 404)


if __name__ == "__main__":
    unittest.main()
