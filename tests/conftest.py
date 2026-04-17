import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "Backend"
TESTS_DIR = ROOT_DIR / "tests"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(TESTS_DIR))

# Minimal required app settings for importing backend modules in tests.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")
os.environ.setdefault("JWT_REFRESH_SECRET_KEY", "test-jwt-refresh-secret")
os.environ.setdefault("ALGORITHM", "HS256")

from app.database import Base  # noqa: E402
import app.models  # noqa: F401,E402  # Ensure all SQLAlchemy models are registered.
from helpers.engine import BudgetEngine  # noqa: E402


def _build_sqlite_engine():
    sqlite_engine = create_engine("sqlite+pysqlite:///:memory:", future=True)

    @event.listens_for(sqlite_engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return sqlite_engine


@pytest.fixture
def db():
    test_engine = _build_sqlite_engine()
    Base.metadata.create_all(bind=test_engine)

    TestSession = sessionmaker(bind=test_engine, autocommit=False, autoflush=False, future=True)
    session = TestSession()

    try:
        yield session
    finally:
        session.rollback()
        session.close()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()


@pytest.fixture
def engine(db):
    return BudgetEngine(db)
