from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from app.config import settings
from app.services.credential_service import get_user_google_creds
from app.utils.db_worker_helpers import get_db_user_credentials

from sqlalchemy.orm import Session

async def get_access_token_from_refresh(user_id: str, scopes: list, db: Session = None) -> str:
    # Fetch refresh token from user_credentials using database helper
    resp = get_db_user_credentials(user_id, "google_oauth", db=db)
    if not resp or "credentials" not in resp:
        raise Exception(f"No Google OAuth credentials found for user {user_id}")

    refresh_token = resp["credentials"].get("refresh_token")
    if not refresh_token:
         raise Exception(f"No refresh token found for user {user_id}")

    google_creds = get_user_google_creds(user_id, db=db)

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
