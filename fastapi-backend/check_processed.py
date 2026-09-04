from app.database import SessionLocal, ProcessedReport

db = SessionLocal()
try:
    reports = db.query(ProcessedReport).limit(5).all()
    print(f"Processed reports count: {len(reports)}")
    for report in reports:
        print(f"Report ID: {report.report_id}")
finally:
    db.close()
