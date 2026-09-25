import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base
from app.database.database import get_db
from app.database.models.department import Department
from app.main import app


class TestAIStaleFix(unittest.TestCase):
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

    def _get_token(self):
        self.client.post(
            "/api/v1/auth/register",
            json={"name": "Tester", "email": "tester@example.com", "password": "Password123!", "role": "citizen"},
        )
        login = self.client.post("/api/v1/auth/login", json={"email": "tester@example.com", "password": "Password123!"})
        return login.json()["data"]["access_token"]

    def test_stale_ai_category_override_prevented(self):
        token = self._get_token()
        headers = {"Authorization": f"Bearer {token}"}
        # Simulate payload where client sends stale ai_category="Pothole" but final description="street light damage."
        resp = self.client.post(
            "/api/v1/issues",
            json={
                "description": "street light damage.",
                "latitude": 22.7196,
                "longitude": 75.8577,
                "ai_category": "Pothole",
                "ai_confidence": 85,
            },
            headers=headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertEqual(data["category"], "Streetlight")
        self.assertEqual(data["description"], "street light damage.")

    def test_non_streetlight_baseline_categories(self):
        token = self._get_token()
        headers = {"Authorization": f"Bearer {token}"}
        cases = [
            ("pothole on main road", "Pothole"),
            ("road crack near sidewalk", "Road Crack"),
            ("street light damage.", "Streetlight"),
            ("garbage dumping site", "Garbage"),
            ("broken traffic light", "Traffic Signal"),
            ("water pipe leaking on street", "Water Leakage"),
        ]
        for desc, expected in cases:
            resp = self.client.post(
                "/api/v1/issues",
                json={"description": desc, "latitude": 22.7, "longitude": 75.8},
                headers=headers,
            )
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()["data"]["category"], expected)


if __name__ == "__main__":
    unittest.main()
