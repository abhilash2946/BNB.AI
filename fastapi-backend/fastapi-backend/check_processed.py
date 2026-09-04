import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

res = supabase.table("processed_reports").select("report_id").limit(5).execute()
print(f"Processed reports count: {len(res.data)}")
for row in res.data:
    print(f"Report ID: {row['report_id']}")
