import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

try:
    res = supabase.table("sites").select("*").limit(1).execute()
    if res.data:
        print(f"Columns: {list(res.data[0].keys())}")
    else:
        print("No data in sites to check columns.")
except Exception as e:
    print(f"Error: {e}")
