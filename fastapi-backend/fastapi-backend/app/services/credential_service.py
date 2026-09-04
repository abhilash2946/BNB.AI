import logging
from typing import Dict, Any, Optional
from app.supabase_client import supabase
from app.config import settings

logger = logging.getLogger(__name__)

def get_user_google_creds(user_id: str) -> Dict[str, str]:
    """
    Fetches Google OAuth Client ID and Secret for a specific user from user_credentials table.
    Falls back to settings (Env vars) if not found in DB.
    """
    try:
        resp = supabase.table("user_credentials").select("credentials").eq("user_id", user_id).eq("platform", "google_oauth").execute()
        if resp.data and "client_id" in resp.data[0]["credentials"]:
            creds = resp.data[0]["credentials"]
            return {
                "client_id": creds.get("client_id") or settings.google_client_id,
                "client_secret": creds.get("client_secret") or settings.google_client_secret,
                "redirect_uri": creds.get("redirect_uri") or settings.google_redirect_uri,
                "refresh_token": creds.get("refresh_token"),
                "granted_scopes": creds.get("granted_scopes")
            }
    except Exception as e:
        logger.debug(f"No custom Google creds for user {user_id}: {e}")

    return {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri
    }

def get_user_meta_creds(user_id: str) -> Dict[str, str]:
    """
    Fetches Meta App ID and Secret for a specific user from user_credentials table.
    Falls back to settings (Env vars) if not found in DB.
    """
    try:
        resp = supabase.table("user_credentials").select("credentials").eq("user_id", user_id).eq("platform", "meta_app_creds").execute()
        if resp.data and "app_id" in resp.data[0]["credentials"]:
            creds = resp.data[0]["credentials"]
            return {
                "app_id": creds.get("app_id") or settings.meta_app_id,
                "app_secret": creds.get("app_secret") or settings.meta_app_secret
            }
    except Exception as e:
        logger.debug(f"No custom Meta creds for user {user_id}: {e}")

    return {
        "app_id": settings.meta_app_id,
        "app_secret": settings.meta_app_secret
    }
