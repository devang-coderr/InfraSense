import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base
from app.database.database import get_db
from app.database.models.department import Department
from app.main import app

class TestAuth(unittest.TestCase):
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

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_register_and_login(self):
        resp = self.client.post(
            "/api/v1/auth/register",
            json={"name": "Alice", "email": "alice@example.com", "password": "Password123!", "role": "citizen"},
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertTrue(body["data"]["access_token"])
        self.assertEqual(body["data"]["user"]["email"], "alice@example.com")

        resp2 = self.client.post(
            "/api/v1/auth/login", json={"email": "alice@example.com", "password": "Password123!"}
        )
        self.assertEqual(resp2.status_code, 200)
        self.assertTrue(resp2.json()["data"]["access_token"])

    def test_login_wrong_password(self):
        self.client.post(
            "/api/v1/auth/register",
            json={"name": "Bob", "email": "bob@example.com", "password": "Password123!", "role": "citizen"},
        )
        resp = self.client.post("/api/v1/auth/login", json={"email": "bob@example.com", "password": "wrong"})
        self.assertEqual(resp.status_code, 401)
        self.assertFalse(resp.json()["success"])

    def test_duplicate_email_rejected(self):
        payload = {"name": "Carl", "email": "carl@example.com", "password": "Password123!", "role": "citizen"}
        self.client.post("/api/v1/auth/register", json=payload)
        resp = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(resp.status_code, 409)

    def test_me_requires_auth(self):
        resp = self.client.get("/api/v1/auth/me")
        self.assertEqual(resp.status_code, 401)

    def test_me_with_token(self):
        self.client.post(
            "/api/v1/auth/register",
            json={"name": "Dana", "email": "dana@example.com", "password": "Password123!", "role": "citizen"},
        )
        login = self.client.post("/api/v1/auth/login", json={"email": "dana@example.com", "password": "Password123!"})
        token = login.json()["data"]["access_token"]
        resp = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["data"]["email"], "dana@example.com")


if __name__ == "__main__":
    unittest.main()

