# ============================================================
# BNB.AI MARKETING INTELLIGENCES API
# app/main.py
# ============================================================

import uuid
import os
import shutil
import traceback
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, BackgroundTasks, HTTPException, File, UploadFile, Depends, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.docs import (
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.config import settings
from app.database import (
    ProcessedReport, ReportStatus, Site,
    UserCredential, SiteCredential, Profile, SharedReport, get_db
)
from app.auth import get_current_user
from app.models import (
    ReportRequest, ReportResponse, AdviceSummarizeRequest,
    SiteCreate, SiteUpdate, UserCredentialCreate, SiteCredentialCreate,
    ProfileUpdate, SharedReportCreate
)

# ============================================================
# INITIALIZATION & DIRECTORIES
# ============================================================

# Disable PKCE for Google Auth to ensure compatibility
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

# Ensure static directories exist
os.makedirs("static/uploads", exist_ok=True)

# Initialize FastAPI App
app = FastAPI(
    title="BNB.AI Marketing Intelligences API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

# ============================================================
# MIDDLEWARE & ERROR HANDLING
# ============================================================

# --- Exception Catching Middleware ---
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    """
    Middleware to catch any unhandled exceptions, print full traceback for PM2 logs,
    and return a clean JSON error response.
    """
    try:
        return await call_next(request)
    except Exception as exc:
        print("============================================================")
        print(f"!!! CRITICAL ERROR CAUGHT IN MIDDLEWARE: {exc}")
        print(traceback.format_exc())
        print("============================================================")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "detail": "Internal Server Error",
                "message": str(exc),
                "type": type(exc).__name__
            }
        )

# --- Global Exception Handler (FastAPI Level) ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("============================================================")
    print(f"!!! GLOBAL EXCEPTION CAUGHT: {exc}")
    print(traceback.format_exc())
    print("============================================================")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "detail": "Internal Server Error",
            "message": str(exc),
            "type": type(exc).__name__
        }
    )

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://reports.blacknbold.in",
        "https://blacknbold.in",
        "https://www.blacknbold.in",
        "https://frontend.test",
        "http://frontend.test",
        "https://www.frontend.test",
        "http://www.frontend.test",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    # Regex to cover any variant of frontend.test and reports.blacknbold.in
    allow_origin_regex=r"https?://(.*\.)?(frontend\.test|blacknbold\.in|reports\.blacknbold\.in)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# STATIC FILES
# ============================================================

app.mount("/static", StaticFiles(directory="static"), name="static")

# ============================================================
# API ROUTER (Prefix: /api)
# ============================================================

api_router = APIRouter(prefix="/api")

# --- Profile Routes ---

