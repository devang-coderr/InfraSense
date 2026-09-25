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

class TestMedia(unittest.TestCase):
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

    def _get_citizen_token(self):
        self.client.post(
            "/api/v1/auth/register",
            json={"name": "MediaUser", "email": "mediauser@example.com", "password": "Password123!", "role": "citizen"},
        )
        login = self.client.post("/api/v1/auth/login", json={"email": "mediauser@example.com", "password": "Password123!"})
        return login.json()["data"]["access_token"]

    def test_valid_image_upload(self):
        token = self._get_citizen_token()
        headers = {"Authorization": f"Bearer {token}"}
        fake_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00"
        files = {"file": ("test_pothole.jpg", io.BytesIO(fake_jpg), "image/jpeg")}
        resp = self.client.post("/api/v1/media/upload", files=files, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertIn("media_id", data)
        self.assertIn("file_url", data)
        self.assertIn("/media/", data["file_url"])

    def test_invalid_image_type_rejected(self):
        token = self._get_citizen_token()
        headers = {"Authorization": f"Bearer {token}"}
        fake_exe = b"MZ\x90\x00\x03\x00\x00\x00"
        files = {"file": ("script.exe", io.BytesIO(fake_exe), "application/octet-stream")}
        resp = self.client.post("/api/v1/media/upload", files=files, headers=headers)
        self.assertEqual(resp.status_code, 422)

    def test_analyze_media(self):
        token = self._get_citizen_token()
        headers = {"Authorization": f"Bearer {token}"}
        fake_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
        files = {"file": ("garbage_dump.jpg", io.BytesIO(fake_jpg), "image/jpeg")}
        resp = self.client.post("/api/v1/ai/analyze-image", files=files, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertIn("category", data)
        self.assertIn("severity", data)
        self.assertIn("confidence", data)


if __name__ == "__main__":
    unittest.main()
