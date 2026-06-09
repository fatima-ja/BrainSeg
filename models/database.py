import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./brainseg.db"
)

# Fix Render's postgres:// → postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs this extra argument
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine)   # ← was missing
Base = declarative_base()                  # ← was missing


class Patient(Base):
    __tablename__ = "patients"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    age        = Column(Integer)
    gender     = Column(String)
    notes      = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class Scan(Base):
    __tablename__ = "scans"
    id                     = Column(Integer, primary_key=True, index=True)
    patient_id             = Column(Integer, nullable=False)
    scan_path              = Column(String)
    segmentation_path      = Column(String)
    analysis               = Column(Text)
    tumor_detected         = Column(Boolean, default=False)
    tumor_coverage_percent = Column(Float, default=0.0)
    tumor_pixels           = Column(Integer, default=0)
    input_format           = Column(String, default="")
    created_at             = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()