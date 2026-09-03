import os
import requests
from supabase import create_client
from dotenv import load_dotenv

# Use the path to your .env file
load_dotenv(".env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# The user ID from your logs
user_id = "72a88dd1-4d07-4fdb-b5f1-a441a392c762"

print(f"--- Google Token Diagnostic for User: {user_id} ---")

res = supabase.table("user_credentials").select("*").eq("user_id", user_id).eq("platform", "google_oauth").execute()

if not res.data:
    print("❌ ERROR: No Google credentials found in Supabase.")
    exit()

creds = res.data[0]['credentials']
refresh_token = creds.get('refresh_token')
client_id = creds.get('client_id')
client_secret = creds.get('client_secret')

if not refresh_token:
    print("❌ ERROR: refresh_token is missing from the database. You need to re-sync Google Cloud.")
    exit()

print("✅ Found Refresh Token in database.")

# Step 1: Exchange Refresh Token for an Access Token
print("--- Checking Token Validity with Google ---")
token_url = "https://oauth2.googleapis.com/token"
data = {
    "client_id": client_id,
    "client_secret": client_secret,
    "refresh_token": refresh_token,
    "grant_type": "refresh_token"
}

resp = requests.post(token_url, data=data)

if resp.status_code != 200:
    print(f"❌ FAILED: Google rejected the refresh token.")
    print(f"Response: {resp.text}")
    exit()

access_token = resp.json().get('access_token')
print("✅ Refresh token is VALID (Successfully generated an access token).")

# Step 2: Check Scopes
print("--- Verifying Scopes (Permissions) ---")
info_url = f"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token={access_token}"
info_resp = requests.get(info_url)

if info_resp.status_code != 200:
    print("❌ FAILED: Could not retrieve token info from Google.")
    exit()

scopes = info_resp.json().get('scope', '').split(' ')

required_scopes = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/adwords"
]

missing = []
for req in required_scopes:
    if req in scopes:
        print(f"✅ PERMISSION GRANTED: {req.split('/')[-1]}")
    else:
        print(f"❌ MISSING PERMISSION: {req.split('/')[-1]}")
        missing.append(req)

if not missing:
    print("\n🚀 SUCCESS: Your token has all required permissions!")
else:
    print(f"\n⚠️ WARNING: Your token is missing {len(missing)} permissions.")
    print("Action: Go to Google Cloud Console, ensure these scopes are enabled, and click 'Sync' again.")
