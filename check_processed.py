import os
import sys

# Add fastapi-backend to sys.path to import app.database
sys.path.append(os.path.join(os.path.dirname(__file__), "fastapi-backend"))

from app.database import SessionLocal, ProcessedReport

db = SessionLocal()
try:
    reports = db.query(ProcessedReport).limit(5).all()
    print(f"Processed reports count: {len(reports)}")
    for report in reports:
        print(f"Report ID: {report.report_id}")
finally:
    db.close()
