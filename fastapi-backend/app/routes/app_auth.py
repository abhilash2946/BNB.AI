import jwt
import requests
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, Profile, UserCredential
from app.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["app_auth"])

def create_app_token(user_id: str, email: str) -> str:
    secret = settings.jwt_secret or settings.supabase_jwt_secret or "super-secret-jwt-key-for-bnb-app"
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    }
    return jwt.encode(payload, secret, algorithm=settings.jwt_algorithm)

def get_system_google_oauth_creds(db: Session = None):
    client_id = settings.app_google_client_id or settings.google_client_id
    client_secret = settings.app_google_client_secret or settings.google_client_secret

    if client_id and client_secret:
        return client_id, client_secret

    # Fallback: Check if Google credentials exist in MySQL UserCredential table
    if db is not None:
        try:
            cred = db.query(UserCredential).filter(UserCredential.platform == "google_oauth").first()
            if cred and cred.credentials:
                c = cred.credentials
                cid = c.get("client_id")
                csecret = c.get("client_secret")
                if cid and csecret:
                    return cid, csecret
        except Exception as e:
            print(f"!!! APP AUTH WARNING: DB cred lookup failed: {e}")

    return client_id, client_secret

@router.get("/app-login/google")
async def app_google_login(db: Session = Depends(get_db)):
    client_id, _ = get_system_google_oauth_creds(db)
    if not client_id:
        raise HTTPException(
            status_code=500,
            detail="Google Client ID is not configured. Configure Google Protocol in Site Management or set GOOGLE_CLIENT_ID in .env"
        )

    redirect_uri = f"{settings.api_url}/auth/app-login/google/callback"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account"
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=auth_url)

@router.get("/app-login/google/callback")
async def app_google_callback(request: Request, code: str = None, error: str = None, db: Session = Depends(get_db)):
    if error:
        return RedirectResponse(url=f"{settings.frontend_url}?error={error}")

    if not code:
        return RedirectResponse(url=f"{settings.frontend_url}?error=missing_code")

    client_id, client_secret = get_system_google_oauth_creds(db)
    redirect_uri = f"{settings.api_url}/auth/app-login/google/callback"

    try:
        # Exchange authorization code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

        resp = requests.post(token_url, data=token_data)
        if resp.status_code != 200:
            print(f"!!! APP AUTH ERROR: Token exchange failed: {resp.text}")
            return RedirectResponse(url=f"{settings.frontend_url}?error=token_exchange_failed")

        tokens = resp.json()
        access_token = tokens.get("access_token")

        # Fetch Google user profile
        userinfo_resp = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if userinfo_resp.status_code != 200:
            print(f"!!! APP AUTH ERROR: Userinfo failed: {userinfo_resp.text}")
            return RedirectResponse(url=f"{settings.frontend_url}?error=userinfo_failed")

        userinfo = userinfo_resp.json()
        google_sub = userinfo.get("sub")
        email = userinfo.get("email")
        name = userinfo.get("name", email.split("@")[0] if email else "User")
        picture = userinfo.get("picture", "")

        if not email:
            return RedirectResponse(url=f"{settings.frontend_url}?error=missing_email")

        # Check or create profile in MySQL DB
        user = db.query(Profile).filter((Profile.email == email) | (Profile.id == google_sub)).first()
        if not user:
            user = Profile(
                id=google_sub or f"user_{datetime.utcnow().timestamp()}",
                email=email,
                name=name,
                avatar_url=picture,
                created_at=datetime.utcnow()
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update user info if missing
            if name and not user.name:
                user.name = name
            if picture and not user.avatar_url:
                user.avatar_url = picture
            db.commit()

        # Issue custom JWT token
        token = create_app_token(user.id, user.email)
        return RedirectResponse(url=f"{settings.frontend_url}?token={token}")

    except Exception as e:
        print(f"!!! APP AUTH EXCEPTION: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}?error=auth_exception")

@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(Profile).filter(Profile.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "agency_name": user.agency_name,
        "avatar_url": user.avatar_url,
        "role": user.role,
        "tier": user.tier
    }
