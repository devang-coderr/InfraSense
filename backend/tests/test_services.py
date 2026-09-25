import unittest
from app.services.severity_service import calculate_severity, score_to_severity
from app.services.priority_service import calculate_priority
from app.services.department_service import resolve_department_name
from app.database.models.enums import Severity


class TestServices(unittest.TestCase):
    def test_severity_scoring_is_deterministic(self):
        severity, score, factors = calculate_severity("Pothole")
        self.assertTrue(0 <= score <= 100)
        self.assertEqual(severity, score_to_severity(score))
        self.assertEqual(sum(f["score"] for f in factors), score)

    def test_score_to_severity_bounds(self):
        self.assertEqual(score_to_severity(90), Severity.CRITICAL)
        self.assertEqual(score_to_severity(70), Severity.HIGH)
        self.assertEqual(score_to_severity(45), Severity.MEDIUM)
        self.assertEqual(score_to_severity(10), Severity.LOW)

    def test_priority_increases_with_duplicate_count(self):
        low_dup, _ = calculate_priority(severity_score=50, duplicate_count=0, age_days=0)
        high_dup, _ = calculate_priority(severity_score=50, duplicate_count=5, age_days=0)
        self.assertGreater(high_dup, low_dup)

    def test_department_rules(self):
        self.assertEqual(resolve_department_name("Pothole"), "Roads")
        self.assertEqual(resolve_department_name("Streetlight"), "Electrical")
        self.assertEqual(resolve_department_name("Garbage"), "Sanitation")
        self.assertEqual(resolve_department_name("Water Leakage"), "Water")
        self.assertEqual(resolve_department_name("Something Unknown"), "Roads")


if __name__ == "__main__":
    unittest.main()

