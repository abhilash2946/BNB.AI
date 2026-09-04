import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("fastapi-backend/.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

user_id = "72a88dd1-4d07-4fdb-b5f1-a441a392c762"
res = supabase.table("user_credentials").select("*").eq("user_id", user_id).eq("platform", "google_oauth").execute()

if res.data:
    creds = res.data[0]['credentials']
    print(f"✅ Found credentials for user {user_id}")
    print(f"Client ID: {creds.get('client_id')[:10]}...")
    print(f"Secret set: {'Yes' if creds.get('client_secret') else 'No'}")
    print(f"Redirect URI: {creds.get('redirect_uri')}")
else:
    print(f"❌ No google_oauth credentials found in DB for user {user_id}. Did you click 'Update Neural Sync Keys'?")
