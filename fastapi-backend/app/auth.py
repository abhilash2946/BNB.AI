import jwt
import base64
from fastapi import HTTPException, Security, Depends
# ... (rest of imports)

security = HTTPBearer()

def get_secret():
    secret = settings.supabase_jwt_secret
    # Handle base64 encoded secret (common with Supabase)
    try:
        # Check if it looks like base64
        if len(secret) % 4 == 0 and any(c in secret for c in "+/="):
             return base64.b64decode(secret)
    except Exception:
        pass
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
            raise HTTPException(status_code=401, detail="Invalid token: sub missing")

        # Ensure user exists in local database (Sync Profile)
        profile = db.query(Profile).filter(Profile.id == user_id).first()
        if not profile:
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
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
