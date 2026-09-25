import io
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base
from app.database.database import get_db
from app.database.models.department import Department
from app.main import app


class TestIssues(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = TestingSessionLocal()

        # Seed required departments
        deps = ["Roads", "Electrical", "Sanitation", "Water", "Traffic"]
        for d in deps:
            self.db.add(Department(name=d, description=f"{d} Department"))
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

    def _register_and_login(self, email, role="citizen"):
        self.client.post(
            "/api/v1/auth/register",
            json={"name": email.split("@")[0], "email": email, "password": "Password123!", "role": role},
        )
        login = self.client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
        return login.json()["data"]["access_token"]

    def test_create_issue_runs_full_pipeline(self):
        token = self._register_and_login("citizen1@example.com")
        resp = self.client.post(
            "/api/v1/issues",
            json={"description": "Large pothole near school gate", "latitude": 22.7196, "longitude": 75.8577},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertTrue(data["category"])  # Category resolved
        self.assertIn(data["severity"].lower(), ["low", "medium", "high", "critical"])
        self.assertEqual(data["department"], "Roads")  # "pothole" -> Roads
        self.assertEqual(data["status"].lower(), "ai_verified")  # Initial status not resolved/closed
        self.assertIsNotNone(data["priorityScore"])  # Priority calculated

    def test_create_issue_with_media_link(self):
        token = self._register_and_login("citizen_media@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Upload media first
        fake_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
        files = {"file": ("pothole.jpg", io.BytesIO(fake_jpg), "image/jpeg")}
        upload_resp = self.client.post("/api/v1/media/upload", files=files, headers=headers)
        self.assertEqual(upload_resp.status_code, 200)
        media_id = upload_resp.json()["data"]["media_id"]

        # Create issue linking media_id
        issue_resp = self.client.post(
            "/api/v1/issues",
            json={"description": "Damaged road pothole", "latitude": 22.7196, "longitude": 75.8577, "media_id": media_id},
            headers=headers,
        )
        self.assertEqual(issue_resp.status_code, 200)
        issue_data = issue_resp.json()["data"]
        self.assertEqual(issue_data["media_id"], media_id)
        self.assertTrue(issue_data["media_url"] or issue_data["file_url"])

        # Fetch issue details
        get_resp = self.client.get(f"/api/v1/issues/{issue_data['id']}", headers=headers)
        self.assertEqual(get_resp.status_code, 200)
        detail = get_resp.json()["data"]
        self.assertEqual(detail["media_id"], media_id)
        self.assertTrue(detail["media_url"] or detail["file_url"])

    def test_create_issue_requires_auth(self):
        resp = self.client.post(
            "/api/v1/issues",
            json={"description": "pothole", "latitude": 22.7196, "longitude": 75.8577},
        )
        self.assertEqual(resp.status_code, 401)

    def test_duplicate_detection_merges_nearby_reports(self):
        token = self._register_and_login("citizen2@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"description": "pothole near gate", "latitude": 22.7196, "longitude": 75.8577}

        first = self.client.post("/api/v1/issues", json=payload, headers=headers).json()["data"]
        # second report a few metres away, same category -> should merge into first
        second_payload = {**payload, "latitude": 22.71965, "longitude": 75.85775}
        self.client.post("/api/v1/issues", json=second_payload, headers=headers)

        refreshed = self.client.get(f"/api/v1/issues/{first['id']}", headers=headers).json()["data"]
        self.assertGreaterEqual(refreshed["duplicateCount"], 1)

    def test_duplicate_detection_does_not_crash_missing_coords(self):
        token = self._register_and_login("citizen_nocoords@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"description": "water leakage issue without location", "latitude": None, "longitude": None}
        resp = self.client.post("/api/v1/issues", json=payload, headers=headers)
        self.assertEqual(resp.status_code, 200)

    def test_coordinates_persisted(self):
        token = self._register_and_login("citizen_coords@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"description": "Street light broken", "latitude": 12.9716, "longitude": 77.5946}
        resp = self.client.post("/api/v1/issues", json=payload, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertAlmostEqual(data["lat"], 12.9716)
        self.assertAlmostEqual(data["lng"], 77.5946)

    def test_department_assignment_garbage(self):
        token = self._register_and_login("citizen_garbage@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"description": "Massive garbage pile dumping site", "latitude": 22.7, "longitude": 75.8}
        resp = self.client.post("/api/v1/issues", json=payload, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertEqual(data["department"], "Sanitation")

    def test_citizen_cannot_access_authority_dashboard(self):
        token = self._register_and_login("citizen3@example.com")
        resp = self.client.get("/api/v1/authority/dashboard", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(resp.status_code, 403)

    def test_officer_can_access_authority_dashboard(self):
        token = self._register_and_login("officer1@example.com", role="officer")
        resp = self.client.get("/api/v1/authority/dashboard", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(resp.status_code, 200)
        self.assertIn("total_issues", resp.json()["data"])

    def test_issue_filters_by_status(self):
        token = self._register_and_login("citizen4@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        self.client.post(
            "/api/v1/issues",
            json={"description": "garbage pile", "latitude": 22.69, "longitude": 75.84},
            headers=headers,
        )
        resp = self.client.get("/api/v1/issues?status=ai_verified", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(resp.json()["data"]["total"], 1)


if __name__ == "__main__":
    unittest.main()

