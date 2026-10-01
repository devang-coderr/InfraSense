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
from app.database.models.notification import Notification
from app.database.models.enums import UserRole, Severity, IssueStatus
from app.main import app
from app.services import alert_service


class TestAlertAndNotificationSystem(unittest.TestCase):
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

    def test_01_critical_issue_creates_alert_for_authority(self):
        """1. Critical/High issue creates alert for authority in the same jurisdiction."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        # Submit pothole
        res = self.client.post(
            "/api/v1/issues",
            json={
                "description": "Massive hazardous pothole crater deep on main highway",
                "latitude": 23.25,
                "longitude": 77.41,
                "state": "Madhya Pradesh",
                "district": "Bhopal",
                "ai_category": "Pothole",
            },
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        self.assertEqual(res.status_code, 200)

        # Check Bhopal authority notifications
        notif_res = self.client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(notif_res.status_code, 200)
        items = notif_res.json()["data"]
        self.assertTrue(len(items) >= 1)
        alert = items[0]
        self.assertIn(alert["severity"], ["critical", "high"])
        self.assertIn("Pothole", alert["title"])
        self.assertEqual(alert["district"], "Bhopal")
        self.assertEqual(alert["state"], "Madhya Pradesh")

    def test_02_normal_issue_does_not_create_alert(self):
        """2. Low/normal issue does not create an authority alert."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        res = self.client.post(
            "/api/v1/issues",
            json={
                "description": "Minor streetlight dim flicker on residential side alley",
                "latitude": 23.25,
                "longitude": 77.41,
                "state": "Madhya Pradesh",
                "district": "Bhopal",
                "ai_category": "Streetlight",
            },
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        self.assertEqual(res.status_code, 200)

        # Streetlight is medium severity (score 55, priority 39) -> Authority should have 0 alerts
        notif_res = self.client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(len(notif_res.json()["data"]), 0)

    def test_03_jurisdiction_isolation_bhopal_indore(self):
        """3, 4, 5, 6, 7. Bhopal authority gets Bhopal alert; Indore authority does NOT."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        indore_token = self._register_and_get_token("Officer Indore", "indore@gov.in", "officer", "Madhya Pradesh", "Indore")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        # Open Manhole Bhopal issue
        self.client.post(
            "/api/v1/issues",
            json={
                "description": "Deep open manhole on busy pedestrian path",
                "latitude": 23.25,
                "longitude": 77.41,
                "state": "Madhya Pradesh",
                "district": "Bhopal",
                "ai_category": "Open Manhole",
            },
            headers={"Authorization": f"Bearer {citizen_token}"},
        )

        # Bhopal receives 1 alert
        bhopal_notifs = self.client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {bhopal_token}"},
        ).json()["data"]
        self.assertEqual(len(bhopal_notifs), 1)
        self.assertEqual(bhopal_notifs[0]["district"], "Bhopal")

        # Indore receives 0 alerts
        indore_notifs = self.client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {indore_token}"},
        ).json()["data"]
        self.assertEqual(len(indore_notifs), 0)

    def test_04_cross_jurisdiction_actions_blocked(self):
        """8, 9, 10. Unauthorized Authority cannot access, read, acknowledge, or resolve another jurisdiction's alert."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        indore_token = self._register_and_get_token("Officer Indore", "indore@gov.in", "officer", "Madhya Pradesh", "Indore")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        self.client.post(
            "/api/v1/issues",
            json={
                "description": "Hazardous open manhole on roadway",
                "latitude": 23.25,
                "longitude": 77.41,
                "state": "Madhya Pradesh",
                "district": "Bhopal",
                "ai_category": "Open Manhole",
            },
            headers={"Authorization": f"Bearer {citizen_token}"},
        )

        bhopal_notifs = self.client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {bhopal_token}"},
        ).json()["data"]
        self.assertTrue(len(bhopal_notifs) >= 1)
        bhopal_alert_id = bhopal_notifs[0]["id"]

        # Indore tries to acknowledge Bhopal alert -> 404
        ack_res = self.client.patch(
            f"/api/v1/notifications/{bhopal_alert_id}/acknowledge",
            headers={"Authorization": f"Bearer {indore_token}"},
        )
        self.assertEqual(ack_res.status_code, 404)

        # Indore tries to read Bhopal alert -> 404
        read_res = self.client.patch(
            f"/api/v1/notifications/{bhopal_alert_id}/read",
            headers={"Authorization": f"Bearer {indore_token}"},
        )
        self.assertEqual(read_res.status_code, 404)

        # Indore tries to resolve Bhopal alert -> 404
        res_res = self.client.patch(
            f"/api/v1/notifications/{bhopal_alert_id}/resolve",
            headers={"Authorization": f"Bearer {indore_token}"},
        )
        self.assertEqual(res_res.status_code, 404)

    def test_05_idempotent_alert_evaluation_no_duplicates(self):
        """11. Duplicate evaluation does not create duplicate alerts."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        res = self.client.post(
            "/api/v1/issues",
            json={
                "description": "Hazardous pothole deep crater",
                "latitude": 23.25,
                "longitude": 77.41,
                "state": "Madhya Pradesh",
                "district": "Bhopal",
                "ai_category": "Pothole",
            },
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        issue_id = res.json()["data"]["id"]

        # Re-evaluate alert multiple times
        issue = self.db.get(Issue, issue_id)
        alert_service.evaluate_and_create_alerts(self.db, issue=issue)
        alert_service.evaluate_and_create_alerts(self.db, issue=issue)
        self.db.commit()

        # Check total alerts for Bhopal authority remains exactly 1
        notifs = self.client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {bhopal_token}"},
        ).json()["data"]
        self.assertEqual(len(notifs), 1)

    def test_06_lifecycle_unread_read_acknowledge_resolve(self):
        """12, 13, 14, 15. Full lifecycle: unread count -> read -> acknowledge -> issue resolved."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        res = self.client.post(
            "/api/v1/issues",
            json={
                "description": "Severe pothole damaged highway",
                "latitude": 23.25,
                "longitude": 77.41,
                "state": "Madhya Pradesh",
                "district": "Bhopal",
                "ai_category": "Pothole",
            },
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        issue_id = res.json()["data"]["id"]

        # 1. Check unread count is 1
        count_res = self.client.get(
            "/api/v1/notifications/unread-count",
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(count_res.json()["data"]["unread_count"], 1)

        notifs = self.client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {bhopal_token}"},
        ).json()["data"]
        alert_id = notifs[0]["id"]

        # 2. Mark read
        read_res = self.client.patch(
            f"/api/v1/notifications/{alert_id}/read",
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(read_res.status_code, 200)
        self.assertTrue(read_res.json()["data"]["is_read"])

        # 3. Acknowledge
        ack_res = self.client.patch(
            f"/api/v1/notifications/{alert_id}/acknowledge",
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(ack_res.status_code, 200)
        self.assertEqual(ack_res.json()["data"]["status"], "acknowledged")
        self.assertIsNotNone(ack_res.json()["data"]["acknowledged_at"])

        # 4. Resolve underlying issue
        patch_res = self.client.patch(
            f"/api/v1/issues/{issue_id}",
            json={"status": "resolved"},
            headers={"Authorization": f"Bearer {bhopal_token}"},
        )
        self.assertEqual(patch_res.status_code, 200)

        # 5. Check alert status is now resolved
        resolved_notifs = self.client.get(
            "/api/v1/notifications?filter=resolved",
            headers={"Authorization": f"Bearer {bhopal_token}"},
        ).json()["data"]
        self.assertEqual(len(resolved_notifs), 1)
        self.assertEqual(resolved_notifs[0]["status"], "resolved")
        self.assertIsNotNone(resolved_notifs[0]["resolved_at"])

    def test_07_citizen_notification_intact(self):
        """16. Citizen access to their own reports and report_received notifications remains intact."""
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        self.client.post(
            "/api/v1/issues",
            json={
                "description": "Garbage dumped along sidewalk",
                "latitude": 23.25,
                "longitude": 77.41,
                "state": "Madhya Pradesh",
                "district": "Bhopal",
                "ai_category": "Garbage",
            },
            headers={"Authorization": f"Bearer {citizen_token}"},
        )

        cit_notifs = self.client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {citizen_token}"},
        ).json()["data"]
        self.assertEqual(len(cit_notifs), 1)
        self.assertEqual(cit_notifs[0]["type"], "report_received")

    def test_08_all_8_official_categories_support_alerts(self):
        """17. All 8 official categories can generate alerts when alert conditions are met."""
        bhopal_token = self._register_and_get_token("Officer Bhopal", "bhopal@gov.in", "officer", "Madhya Pradesh", "Bhopal")
        citizen_token = self._register_and_get_token("Citizen Ravi", "ravi@example.com", "citizen")

        categories = [
            "Pothole",
            "Road Crack",
            "Streetlight",
            "Traffic Signal",
            "Garbage",
            "Water Leakage",
            "Drainage",
            "Open Manhole",
        ]

        for i, cat in enumerate(categories, start=1):
            issue = Issue(
                title=cat,
                category=cat,
                description=f"Critical hazardous {cat} infrastructure failure",
                reported_by=1,
                latitude=23.25,
                longitude=77.41,
                state="Madhya Pradesh",
                district="Bhopal",
                severity=Severity.CRITICAL,
                severity_score=90,
                priority_score=85,
                status=IssueStatus.AI_VERIFIED,
                reported_at=datetime.now(timezone.utc),
            )
            self.db.add(issue)
            self.db.commit()
            self.db.refresh(issue)

            alert_service.evaluate_and_create_alerts(self.db, issue=issue)
            self.db.commit()

        notifs = self.client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {bhopal_token}"},
        ).json()["data"]
        received_cats = {n["category"] for n in notifs}
        for cat in categories:
            self.assertIn(cat, received_cats)


if __name__ == "__main__":
    unittest.main()
