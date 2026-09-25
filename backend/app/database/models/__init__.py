"""
Importing every model here means: anywhere in the app that does
`from app.database.models import Base` (or imports this package) causes
every table to be registered with SQLAlchemy's metadata. Alembic's
env.py relies on this for autogeneration.
"""
from app.database.database import Base  # noqa: F401
from app.database.models.user import User  # noqa: F401
from app.database.models.department import Department  # noqa: F401
from app.database.models.ward import Ward  # noqa: F401
from app.database.models.issue import Issue, IssueSeverityFactor, IssuePriorityFactor  # noqa: F401
from app.database.models.issue_media import IssueMedia  # noqa: F401
from app.database.models.ai_analysis import AIAnalysis  # noqa: F401
from app.database.models.issue_duplicate import IssueDuplicate  # noqa: F401
from app.database.models.work_order import WorkOrder, ResolutionEvidence  # noqa: F401
from app.database.models.prediction import WardRiskPrediction  # noqa: F401
from app.database.models.notification import Notification  # noqa: F401
