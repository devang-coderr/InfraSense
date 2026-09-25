from sqlalchemy import String, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column


from app.database.database import Base


class Ward(Base):
    """
    A simplified ward model: a name plus a centre point.

    NOTE ON SCOPE: the original planning notes proposed storing a full
    PostGIS polygon boundary per ward so "which ward contains this GPS
    point" could be a spatial query. That requires the PostGIS extension,
    which is a real hurdle for a Windows beginner setup (see README).
    For the MVP we instead assign each new issue to its NEAREST ward
    centre (see gis_service.assign_ward). This is a documented heuristic,
    not real polygon containment — upgrading to PostGIS + polygons later
    is a drop-in change to gis_service.py only.
    """

    __tablename__ = "wards"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    center_lat: Mapped[float] = mapped_column(Float)
    center_lng: Mapped[float] = mapped_column(Float)
    population: Mapped[int | None] = mapped_column(Integer, nullable=True)
