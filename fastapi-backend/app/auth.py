import jwt
import base64
from datetime import datetime
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import traceback

from app.config import settings
from app.database import get_db, Profile

security = HTTPBearer()

def get_secret():
    secret = settings.supabase_jwt_secret
    if not secret:
        print("!!! AUTH ERROR: SUPABASE_JWT_SECRET is not set in .env")
        return ""

    # Safe Logging: Log the first 5 characters for verification in PM2
    print(f"---> [Auth] Using Secret starting with: {secret[:5]}...")

    try:
        # Supabase secrets are often base64 encoded.
        # Add padding if missing for base64
        padded_secret = secret
        missing_padding = len(padded_secret) % 4
        if missing_padding:
            padded_secret += '=' * (4 - missing_padding)

        decoded = base64.b64decode(padded_secret)
        # Verify it's actually valid by attempting to decode it back (heuristic check)
        return decoded
    except Exception as e:
        # Fallback to use the secret as-is if base64 decoding fails
        print(f"---> [Auth] Secret not base64 encoded, using raw string. Error: {e}")
        return secret

async def get_current_user(
    auth: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = auth.credentials
    try:
        # Verify the Supabase JWT using the secret
        payload = jwt.decode(
            token,
            get_secret(),
            algorithms=["HS256"],
            options={"verify_aud": False}
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
