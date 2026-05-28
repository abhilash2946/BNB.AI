import hashlib
import base64
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from app.config import settings
from app.supabase_client import supabase

router = APIRouter(prefix="/auth", tags=["oauth"])

def get_pkce_verifier(user_id: str) -> str:
    raw = f"{user_id}:{settings.google_client_secret}"
    return base64.urlsafe_b64encode(hashlib.sha256(raw.encode()).digest()).decode('utf-8').rstrip('=')

def get_pkce_challenge(verifier: str) -> str:
    return base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode('utf-8').rstrip('=')

@router.get("/google/url")
async def get_google_auth_url(user_id: str, site_id: str = None):
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri],
            }
        },
        scopes=[
            "https://www.googleapis.com/auth/analytics.readonly",
            "https://www.googleapis.com/auth/webmasters.readonly",
            "https://www.googleapis.com/auth/adwords",
        ],
    )
    flow.redirect_uri = settings.google_redirect_uri
    state = f"{user_id}:{site_id or ''}"
    
    verifier = get_pkce_verifier(user_id)
    challenge = get_pkce_challenge(verifier)
    
    auth_url, _ = flow.authorization_url(
        prompt="consent", 
        state=state, 
        access_type="offline",
        code_challenge=challenge,
        code_challenge_method="S256"
    )
    return {"url": auth_url}

@router.get("/google/callback")
async def google_callback(request: Request, code: str = None, state: str = None):
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    parts = state.split(":")
    user_id = parts[0]
    site_id = parts[1] if len(parts) > 1 else None

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri],
            }
        },
        scopes=[
            "https://www.googleapis.com/auth/analytics.readonly",
            "https://www.googleapis.com/auth/webmasters.readonly",
            "https://www.googleapis.com/auth/adwords",
        ],
    )
    flow.redirect_uri = settings.google_redirect_uri
    
    verifier = get_pkce_verifier(user_id)
    flow.fetch_token(code=code, code_verifier=verifier)
    credentials = flow.credentials

    # Store refresh token in Supabase
    supabase.table("user_credentials").upsert({
        "user_id": user_id,
        "platform": "google_oauth",
        "credentials": {
            "refresh_token": credentials.refresh_token,
        }
    }).execute()

    redirect_url = f"{settings.frontend_url}/onboarding?step=3&success=true"
    if site_id:
        redirect_url += f"&site_id={site_id}"
    return RedirectResponse(url=redirect_url)
