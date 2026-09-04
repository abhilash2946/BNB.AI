import os
import json
from supabase import create_client
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# 1. Supabase Connection
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. Local MySQL Connection
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def migrate_table(table_name, columns):
    print(f"---> Migrating {table_name}...")

    # Fetch from Supabase
    res = supabase.table(table_name).select("*").execute()
    data = res.data

    if not data:
        print(f"     No data found in {table_name}.")
        return

    # Clear local table first to avoid duplicates (Optional, safer for fresh start)
    db.execute(text(f"SET FOREIGN_KEY_CHECKS = 0;"))
    db.execute(text(f"DELETE FROM {table_name};"))
    db.execute(text(f"SET FOREIGN_KEY_CHECKS = 1;"))
    db.commit()

    # Insert into MySQL
    for row in data:
        # Prepare columns and values
        cols = []
        placeholders = []
        params = {}

        for col in columns:
            val = row.get(col)
            # Handle JSON/Dict types for MySQL
            if isinstance(val, (dict, list)):
                val = json.dumps(val)

            cols.append(col)
            placeholders.append(f":{col}")
            params[col] = val

        sql = f"INSERT INTO {table_name} ({', '.join(cols)}) VALUES ({', '.join(placeholders)})"
        db.execute(text(sql), params)

    db.commit()
    print(f"✅ Successfully migrated {len(data)} rows to {table_name}.")

if __name__ == "__main__":
    try:
        # 1. Migrate Profiles
        migrate_table("profiles", ["id", "name", "agency_name", "role", "avatar_url", "tier", "created_at", "email"])

        # 2. Migrate Sites
        migrate_table("sites", ["id", "user_id", "name", "url", "industry", "seo_settings", "created_at", "image_url", "city", "phone", "email"])

        # 3. Migrate User Credentials (Google/Meta OAuth)
        migrate_table("user_credentials", ["id", "user_id", "platform", "credentials", "created_at", "updated_at"])

        # 4. Migrate Site Credentials (GA4/GSC IDs)
        migrate_table("site_credentials", ["id", "site_id", "platform", "credentials", "created_at", "updated_at"])

        print("\n🎉 Migration Complete! Your credentials and users are now local.")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
    finally:
        db.close()
