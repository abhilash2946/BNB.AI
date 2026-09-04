import logging
from typing import Dict, Any, Optional
from app.config import settings
from app.database import SessionLocal, UserCredential

logger = logging.getLogger(__name__)

def get_user_google_creds(user_id: str, db: Session = None) -> Dict[str, str]:
    """
    Fetches Google OAuth Client ID and Secret for a specific user from local MySQL.
    Falls back to settings (Env vars) if not found in DB.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
    try:
        cred = db.query(UserCredential).filter(
            UserCredential.user_id == user_id,
            UserCredential.platform == "google_oauth"
        ).first()

        if cred and cred.credentials and "client_id" in cred.credentials:
            c = cred.credentials
            return {
                "client_id": c.get("client_id") or settings.google_client_id,
                "client_secret": c.get("client_secret") or settings.google_client_secret,
                "redirect_uri": c.get("redirect_uri") or settings.google_redirect_uri,
                "refresh_token": c.get("refresh_token"),
                "granted_scopes": c.get("granted_scopes")
            }
    except Exception as e:
        logger.debug(f"No custom Google creds for user {user_id}: {e}")
    finally:
        if should_close:
            db.close()

    return {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri
    }

def get_user_meta_creds(user_id: str, db: Session = None) -> Dict[str, str]:
    """
    Fetches Meta App ID and Secret for a specific user from local MySQL.
    Falls back to settings (Env vars) if not found in DB.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
    try:
        cred = db.query(UserCredential).filter(
            UserCredential.user_id == user_id,
            UserCredential.platform == "meta_app_creds"
        ).first()

        if cred and cred.credentials and "app_id" in cred.credentials:
            c = cred.credentials
            return {
                "app_id": c.get("app_id") or settings.meta_app_id,
                "app_secret": c.get("app_secret") or settings.meta_app_secret
            }
    except Exception as e:
        logger.debug(f"No custom Meta creds for user {user_id}: {e}")
    finally:
        if should_close:
            db.close()

    return {
        "app_id": settings.meta_app_id,
        "app_secret": settings.meta_app_secret
    }
