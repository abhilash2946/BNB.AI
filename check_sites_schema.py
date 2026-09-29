import os
import sys

# Add fastapi-backend to sys.path to import app.database
sys.path.append(os.path.join(os.path.dirname(__file__), "fastapi-backend"))

from app.database import SessionLocal, Site

db = SessionLocal()
try:
    # Use SQLAlchemy table definition to get columns
    columns = [column.name for column in Site.__table__.columns]

    # Check if there is data
    res = db.query(Site).first()
    if res:
        print(f"Columns: {columns}")
    else:
        print("No data in sites to check columns.")
        # Optional: still show schema even if empty
        print(f"Schema (from Model): {columns}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
