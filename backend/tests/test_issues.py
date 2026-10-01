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
    def test_multi_image_evidence_support_two_and_five_images(self):
        token = self._register_and_login("citizen_multi@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Upload 5 images
        media_ids = []
        for i in range(5):
            fake_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
            files = {"file": (f"pothole_{i}.jpg", io.BytesIO(fake_jpg), "image/jpeg")}
            up = self.client.post("/api/v1/media/upload", files=files, headers=headers)
            self.assertEqual(up.status_code, 200)
            media_ids.append(up.json()["data"]["media_id"])

        # Test A: Create issue with 2 images
        resp_2 = self.client.post(
            "/api/v1/issues",
            json={
                "description": "Two angle pothole report",
                "latitude": 22.71,
                "longitude": 75.85,
                "media_ids": media_ids[:2],
            },
            headers=headers,
        )
        self.assertEqual(resp_2.status_code, 200)
        data_2 = resp_2.json()["data"]
        self.assertEqual(len(data_2["media_ids"]), 2)
        self.assertEqual(len(data_2["evidence_images"]), 2)
        self.assertEqual(data_2["media_ids"], media_ids[:2])

        # Test B: Create issue with 5 images
        resp_5 = self.client.post(
            "/api/v1/issues",
            json={
                "description": "Five angle pothole report",
                "latitude": 22.72,
                "longitude": 75.86,
                "media_ids": media_ids,
            },
            headers=headers,
        )
        self.assertEqual(resp_5.status_code, 200)
        data_5 = resp_5.json()["data"]
        self.assertEqual(len(data_5["media_ids"]), 5)
        self.assertEqual(len(data_5["evidence_images"]), 5)
        self.assertEqual(data_5["media_ids"], media_ids)

    def test_multi_image_evidence_rejection_at_six_images(self):
        token = self._register_and_login("citizen_six@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Upload 6 images
        media_ids = []
        for i in range(6):
            fake_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
            files = {"file": (f"pothole_{i}.jpg", io.BytesIO(fake_jpg), "image/jpeg")}
            up = self.client.post("/api/v1/media/upload", files=files, headers=headers)
            self.assertEqual(up.status_code, 200)
            media_ids.append(up.json()["data"]["media_id"])

        # Attempt to create issue with 6 images -> Should be rejected with 422
        resp = self.client.post(
            "/api/v1/issues",
            json={
                "description": "Six angle pothole report",
                "latitude": 22.73,
                "longitude": 75.87,
                "media_ids": media_ids,
            },
            headers=headers,
        )
        self.assertEqual(resp.status_code, 422)
        err = resp.json()
        self.assertEqual(err["error"]["code"], "MAX_MEDIA_LIMIT_EXCEEDED")
        self.assertIn("maximum of 5", err["error"]["message"])

    def test_image_association_isolation_between_issues(self):
        token = self._register_and_login("citizen_iso@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Upload 4 images
        media_ids = []
        for i in range(4):
            fake_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
            files = {"file": (f"sample_{i}.jpg", io.BytesIO(fake_jpg), "image/jpeg")}
            up = self.client.post("/api/v1/media/upload", files=files, headers=headers)
            self.assertEqual(up.status_code, 200)
            media_ids.append(up.json()["data"]["media_id"])

        # Issue A: uses media_ids[0, 1]
        resp_a = self.client.post(
            "/api/v1/issues",
            json={"description": "Issue A", "latitude": 22.1, "longitude": 75.1, "media_ids": media_ids[:2]},
            headers=headers,
        )
        issue_a = resp_a.json()["data"]

        # Issue B: uses media_ids[2, 3]
        resp_b = self.client.post(
            "/api/v1/issues",
            json={"description": "Issue B", "latitude": 22.9, "longitude": 75.9, "media_ids": media_ids[2:]},
            headers=headers,
        )
        issue_b = resp_b.json()["data"]

        # Verify Isolation
        detail_a = self.client.get(f"/api/v1/issues/{issue_a['id']}", headers=headers).json()["data"]
        detail_b = self.client.get(f"/api/v1/issues/{issue_b['id']}", headers=headers).json()["data"]

        self.assertEqual(detail_a["media_ids"], media_ids[:2])
        self.assertEqual(detail_b["media_ids"], media_ids[2:])
        self.assertFalse(set(detail_a["media_ids"]).intersection(set(detail_b["media_ids"])))

    def _create_jpeg_with_exif(self, lat=None, lng=None, dt_str=None, make=None, model=None):
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

        if lat is not None and lng is not None:
            gps_ifd = exif.get_ifd(0x8825)
            lat_ref = "N" if lat >= 0 else "S"
            abs_lat = abs(lat)
            d_lat = int(abs_lat)
            m_lat = int((abs_lat - d_lat) * 60)
            s_lat = round((abs_lat - d_lat - m_lat / 60) * 3600, 4)
            gps_ifd[1] = lat_ref
            gps_ifd[2] = (float(d_lat), float(m_lat), float(s_lat))

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

    def test_issue_evidence_verification_retrieval(self):
        token = self._register_and_login("citizen_ev@example.com")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Upload photo with EXIF + Device Location Match
        raw_match = self._create_jpeg_with_exif(
            lat=22.7196,
            lng=75.8577,
            dt_str="2026:09:27 12:00:00",
            make="Samsung",
            model="Galaxy S23",
        )
        up_match = self.client.post(
            "/api/v1/media/upload",
            files={"file": ("photo1.jpg", io.BytesIO(raw_match), "image/jpeg")},
            data={
                "device_latitude": 22.7197,
                "device_longitude": 75.8578,
                "device_captured_at": "2026-09-27T12:01:00Z",
            },
            headers=headers,
        )
        self.assertEqual(up_match.status_code, 200)
        id_1 = up_match.json()["data"]["media_id"]

        # 2. Upload photo with Mismatched EXIF vs Device
        raw_mismatch = self._create_jpeg_with_exif(
            lat=22.7196,
            lng=75.8577,
            dt_str="2026:09:27 12:00:00",
        )
        up_mismatch = self.client.post(
            "/api/v1/media/upload",
            files={"file": ("photo2.jpg", io.BytesIO(raw_mismatch), "image/jpeg")},
            data={
                "device_latitude": 19.0760,
                "device_longitude": 72.8777,
                "device_captured_at": "2026-09-27T18:00:00Z",
            },
            headers=headers,
        )
        self.assertEqual(up_mismatch.status_code, 200)
        id_2 = up_mismatch.json()["data"]["media_id"]

        # 3. Create Issue with both images
        create_resp = self.client.post(
            "/api/v1/issues",
            json={
                "description": "Multi evidence issue",
                "latitude": 22.7196,
                "longitude": 75.8577,
                "media_ids": [id_1, id_2],
            },
            headers=headers,
        )
        self.assertEqual(create_resp.status_code, 200)
        issue_id = create_resp.json()["data"]["id"]

        # 4. Fetch detail
        detail_resp = self.client.get(f"/api/v1/issues/{issue_id}", headers=headers)
        self.assertEqual(detail_resp.status_code, 200)
        data = detail_resp.json()["data"]
        
        evidence_images = data["evidence_images"]
        self.assertEqual(len(evidence_images), 2)

        # First image: match
        img1 = next(item for item in evidence_images if item["id"] == id_1)
        self.assertEqual(img1["camera_make"], "Samsung")
        self.assertEqual(img1["camera_model"], "Galaxy S23")
        self.assertEqual(img1["evidence_verification"]["gps"]["status"], "match")
        self.assertEqual(img1["evidence_verification"]["capture_time"]["status"], "match")

        # Second image: mismatch
        img2 = next(item for item in evidence_images if item["id"] == id_2)
        self.assertEqual(img2["evidence_verification"]["gps"]["status"], "mismatch")
        self.assertEqual(img2["evidence_verification"]["capture_time"]["status"], "mismatch")

    def test_duplicate_detection_same_category_and_nearby_location(self):
        token = self._register_and_login("dup_user1@example.com")
        headers = {"Authorization": f"Bearer {token}"}

        # Issue 1: Initial report at (22.7196, 75.8577)
        resp1 = self.client.post(
            "/api/v1/issues",
            json={"description": "Large pothole in the road", "latitude": 22.7196, "longitude": 75.8577},
            headers=headers,
        )
        self.assertEqual(resp1.status_code, 200)
        issue1_id = resp1.json()["data"]["id"]

        # Issue 2: Second report ~30 meters away with same category
        resp2 = self.client.post(
            "/api/v1/issues",
            json={"description": "Dangerous pothole near crossroad", "latitude": 22.7198, "longitude": 75.8579},
            headers=headers,
        )
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()["data"]
        
        dup_assessment = data2.get("duplicate_assessment")
        self.assertIsNotNone(dup_assessment)
        self.assertEqual(dup_assessment["status"], "possible_duplicate")
        self.assertEqual(dup_assessment["matched_issue_id"], issue1_id)
        self.assertTrue(len(dup_assessment["matches"]) > 0)
        self.assertTrue(dup_assessment["matches"][0]["category_match"])
        self.assertTrue(dup_assessment["matches"][0]["location_nearby"])
        self.assertLessEqual(dup_assessment["matches"][0]["distance_meters"], 100.0)

    def test_duplicate_detection_similar_image_match(self):
        token = self._register_and_login("dup_img_user@example.com")
        headers = {"Authorization": f"Bearer {token}"}

        # Create image 1 (blue square)
        raw_img1 = self._create_jpeg_with_exif()
        up1 = self.client.post(
            "/api/v1/media/upload",
            files={"file": ("orig.jpg", io.BytesIO(raw_img1), "image/jpeg")},
            headers=headers,
        )
        id1 = up1.json()["data"]["media_id"]

        resp1 = self.client.post(
            "/api/v1/issues",
            json={"description": "Streetlight broken", "latitude": 22.7196, "longitude": 75.8577, "media_ids": [id1]},
            headers=headers,
        )
        issue1_id = resp1.json()["data"]["id"]

        # Create image 2 (exact same blue image -> similarity 1.0)
        up2 = self.client.post(
            "/api/v1/media/upload",
            files={"file": ("copy.jpg", io.BytesIO(raw_img1), "image/jpeg")},
            headers=headers,
        )
        id2 = up2.json()["data"]["media_id"]

        # Issue 2 at 120m away (just outside default location threshold) but with identical image
        resp2 = self.client.post(
            "/api/v1/issues",
            json={"description": "Streetlight dark", "latitude": 22.7205, "longitude": 75.8585, "media_ids": [id2]},
            headers=headers,
        )
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()["data"]
        dup_assessment = data2.get("duplicate_assessment")
        self.assertIsNotNone(dup_assessment)
        self.assertEqual(dup_assessment["status"], "possible_duplicate")
        self.assertEqual(dup_assessment["matched_issue_id"], issue1_id)
        self.assertTrue(dup_assessment["matches"][0]["image_strong_match"])
        self.assertGreaterEqual(dup_assessment["matches"][0]["image_similarity"], 0.85)

    def test_duplicate_detection_far_away_location_no_match(self):
        token = self._register_and_login("dup_far_user@example.com")
        headers = {"Authorization": f"Bearer {token}"}

        # Issue 1 in Indore (22.7196, 75.8577)
        self.client.post(
            "/api/v1/issues",
            json={"description": "Pothole in city A", "latitude": 22.7196, "longitude": 75.8577},
            headers=headers,
        )

        # Issue 2 in Bhopal (23.2599, 77.4126) - 180 km away
        resp2 = self.client.post(
            "/api/v1/issues",
            json={"description": "Pothole in city B", "latitude": 23.2599, "longitude": 77.4126},
            headers=headers,
        )
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()["data"]
        dup_assessment = data2.get("duplicate_assessment")
        self.assertIsNotNone(dup_assessment)
        self.assertEqual(dup_assessment["status"], "no_clear_match")

    def test_duplicate_detection_different_category_no_match(self):
        token = self._register_and_login("dup_diff_user@example.com")
        headers = {"Authorization": f"Bearer {token}"}

        # Issue 1: Garbage
        self.client.post(
            "/api/v1/issues",
            json={"description": "Overflowing garbage dump", "latitude": 22.7196, "longitude": 75.8577},
            headers=headers,
        )

        # Issue 2: Streetlight at same location
        resp2 = self.client.post(
            "/api/v1/issues",
            json={"description": "Broken streetlight post", "latitude": 22.7196, "longitude": 75.8577},
            headers=headers,
        )
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()["data"]
        dup_assessment = data2.get("duplicate_assessment")
        self.assertIsNotNone(dup_assessment)
        self.assertEqual(dup_assessment["status"], "no_clear_match")

    def test_duplicate_detection_graceful_missing_data(self):
        token = self._register_and_login("dup_none_user@example.com")
        headers = {"Authorization": f"Bearer {token}"}

        # Issue with None coordinates and no media
        resp = self.client.post(
            "/api/v1/issues",
            json={"description": "General road defect report", "latitude": None, "longitude": None},
            headers=headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        dup_assessment = data.get("duplicate_assessment")
        self.assertIsNotNone(dup_assessment)
        self.assertIn(dup_assessment["status"], ["no_clear_match", "insufficient_evidence"])


if __name__ == "__main__":
    unittest.main()



