import hashlib
import base64
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
from app.config import settings
from app.supabase_client import supabase
from app.services.credential_service import get_user_google_creds, get_user_meta_creds

router = APIRouter(prefix="/auth", tags=["oauth"])

def get_pkce_verifier(user_id: str) -> str:
    google_creds = get_user_google_creds(user_id)
    raw = f"{user_id}:{google_creds['client_secret']}"
    return base64.urlsafe_b64encode(hashlib.sha256(raw.encode()).digest()).decode('utf-8').rstrip('=')

def get_pkce_challenge(verifier: str) -> str:
    return base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode('utf-8').rstrip('=')

@router.get("/google/url")
async def get_google_auth_url(user_id: str, site_id: str = None):
    google_creds = get_user_google_creds(user_id)
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": google_creds["client_id"],
                "client_secret": google_creds["client_secret"],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [google_creds["redirect_uri"]],
            }
        },
        scopes=[
            "https://www.googleapis.com/auth/analytics.readonly",
            "https://www.googleapis.com/auth/webmasters.readonly",
            "https://www.googleapis.com/auth/adwords",
        ],
    )
    flow.redirect_uri = google_creds["redirect_uri"]
    state = f"{user_id}:{site_id or ''}"

    # Standard flow without PKCE for maximum compatibility across environments
    auth_url, _ = flow.authorization_url(
        prompt="consent", 
        state=state, 
        access_type="offline"
    )
    return {"url": auth_url}

@router.get("/google/callback")
async def google_callback(request: Request, code: str = None, state: str = None):
    try:
        if not code:
            raise HTTPException(status_code=400, detail="Missing code")
        parts = state.split(":")
        user_id = parts[0]
        site_id = parts[1] if len(parts) > 1 else None

        # Get User specific Google creds
        google_creds = get_user_google_creds(user_id)

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": google_creds["client_id"],
                    "client_secret": google_creds["client_secret"],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [google_creds["redirect_uri"]],
                }
            },
            scopes=[
                "https://www.googleapis.com/auth/analytics.readonly",
                "https://www.googleapis.com/auth/webmasters.readonly",
                "https://www.googleapis.com/auth/adwords",
            ],
        )
        flow.redirect_uri = google_creds["redirect_uri"]

        # Standard flow without PKCE for now to ensure compatibility
        # We ensure the redirect_uri is set EXACTLY as registered in Google Console
        flow.redirect_uri = google_creds["redirect_uri"]

        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Store refresh token in Supabase (Merging with existing IDs)
        supabase.table("user_credentials").upsert({
            "user_id": user_id,
            "platform": "google_oauth",
            "credentials": {
                **google_creds,
                "refresh_token": credentials.refresh_token,
            }
        }).execute()

        redirect_url = f"{settings.frontend_url}/onboarding?step=3&success=true"
        if site_id:
            redirect_url += f"&site_id={site_id}"
        return RedirectResponse(url=redirect_url)
    except Exception as e:
        import traceback
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "traceback": traceback.format_exc(),
                "user_id": user_id if 'user_id' in locals() else None,
                "redirect_uri": google_creds.get("redirect_uri") if 'google_creds' in locals() else None
            }
        )

@router.get("/meta/url")
async def get_meta_auth_url(user_id: str):
    meta_creds = get_user_meta_creds(user_id)
    app_id = meta_creds.get("app_id")
    if not app_id:
        raise HTTPException(status_code=400, detail="Meta App ID not configured")

    scope = "ads_read,business_management,pages_read_engagement,instagram_basic,pages_show_list"
    redirect_uri = f"{settings.api_url}/auth/meta/callback"
    state = user_id

    auth_url = (
        f"https://www.facebook.com/v21.0/dialog/oauth?"
        f"client_id={app_id}&"
        f"redirect_uri={redirect_uri}&"
        f"state={state}&"
        f"scope={scope}"
    )
    return {"url": auth_url}

@router.get("/meta/callback")
async def meta_callback(request: Request, code: str = None, state: str = None):
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    user_id = state

    # Get User specific Meta creds
    meta_creds = get_user_meta_creds(user_id)
    app_id = meta_creds.get("app_id")
    app_secret = meta_creds.get("app_secret")
    redirect_uri = f"{settings.api_url}/auth/meta/callback"

    if not app_id or not app_secret:
         raise HTTPException(status_code=400, detail="Meta App credentials not found")

    # Exchange code for short-lived token
    url = "https://graph.facebook.com/v21.0/oauth/access_token"
    params = {
        "client_id": app_id,
        "redirect_uri": redirect_uri,
        "client_secret": app_secret,
        "code": code,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Token exchange failed: " + resp.text)
        data = resp.json()
        short_token = data["access_token"]

    # Exchange short-lived token for long-lived token
    exchange_url = "https://graph.facebook.com/v21.0/oauth/access_token"
    exchange_params = {
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": app_secret,
        "fb_exchange_token": short_token,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(exchange_url, params=exchange_params)
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Long-lived token exchange failed: " + resp.text)
        data = resp.json()
        long_token = data["access_token"]
        expires_in = data.get("expires_in", 5184000)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Store in user_credentials
    supabase.table("user_credentials").upsert({
        "user_id": user_id,
        "platform": "meta_long_lived_token",
        "credentials": {
            "token": long_token,
            "expires_at": expires_at.isoformat()
        }
    }, on_conflict="user_id, platform").execute()

    return RedirectResponse(url=f"{settings.frontend_url}/onboarding?step=3&success=true")

from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import httpx

class MetaTokenRequest(BaseModel):
    short_token: str
    user_id: str

@router.post("/meta/exchange")
async def exchange_meta_token(req: MetaTokenRequest):
    # Trim the token and ensure we have credentials
    token = req.short_token.strip()

    # Get User specific Meta App Creds
    meta_creds = get_user_meta_creds(req.user_id)
    app_id = meta_creds["app_id"].strip()
    app_secret = meta_creds["app_secret"].strip()

    # Masked log for debugging
    masked_id = f"{app_id[:4]}...{app_id[-4:]}" if len(app_id) > 8 else app_id
    print(f"---> Debug: Meta exchange attempt for user {req.user_id}. App ID: {masked_id}")

    if not app_id or not app_secret:
        raise HTTPException(status_code=400, detail="Meta App ID or Secret not configured in backend .env")

    # Use v21.0 (latest stable) instead of v25.0 which might be future/invalid
    url = "https://graph.facebook.com/v21.0/oauth/access_token"
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": app_secret,
        "fb_exchange_token": token,
    }

    async with httpx.AsyncClient() as client:
        # Using GET as per Meta docs for exchange token, but providing params clearly
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            print(f"!!! Meta Token Exchange Error: {resp.text}")
            if '"code": 101' in resp.text or '"code":101' in resp.text:
                 print(f"!!! CRITICAL: Meta App ID '{app_id}' or Secret is invalid.")
            raise HTTPException(status_code=400, detail="Token exchange failed: " + resp.text)

        data = resp.json()
        long_token = data["access_token"]
        expires_in = data.get("expires_in", 5184000)  # seconds (default 60 days)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Store in user_credentials
    supabase.table("user_credentials").upsert({
        "user_id": req.user_id,
        "platform": "meta_long_lived_token",
        "credentials": {
            "token": long_token,
            "expires_at": expires_at.isoformat()
        }
    }, on_conflict="user_id, platform").execute()

    return {
        "success": True,
        "expires_at": expires_at.isoformat(),
        "expires_in_days": expires_in // 86400
    }
