from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from app.config import settings
from app.supabase_client import supabase
from app.services.credential_service import get_user_google_creds

async def get_access_token_from_refresh(user_id: str, scopes: list) -> str:
    # Fetch refresh token from user_credentials
    resp = supabase.table("user_credentials").select("credentials").eq("user_id", user_id).eq("platform", "google_oauth").single().execute()
    if not resp.data:
        raise Exception(f"No Google OAuth credentials found for user {user_id}")

    google_creds = get_user_google_creds(user_id)
    refresh_token = resp.data["credentials"].get("refresh_token")
    if not refresh_token:
         raise Exception(f"No refresh token found for user {user_id}")

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=google_creds["client_id"],
        client_secret=google_creds["client_secret"],
        scopes=scopes,
    )
    creds.refresh(Request())
    return creds.token