@api_router.get("/profile", tags=["Profile"])
async def get_profile(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@api_router.patch("/profile", tags=["Profile"])
async def update_profile(profile_data: ProfileUpdate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for key, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile

# --- Site Routes ---

@api_router.get("/sites", tags=["Sites"])
async def list_sites(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    sites = db.query(Site).filter(Site.user_id == user_id).all()
    return sites

@api_router.post("/sites", tags=["Sites"])
async def create_site(site_data: SiteCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    new_site = Site(
        id=str(uuid.uuid4()),
        user_id=user_id,
        **site_data.model_dump()
    )
    db.add(new_site)
    db.commit()
    db.refresh(new_site)
    return new_site

@api_router.patch("/sites/{site_id}", tags=["Sites"])
async def update_site(site_id: str, site_data: SiteUpdate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    site = db.query(Site).filter(Site.id == site_id, Site.user_id == user_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found or access denied")

    for key, value in site_data.model_dump(exclude_unset=True).items():
        setattr(site, key, value)

    db.commit()
    db.refresh(site)
    return site

@api_router.delete("/sites/{site_id}", tags=["Sites"])
async def delete_site(site_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    site = db.query(Site).filter(Site.id == site_id, Site.user_id == user_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found or access denied")
    db.delete(site)
    db.commit()
    return {"success": True}

# --- Credential Routes ---

@api_router.get("/user-credentials", tags=["Credentials"])
async def list_user_credentials(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    creds = db.query(UserCredential).filter(UserCredential.user_id == user_id).all()
    return creds

@api_router.post("/user-credentials", tags=["Credentials"])
async def update_user_credentials(cred_data: UserCredentialCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(UserCredential).filter(
        UserCredential.user_id == user_id,
        UserCredential.platform == cred_data.platform
    ).first()

    if existing:
        existing.credentials = cred_data.credentials
        existing.updated_at = datetime.utcnow()
    else:
        new_cred = UserCredential(
            id=str(uuid.uuid4()),
            user_id=user_id,
            platform=cred_data.platform,
            credentials=cred_data.credentials
        )
        db.add(new_cred)
    db.commit()
    return {"success": True}

@api_router.post("/site-credentials", tags=["Credentials"])
async def update_site_credentials(cred_data: SiteCredentialCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify site ownership
    site = db.query(Site).filter(Site.id == cred_data.site_id, Site.user_id == user_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found or access denied")

    existing = db.query(SiteCredential).filter(
        SiteCredential.site_id == cred_data.site_id,
        SiteCredential.platform == cred_data.platform
    ).first()

    if existing:
        existing.credentials = cred_data.credentials
        existing.updated_at = datetime.utcnow()
    else:
        new_cred = SiteCredential(
            id=str(uuid.uuid4()),
            site_id=cred_data.site_id,
            platform=cred_data.platform,
            credentials=cred_data.credentials
        )
        db.add(new_cred)
    db.commit()
    return {"success": True}

# --- Report Routes ---

@api_router.post("/performance-report", tags=["Reports"])
async def performance_report(
    req: ReportRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.workers.performance_worker import run_performance_report

    # Cache Check
    existing = db.query(ProcessedReport).filter(
        ProcessedReport.site_id == req.site_id,
        ProcessedReport.module == "performance",
        ProcessedReport.start_date == req.start_date,
        ProcessedReport.end_date == req.end_date
    ).order_by(desc(ProcessedReport.created_at)).first()

    if existing:
        return {"success": True, "report_id": existing.report_id, "cached": True}

    report_id = str(uuid.uuid4())
    new_status = ReportStatus(
        report_id=report_id,
        user_id=user_id,
        site_id=req.site_id,
        module="performance",
        status="pending"
    )
    db.add(new_status)
    db.commit()

    background_tasks.add_task(
        run_performance_report,
        user_id,
        req.site_id,
        req.start_date,
        req.end_date,
        report_id,
        req.bnb_mode,
    )

    return ReportResponse(success=True, report_id=report_id)

@api_router.post("/seo-report", tags=["Reports"])
async def seo_report(
    req: ReportRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.workers.seo_worker import run_seo_report

    # Cache Check
    existing = db.query(ProcessedReport).filter(
        ProcessedReport.site_id == req.site_id,
        ProcessedReport.module == "seo",
        ProcessedReport.start_date == req.start_date,
        ProcessedReport.end_date == req.end_date
    ).order_by(desc(ProcessedReport.created_at)).first()

    if existing:
        return {"success": True, "report_id": existing.report_id, "cached": True}

    report_id = str(uuid.uuid4())
    new_status = ReportStatus(
        report_id=report_id,
        user_id=user_id,
        site_id=req.site_id,
        module="seo",
        status="pending"
    )
    db.add(new_status)
    db.commit()

    background_tasks.add_task(
        run_seo_report,
        user_id,
        req.site_id,
        req.start_date,
        req.end_date,
        report_id,
        req.bnb_mode,
    )

    return ReportResponse(success=True, report_id=report_id)

@api_router.post("/social-report", tags=["Reports"])
async def social_report(
    req: ReportRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.workers.social_worker import run_social_report

    # Cache Check
    existing = db.query(ProcessedReport).filter(
        ProcessedReport.site_id == req.site_id,
        ProcessedReport.module == "social",
        ProcessedReport.start_date == req.start_date,
        ProcessedReport.end_date == req.end_date
    ).order_by(desc(ProcessedReport.created_at)).first()

    if existing:
        return {"success": True, "report_id": existing.report_id, "cached": True}

    report_id = str(uuid.uuid4())
    new_status = ReportStatus(
        report_id=report_id,
        user_id=user_id,
        site_id=req.site_id,
        module="social",
        status="pending"
    )
    db.add(new_status)
    db.commit()

    background_tasks.add_task(
        run_social_report,
        user_id,
        req.site_id,
        req.start_date,
        req.end_date,
        report_id,
    )

    return ReportResponse(success=True, report_id=report_id)

@api_router.get("/report-status/{report_id}", tags=["Reports"])
async def get_report_status(report_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    status = db.query(ReportStatus).filter(ReportStatus.report_id == report_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="Report status not found")
    return status

@api_router.get("/processed-report/{report_id}", tags=["Reports"])
async def get_processed_report(
    report_id: str,
    site_id: Optional[str] = None,
    module: Optional[str] = None,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if report_id == "latest" and site_id and module:
        report = db.query(ProcessedReport).filter(
            ProcessedReport.site_id == site_id,
            ProcessedReport.module == module
        ).order_by(desc(ProcessedReport.created_at)).first()
    else:
        report = db.query(ProcessedReport).filter(ProcessedReport.report_id == report_id).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@api_router.patch("/processed-report/{report_id}", tags=["Reports"])
async def update_processed_report(
    report_id: str,
    update_data: Dict[str, Any],
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(ProcessedReport).filter(ProcessedReport.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    for key, value in update_data.items():
        if hasattr(report, key):
            setattr(report, key, value)

    db.commit()
    db.refresh(report)
    return report

@api_router.post("/shared-reports", tags=["Reports"])
async def create_shared_report(share_data: SharedReportCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify site ownership
    site = db.query(Site).filter(Site.id == share_data.site_id, Site.user_id == user_id).first()
    if not site:
        raise HTTPException(status_code=403, detail="Not authorized for this site")

    new_share = SharedReport(
        id=str(uuid.uuid4()),
        **share_data.model_dump()
    )
    db.add(new_share)
    db.commit()
    db.refresh(new_share)
    return new_share

@api_router.get("/shared-report-info/{share_id}", tags=["Public"])
async def get_shared_report_info(share_id: str, db: Session = Depends(get_db)):
    share = db.query(SharedReport).filter(SharedReport.id == share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Shared report not found")

    site = db.query(Site).filter(Site.id == share.site_id).first()
    return {
        "share": share,
        "site": {
            "name": site.name if site else "Unknown",
            "image_url": site.image_url if site else None
        }
    }

# --- AI & Summarization ---

@api_router.post("/summarize-advice", tags=["AI"])
async def api_summarize_advice(
    req: AdviceSummarizeRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.services.gemini import summarize_advice
    try:
        summarized = await summarize_advice(req.advice_list)
        report = db.query(ProcessedReport).filter(ProcessedReport.report_id == req.report_id).first()
        if report:
            report.ai_recommendations_summarized = summarized
            db.commit()
        return {"success": True, "summarized": summarized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- File Upload ---

@api_router.post("/upload", tags=["Uploads"])
async def upload_file(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    file_ext = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join("static/uploads", file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"{settings.api_url}/static/uploads/{file_name}"}

# --- System Health ---

@api_router.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "online",
        "database": "MySQL Connected",
        "timestamp": datetime.utcnow().isoformat()
    }

# ============================================================
# DOCUMENTATION ROUTES
# ============================================================

@api_router.get("/openapi.json", include_in_schema=False)
async def get_open_api_endpoint():
    return JSONResponse(app.openapi())

@api_router.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/api/openapi.json",
        title="BNB.AI API - Documentation",
        oauth2_redirect_url="/api/docs/oauth2-redirect",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.10/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.10/swagger-ui.css",
        swagger_ui_parameters={
            "persistAuthorization": True,
            "displayRequestDuration": True,
        }
    )

@api_router.get("/docs/oauth2-redirect", include_in_schema=False)
async def swagger_oauth2_redirect():
    return get_swagger_ui_oauth2_redirect_html()

# ============================================================
# INCLUDE ROUTERS
# ============================================================

# Register the main api_router
app.include_router(api_router)

# Include OAuth router
try:
    from app.routes import oauth
    app.include_router(oauth.router, prefix="/api")
    print("---> OAuth router loaded successfully")
except Exception as e:
    print(f"!!! OAuth router failed to load: {e}")

# ============================================================
# ROOT PAGE
# ============================================================

@app.get("/", include_in_schema=False)
async def root_page():
    return HTMLResponse(
        content="""
        <html>
            <head>
                <title>BNB.AI API</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 50px; background-color: #f4f4f9; color: #333; }
                    .container { max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #2563eb; }
                    .status { font-weight: bold; color: green; }
                    .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; }
                    .btn:hover { background: #1d4ed8; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>BNB.AI Marketing Intelligences API</h1>
                    <p>Status: <span class="status">Online</span></p>
                    <p>Version: 0.1.0</p>
                    <a href="/api/docs" class="btn">View API Documentation</a>
                </div>
            </body>
        </html>
        """
    )

# ============================================================
# CUSTOM OPENAPI SCHEMA
# ============================================================

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="BNB.AI Marketing Intelligences API",
        version="0.1.0",
        description="BNB.AI Marketing Intelligence API for reporting and management.",
        routes=app.routes,
    )

    # Force OpenAPI 3.0.3
    openapi_schema["openapi"] = "3.0.3"

    # Production Server Configuration
    openapi_schema["servers"] = [
        {
            "url": "/api",
            "description": "BNB.AI Production API",
        }
    ]

    app.openapi_schema = openapi_schema
    return openapi_schema

app.openapi = custom_openapi

# ============================================================
# STARTUP LOGGING
# ============================================================

print("============================================================")
print("       BNB.AI MARKETING INTELLIGENCES API")
print("============================================================")
print("---> Starting BNB.AI API Server...")
print("---> MySQL Database configured")
print("---> CORS: Configured with origins and regex")
print("---> Middleware: Exception handling active")
print("---> API prefix: /api")
print("---> Static mount: /static -> static/")
print("---> Swagger: /api/docs")
print("============================================================")
