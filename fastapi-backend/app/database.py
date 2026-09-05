import uuid
from sqlalchemy import create_engine, Column, String, Text, JSON, TIMESTAMP, ForeignKey, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from app.config import settings

# MySQL Connection
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# SQLAlchemy Models matching your MySQL schema

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(String(36), primary_key=True)
    name = Column(Text)
    agency_name = Column(Text)
    role = Column(Text)
    avatar_url = Column(Text)
    tier = Column(String(50), default="Standard")
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    email = Column(String(255))

    credentials = relationship("UserCredential", back_populates="user")
    sites = relationship("Site", back_populates="user")

class UserCredential(Base):
    __tablename__ = "user_credentials"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(100), nullable=False)
    credentials = Column(JSON, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("Profile", back_populates="credentials")

class Site(Base):
    __tablename__ = "sites"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    industry = Column(String(255))
    seo_settings = Column(JSON, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    image_url = Column(Text)
    city = Column(String(255))
    phone = Column(String(50))
    email = Column(String(255))

    user = relationship("Profile", back_populates="sites")
    credentials = relationship("SiteCredential", back_populates="site")

class SiteCredential(Base):
    __tablename__ = "site_credentials"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    site_id = Column(String(36), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(100), nullable=False)
    credentials = Column(JSON, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    site = relationship("Site", back_populates="credentials")

class ReportStatus(Base):
    __tablename__ = "report_status"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String(255), nullable=False, unique=True)
    user_id = Column(String(36), nullable=False)
    site_id = Column(String(36), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    module = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    error_message = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    completed_at = Column(TIMESTAMP)

class ProcessedReport(Base):
    __tablename__ = "processed_reports"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String(255), nullable=False, unique=True)
    user_id = Column(String(36), nullable=False)
    site_id = Column(String(36), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    module = Column(String(50), nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    kpi_summary = Column(JSON)
    chart_datasets = Column(JSON)
    ai_summary = Column(Text)
    ai_insights = Column(JSON)
    ai_recommendations = Column(JSON)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    top_keywords = Column(JSON)
    top_landing_pages = Column(JSON)
    users_by_country = Column(JSON)
    gsc_daily = Column(JSON)
    ga4_details = Column(JSON)
    gsc_details = Column(JSON)
    top_page_titles = Column(JSON)
    sessions_by_channel = Column(JSON)
    events_by_event_name = Column(JSON)
    key_events_by_platform = Column(JSON)
    ai_table_explanations = Column(JSON)
    ai_top_keywords_overview = Column(Text)
    ai_google_summary = Column(Text)
    ai_meta_summary = Column(Text)
    ai_comparison = Column(Text)
    google_ads_details = Column(JSON)
    charts = Column(JSON)
    competitor_data = Column(JSON)
    ai_competitor_analysis = Column(JSON)
    meta_ads_kpi = Column(JSON)
    meta_ads_details = Column(JSON)
    meta_ads_charts = Column(JSON)
    section_advice = Column(JSON)
    radar_data = Column(JSON)
    ai_recommendations_summarized = Column(JSON)
    ai_slide_descriptions = Column(JSON)
    seo_work_details = Column(JSON)
    gbp_details = Column(JSON)
    improvement_roadmap = Column(JSON)
    competitor_intelligence = Column(JSON)
    radar_self = Column(JSON)
    self_gap_analysis = Column(JSON)

class CompetitorInsight(Base):
    __tablename__ = "competitor_insights"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    site_id = Column(String(36), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    competitor_url = Column(String(500), nullable=False)
    competitor_name = Column(String(255))
    full_text = Column(Text)
    key_phrases = Column(JSON)
    cta = Column(JSON)
    entities = Column(JSON)
    trust_signals = Column(JSON)
    raw_text_preview = Column(Text)
    extracted_at = Column(TIMESTAMP, default=datetime.utcnow)
    discovery_query = Column(String(500))
    source_module = Column(String(50))

class SharedReport(Base):
    __tablename__ = "shared_reports"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    site_id = Column(String(36), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    date_range = Column(JSON, nullable=False)
    access_type = Column(String(50), nullable=False)
    shared_pages = Column(JSON, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    report_id = Column(String(255))
