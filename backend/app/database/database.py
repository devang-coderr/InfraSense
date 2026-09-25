"""
Database connection.

WHAT: creates the SQLAlchemy "engine" (the thing that actually talks to
      the database file/server) and a session factory used per-request.
WHY:  every route needs a database session; `get_db()` below is a FastAPI
      "dependency" that hands one out and always closes it afterwards,
      even if the request raised an error.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

# SQLite needs this extra flag because, by default, it only allows the
# thread that created the connection to use it — FastAPI serves requests
# on different threads. Postgres doesn't need this flag (harmless if set).
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
