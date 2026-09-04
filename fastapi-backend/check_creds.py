from app.database import SessionLocal, UserCredential

db = SessionLocal()
try:
    user_id = "72a88dd1-4d07-4fdb-b5f1-a441a392c762"
    res = db.query(UserCredential).filter(
        UserCredential.user_id == user_id,
        UserCredential.platform == "google_oauth"
    ).first()

    if res:
        creds = res.credentials
        print(f"✅ Found credentials for user {user_id}")
        print(f"Client ID: {creds.get('client_id')[:10]}...")
        print(f"Secret set: {'Yes' if creds.get('client_secret') else 'No'}")
        print(f"Redirect URI: {creds.get('redirect_uri')}")
    else:
        print(f"❌ No google_oauth credentials found in DB for user {user_id}. Did you click 'Update Neural Sync Keys'?")
finally:
    db.close()
