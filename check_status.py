import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

res = supabase.table("report_status").select("*").order("created_at", desc=True).limit(5).execute()
for row in res.data:
    print(f"ID: {row['report_id']}, Module: {row['module']}, Status: {row['status']}, Error: {row.get('error_message')}")
