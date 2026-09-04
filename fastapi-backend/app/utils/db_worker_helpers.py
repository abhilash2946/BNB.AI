from app.database import SessionLocal, ReportStatus, ProcessedReport, Site, SiteCredential, CompetitorInsight, UserCredential
from datetime import datetime, timezone

def update_db_report_status(report_id, status, error_message=None):
    db = SessionLocal()
    try:
        rpt = db.query(ReportStatus).filter(ReportStatus.report_id == report_id).first()
        if rpt:
            rpt.status = status
            if error_message:
                rpt.error_message = error_message
            if status == "completed":
                rpt.completed_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()

def get_db_site_credentials(site_id, platforms):
    db = SessionLocal()
    try:
        creds = db.query(SiteCredential).filter(
            SiteCredential.site_id == site_id,
            SiteCredential.platform.in_(platforms)
        ).all()
        return [{"platform": c.platform, "credentials": c.credentials} for c in creds]
    finally:
        db.close()

def get_db_site_info(site_id):
    db = SessionLocal()
    try:
        site = db.query(Site).filter(Site.id == site_id).first()
        if site:
            return {
                "name": site.name,
                "url": site.url,
                "industry": site.industry,
                "city": site.city
            }
        return {}
    finally:
        db.close()

def save_db_processed_report(payload):
    db = SessionLocal()
    try:
        # Check if exists
        existing = db.query(ProcessedReport).filter(ProcessedReport.report_id == payload["report_id"]).first()
        if existing:
            for key, value in payload.items():
                setattr(existing, key, value)
        else:
            new_report = ProcessedReport(**payload)
            db.add(new_report)
        db.commit()
    finally:
        db.close()

def get_db_competitor_insights(site_id, source_module):
    db = SessionLocal()
    try:
        insights = db.query(CompetitorInsight).filter(
            CompetitorInsight.site_id == site_id,
            CompetitorInsight.source_module == source_module
        ).all()
        return [{"competitor_url": i.competitor_url, "discovery_query": i.discovery_query} for i in insights]
    finally:
        db.close()

def upsert_db_competitor_insight(payload):
    db = SessionLocal()
    try:
        existing = db.query(CompetitorInsight).filter(
            CompetitorInsight.site_id == payload["site_id"],
            CompetitorInsight.competitor_url == payload["competitor_url"],
            CompetitorInsight.source_module == payload["source_module"]
        ).first()
        if existing:
            for key, value in payload.items():
                setattr(existing, key, value)
        else:
            new_insight = CompetitorInsight(**payload)
            db.add(new_insight)
        db.commit()
    finally:
        db.close()

def get_db_user_credentials(user_id, platform, db: SessionLocal = None):
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
    try:
        cred = db.query(UserCredential).filter(
            UserCredential.user_id == user_id,
            UserCredential.platform == platform
        ).first()
        return {"credentials": cred.credentials} if cred else None
    finally:
        if should_close:
            db.close()

def get_db_competitor_insight(site_id, competitor_url, source_module):
    db = SessionLocal()
    try:
        insight = db.query(CompetitorInsight).filter(
            CompetitorInsight.site_id == site_id,
            CompetitorInsight.competitor_url == competitor_url,
            CompetitorInsight.source_module == source_module
        ).first()
        if insight:
            return {
                "competitor_url": insight.competitor_url,
                "competitor_name": insight.competitor_name,
                "full_text": insight.full_text,
                "key_phrases": insight.key_phrases,
                "cta": insight.cta,
                "entities": insight.entities,
                "trust_signals": insight.trust_signals,
                "raw_text_preview": insight.raw_text_preview,
                "extracted_at": insight.extracted_at.isoformat() if insight.extracted_at else None,
                "discovery_query": insight.discovery_query,
                "source_module": insight.source_module
            }
        return None
    finally:
        db.close()
