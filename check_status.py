import os
import sys

# Add fastapi-backend to sys.path to import app.database
sys.path.append(os.path.join(os.path.dirname(__file__), "fastapi-backend"))

from app.database import SessionLocal, ReportStatus

db = SessionLocal()
try:
    reports = db.query(ReportStatus).order_by(ReportStatus.created_at.desc()).limit(5).all()
    for row in reports:
        print(f"ID: {row.report_id}, Module: {row.module}, Status: {row.status}, Error: {row.error_message}")
finally:
    db.close()
