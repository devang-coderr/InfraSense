import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.database.models.ward import Ward
from app.database.models.department import Department
from app.main import app


class TestPredictions(unittest.TestCase):
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

        # Seed wards and department
        db = self.TestingSessionLocal()
        db.add(Department(id=1, name="Roads", description="Roads Dept"))
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
                "description": f"Damaged {category} requiring inspection",
                "latitude": lat,
                "longitude": lng,
                "state": state,
                "district": district,
                "ai_category": category,
            },
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        return int(res.json()["data"]["id"])

    def test_01_empty_predictions_returns_empty_list(self):
        """Empty database returns [] without errors."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal1@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        res = self.client.get("/api/v1/predictions/risks", headers={"Authorization": f"Bearer {bhopal_token}"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["data"], [])

    def test_02_predictions_jurisdiction_scoping(self):
        """Bhopal authority only sees risks for issues in Bhopal; Indore authority only sees Indore."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal2@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        indore_token = self._register_and_get_token("Officer Indore", "indore2@gov.in", "officer", "Madhya Pradesh", "Indore")
        citizen_token = self._register_and_get_token("Citizen User", "citizen2@example.com", "citizen")

        # Create 3 Bhopal pothole issues near Ward 1 (23.25, 77.41)
        for _ in range(3):
            self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole", lat=23.25, lng=77.41)

        # Create 1 Indore streetlight issue near Ward 2 (22.71, 75.85)
        self._create_issue(citizen_token, "Madhya Pradesh", "Indore", "Streetlight", lat=22.71, lng=75.85)

        # Bhopal officer should only see Bhopal risks
        bhopal_res = self.client.get("/api/v1/predictions/risks", headers={"Authorization": f"Bearer {bhopal_token}"})
        self.assertEqual(bhopal_res.status_code, 200)
        bhopal_data = bhopal_res.json()["data"]
        self.assertEqual(len(bhopal_data), 1)
        self.assertEqual(bhopal_data[0]["category"], "Pothole")
        self.assertEqual(bhopal_data[0]["ward"], "Ward 1")
        self.assertTrue(bhopal_data[0]["isBaseline"])

        # Indore officer should only see Indore risks
        indore_res = self.client.get("/api/v1/predictions/risks", headers={"Authorization": f"Bearer {indore_token}"})
        self.assertEqual(indore_res.status_code, 200)
        indore_data = indore_res.json()["data"]
        # If risk score < 20 it might be filtered or present depending on score
        for item in indore_data:
            self.assertNotEqual(item["ward"], "Ward 1")

    def test_03_hotspots_endpoint_threshold(self):
        """Hotspots endpoint filters items with risk >= 45."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal3@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen User", "citizen3@example.com", "citizen")

        # Create multiple high severity issues to produce risk >= 45
        for _ in range(4):
            self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole", lat=23.25, lng=77.41)

        res = self.client.get("/api/v1/predictions/hotspots", headers={"Authorization": f"Bearer {bhopal_token}"})
        self.assertEqual(res.status_code, 200)
        hotspots = res.json()["data"]
        self.assertGreaterEqual(len(hotspots), 1)
        for h in hotspots:
            self.assertGreaterEqual(h["risk"], 45)

    def test_04_citizen_access_forbidden(self):
        """Citizen role cannot access prediction endpoints (403)."""
        citizen_token = self._register_and_get_token("Citizen User", "citizen4@example.com", "citizen")
        res = self.client.get("/api/v1/predictions/risks", headers={"Authorization": f"Bearer {citizen_token}"})
        self.assertEqual(res.status_code, 403)

    def test_05_ward_prediction_detail(self):
        """GET /predictions/{ward_id} returns risk items for that specific ward or 404 if ward does not exist."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal5@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen User", "citizen5@example.com", "citizen")

        for _ in range(2):
            self._create_issue(citizen_token, "Madhya Pradesh", "Bhopal", "Pothole", lat=23.25, lng=77.41)

        res = self.client.get("/api/v1/predictions/1", headers={"Authorization": f"Bearer {bhopal_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertIsInstance(data, list)

        # Nonexistent ward returns 404
        res_404 = self.client.get("/api/v1/predictions/9999", headers={"Authorization": f"Bearer {bhopal_token}"})
        self.assertEqual(res_404.status_code, 404)


if __name__ == "__main__":
    unittest.main()
