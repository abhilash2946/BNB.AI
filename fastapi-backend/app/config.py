import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Get the directory of this file (app/) and go up one level to the backend root
base_dir = Path(__file__).resolve().parent.parent
env_file = base_dir / ".env"

if env_file.exists():
    load_dotenv(dotenv_path=env_file)
    print(f"---> Config: Loaded .env from {env_file}")
else:
    print(f"!!! Config Warning: .env file not found at {env_file}")

class Settings(BaseSettings):
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    pagespeed_api_key: str = os.getenv("PAGESPEED_API_KEY", "")

    # These are defaults from Env, but often overridden by User Credentials from DB
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    google_redirect_uri: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
    api_url: str = os.getenv("API_URL", "http://localhost:8000")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    meta_app_id: str = os.getenv("META_APP_ID", "")
    meta_app_secret: str = os.getenv("META_APP_SECRET", "")
    openserp_url: str = os.getenv("OPENSERP_URL", "http://localhost:7000")

    class Config:
        extra = "ignore"

settings = Settings()
