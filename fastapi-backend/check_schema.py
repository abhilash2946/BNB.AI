from app.database import SessionLocal, ProcessedReport

db = SessionLocal()
try:
    # Use SQLAlchemy table definition to get columns
    columns = [column.name for column in ProcessedReport.__table__.columns]

    # Check if there is data
    res = db.query(ProcessedReport).first()
    if res:
        print(f"Columns: {columns}")
    else:
        print("No data in processed_reports to check columns.")
        # Optional: still show schema even if empty
        print(f"Schema (from Model): {columns}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
