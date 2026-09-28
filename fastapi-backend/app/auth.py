import jwt
import base64
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import traceback

from app.config import settings
from app.database import get_db, Profile

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

def get_secret():
    if settings.jwt_secret:
        return settings.jwt_secret
    secret = settings.supabase_jwt_secret
    if not secret:
        return "super-secret-jwt-key-for-bnb-app"

    try:
        missing_padding = len(secret) % 4
        if missing_padding:
            secret += "=" * (4 - missing_padding)
        return base64.b64decode(secret)
    except Exception:
        return secret

async def get_current_user(
    auth: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = auth.credentials
    try:
        # Decode token payload
        payload = jwt.decode(
            token,
            get_secret(),
            algorithms=["HS256", "RS256", "ES256"],
            options={"verify_signature": False, "verify_aud": False, "verify_iat": False}
        )
            algorithms=["HS256", "RS256", "ES256"],
            options={"verify_signature": False, "verify_aud": False, "verify_iat": False}
        )

        user_id = payload.get("sub")
        email = payload.get("email")

        if not user_id:
            print("!!! AUTH ERROR: sub missing from token")
            raise HTTPException(status_code=401, detail="Invalid token: sub missing")

        # print(f"DEBUG: JWT Verified for {email or user_id}")

        # Ensure user exists in local database (Sync Profile)
        profile = db.query(Profile).filter(Profile.id == user_id).first()
        if not profile:
            print(f"---> Creating local profile record for user {user_id}")
            profile = Profile(
                id=user_id,
                email=email,
                created_at=datetime.utcnow()
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)

        return user_id

    except jwt.ExpiredSignatureError:
        print("!!! AUTH ERROR: Token has expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        print(f"!!! AUTH ERROR: Invalid token: {str(e)}")
        # Log the first 20 chars of the secret for debugging (masked)
        secret = str(get_secret())
        # print(f"DEBUG: Using secret starting with: {secret[:10]}...")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        print(f"!!! AUTH ERROR: Unexpected error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=401, detail="Authentication failed")

async def get_optional_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    db: Session = Depends(get_db)
):
    if not auth or not auth.credentials:
        return None

    token = auth.credentials
    try:
        payload = jwt.decode(
            token,
            get_secret(),
            algorithms=["HS256", "RS256", "ES256"],
            options={"verify_signature": False, "verify_aud": False, "verify_iat": False}
        )
        return payload.get("sub")
    except Exception:
        return None
