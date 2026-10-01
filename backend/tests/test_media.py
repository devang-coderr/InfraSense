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
        from PIL import Image
        token = self._get_citizen_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a valid test image
        img = Image.new("RGB", (32, 32), color="gray")
        img_buf = io.BytesIO()
        img.save(img_buf, format="JPEG")
        img_bytes = img_buf.getvalue()
        
        files = {"file": ("test_image.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        resp = self.client.post("/api/v1/ai/analyze-image", files=files, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertIn("category", data)
        self.assertIn("severity", data)
        self.assertIn("confidence", data)
        self.assertIn("is_baseline", data)
        self.assertFalse(data["is_baseline"])

    def _create_jpeg_with_exif(self, lat=None, lng=None, dt_str=None, make=None, model=None, offset_str=None):
        from PIL import Image
        img = Image.new("RGB", (64, 64), color="blue")
        exif = img.getexif()
        if make:
            exif[271] = make
        if model:
            exif[272] = model
        if dt_str:
            exif[306] = dt_str
            exif_ifd = exif.get_ifd(0x8769)
            exif_ifd[0x9003] = dt_str
            if offset_str:
                exif_ifd[0x9011] = offset_str

        if lat is not None and lng is not None:
            gps_ifd = exif.get_ifd(0x8825)
            # latitude
            lat_ref = "N" if lat >= 0 else "S"
            abs_lat = abs(lat)
            d_lat = int(abs_lat)
            m_lat = int((abs_lat - d_lat) * 60)
            s_lat = round((abs_lat - d_lat - m_lat / 60) * 3600, 4)
            gps_ifd[1] = lat_ref
            gps_ifd[2] = (float(d_lat), float(m_lat), float(s_lat))

            # longitude
            lng_ref = "E" if lng >= 0 else "W"
            abs_lng = abs(lng)
            d_lng = int(abs_lng)
            m_lng = int((abs_lng - d_lng) * 60)
            s_lng = round((abs_lng - d_lng - m_lng / 60) * 3600, 4)
            gps_ifd[3] = lng_ref
            gps_ifd[4] = (float(d_lng), float(m_lng), float(s_lng))

        buf = io.BytesIO()
        img.save(buf, format="JPEG", exif=exif)
        return buf.getvalue()

    def test_upload_image_no_exif_returns_unavailable(self):
        from PIL import Image
        token = self._get_citizen_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        img = Image.new("RGB", (32, 32), color="green")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        
        files = {"file": ("plain.jpg", io.BytesIO(buf.getvalue()), "image/jpeg")}
        resp = self.client.post("/api/v1/media/upload", files=files, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertIn("evidence_verification", data)
        ev = data["evidence_verification"]
        self.assertEqual(ev["gps"]["status"], "unavailable")
        self.assertFalse(ev["gps"]["device_available"])
        self.assertFalse(ev["gps"]["exif_available"])
        self.assertIsNone(ev["gps"]["distance_meters"])
        self.assertEqual(ev["capture_time"]["status"], "unavailable")
        self.assertFalse(ev["capture_time"]["device_available"])
        self.assertFalse(ev["capture_time"]["exif_available"])
        self.assertIsNone(ev["capture_time"]["difference_seconds"])

    def test_upload_image_gps_and_time_match(self):
        token = self._get_citizen_token()
        headers = {"Authorization": f"Bearer {token}"}

        # EXIF at 22.7196, 75.8577, 2026-09-27 12:00:00
        raw_bytes = self._create_jpeg_with_exif(
            lat=22.7196,
            lng=75.8577,
            dt_str="2026:09:27 12:00:00",
            make="Google",
            model="Pixel 7",
        )
        files = {"file": ("camera_photo.jpg", io.BytesIO(raw_bytes), "image/jpeg")}
        # Device reports coords ~50m away and timestamp 60s later
        form_data = {
            "device_latitude": 22.7199,
            "device_longitude": 75.8580,
            "device_captured_at": "2026-09-27T12:01:00Z",
        }

        resp = self.client.post("/api/v1/media/upload", files=files, data=form_data, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        ev = data["evidence_verification"]
        
        self.assertTrue(ev["gps"]["device_available"])
        self.assertTrue(ev["gps"]["exif_available"])
        self.assertIsNotNone(ev["gps"]["distance_meters"])
        self.assertLessEqual(ev["gps"]["distance_meters"], 150.0)
        self.assertEqual(ev["gps"]["status"], "match")

        self.assertTrue(ev["capture_time"]["device_available"])
        self.assertTrue(ev["capture_time"]["exif_available"])
        self.assertIsNotNone(ev["capture_time"]["difference_seconds"])
        self.assertLessEqual(ev["capture_time"]["difference_seconds"], 300)
        self.assertEqual(ev["capture_time"]["status"], "match")

        self.assertEqual(data["camera_make"], "Google")
        self.assertEqual(data["camera_model"], "Pixel 7")

    def test_upload_image_gps_and_time_mismatch(self):
        token = self._get_citizen_token()
        headers = {"Authorization": f"Bearer {token}"}

        # EXIF at 22.7196, 75.8577, 2026-09-27 12:00:00
        raw_bytes = self._create_jpeg_with_exif(
            lat=22.7196,
            lng=75.8577,
            dt_str="2026:09:27 12:00:00",
            make="Sony",
            model="Alpha",
        )
        files = {"file": ("camera_photo2.jpg", io.BytesIO(raw_bytes), "image/jpeg")}
        # Device reports coords in Delhi (800km away) and timestamp 2 hours later
        form_data = {
            "device_latitude": 28.6139,
            "device_longitude": 77.2090,
            "device_captured_at": "2026-09-27T14:00:00Z",
        }

        resp = self.client.post("/api/v1/media/upload", files=files, data=form_data, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        ev = data["evidence_verification"]
        
        self.assertTrue(ev["gps"]["device_available"])
        self.assertTrue(ev["gps"]["exif_available"])
        self.assertGreater(ev["gps"]["distance_meters"], 150.0)
        self.assertEqual(ev["gps"]["status"], "mismatch")

        self.assertTrue(ev["capture_time"]["device_available"])
        self.assertTrue(ev["capture_time"]["exif_available"])
        self.assertGreater(ev["capture_time"]["difference_seconds"], 300)
        self.assertEqual(ev["capture_time"]["status"], "mismatch")

    def test_upload_partial_metadata(self):
        token = self._get_citizen_token()
        headers = {"Authorization": f"Bearer {token}"}

        # Image with EXIF timestamp only, NO GPS
        raw_bytes = self._create_jpeg_with_exif(
            lat=None,
            lng=None,
            dt_str="2026:09:27 12:00:00",
        )
        files = {"file": ("time_only.jpg", io.BytesIO(raw_bytes), "image/jpeg")}
        # Device reports GPS and time
        form_data = {
            "device_latitude": 22.7196,
            "device_longitude": 75.8577,
            "device_captured_at": "2026-09-27T12:02:00Z",
        }

        resp = self.client.post("/api/v1/media/upload", files=files, data=form_data, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        ev = data["evidence_verification"]
        
        # GPS: device has it, EXIF does not -> unavailable
        self.assertTrue(ev["gps"]["device_available"])
        self.assertFalse(ev["gps"]["exif_available"])
        self.assertEqual(ev["gps"]["status"], "unavailable")

        # Time: both have it within 120s -> match
        self.assertTrue(ev["capture_time"]["device_available"])
        self.assertTrue(ev["capture_time"]["exif_available"])
        self.assertEqual(ev["capture_time"]["status"], "match")
        self.assertEqual(ev["capture_time"]["difference_seconds"], 120)

    def test_upload_image_ist_capture_time_reconciliation(self):
        """
        Task 14 scenario: EXIF Date Taken is 28-09-2026 13:25 (naive local time),
        device reports 28-09-2026 13:26:44+05:30.
        Delta should be ~104 seconds (Match), NOT ~19,670 seconds.
        """
        token = self._get_citizen_token()
        headers = {"Authorization": f"Bearer {token}"}

        raw_bytes = self._create_jpeg_with_exif(
            lat=23.2599,
            lng=77.4126,
            dt_str="2026:09:28 13:25:00",
            make="Samsung",
            model="Galaxy S23",
        )
        files = {"file": ("real_pothole.jpg", io.BytesIO(raw_bytes), "image/jpeg")}
        form_data = {
            "device_latitude": 23.2599,
            "device_longitude": 77.4126,
            "device_captured_at": "2026-09-28T13:26:44+05:30",
        }

        resp = self.client.post("/api/v1/media/upload", files=files, data=form_data, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        ev = data["evidence_verification"]

        self.assertTrue(ev["capture_time"]["device_available"])
        self.assertTrue(ev["capture_time"]["exif_available"])
        self.assertEqual(ev["capture_time"]["status"], "match")
        self.assertEqual(ev["capture_time"]["difference_seconds"], 104)

    def test_upload_image_ist_utc_device_time_reconciliation(self):
        """
        Task 14 fallback scenario: EXIF Date Taken is 28-09-2026 13:25 (naive local time),
        device timestamp sent as UTC 2026-09-28T07:56:44Z.
        Reconciliation with India location / IST should yield 104s (Match).
        """
        token = self._get_citizen_token()
        headers = {"Authorization": f"Bearer {token}"}

        raw_bytes = self._create_jpeg_with_exif(
            lat=23.2599,
            lng=77.4126,
            dt_str="2026:09:28 13:25:00",
        )
        files = {"file": ("real_pothole_utc.jpg", io.BytesIO(raw_bytes), "image/jpeg")}
        form_data = {
            "device_latitude": 23.2599,
            "device_longitude": 77.4126,
            "device_captured_at": "2026-09-28T07:56:44Z",
        }

        resp = self.client.post("/api/v1/media/upload", files=files, data=form_data, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        ev = data["evidence_verification"]

        self.assertTrue(ev["capture_time"]["device_available"])
        self.assertTrue(ev["capture_time"]["exif_available"])
        self.assertEqual(ev["capture_time"]["status"], "match")
        self.assertEqual(ev["capture_time"]["difference_seconds"], 104)

    def test_upload_image_with_exif_offset_time(self):
        """
        EXIF has explicit OffsetTimeOriginal (+05:30) and device is +05:30.
        """
        token = self._get_citizen_token()
        headers = {"Authorization": f"Bearer {token}"}

        raw_bytes = self._create_jpeg_with_exif(
            dt_str="2026:09:28 13:25:00",
            offset_str="+05:30",
        )
        files = {"file": ("offset_photo.jpg", io.BytesIO(raw_bytes), "image/jpeg")}
        form_data = {
            "device_captured_at": "2026-09-28T13:26:44+05:30",
        }

        resp = self.client.post("/api/v1/media/upload", files=files, data=form_data, headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        ev = data["evidence_verification"]

        self.assertEqual(ev["capture_time"]["status"], "match")
        self.assertEqual(ev["capture_time"]["difference_seconds"], 104)

    def test_corrupted_exif_handled_gracefully(self):
        from app.services.evidence_service import extract_exif_metadata
        # Corrupted / random garbage bytes
        res = extract_exif_metadata(b"not a valid image or exif header")
        self.assertFalse(res["has_exif"])
        self.assertIsNone(res["exif_latitude"])
        self.assertIsNone(res["exif_longitude"])
        self.assertIsNone(res["exif_captured_at"])


if __name__ == "__main__":
    unittest.main()
