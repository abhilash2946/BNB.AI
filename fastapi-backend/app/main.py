# ============================================================
# BNB.AI MARKETING INTELLIGENCES API
# app/main.py
# ============================================================

import uuid
import os

# Disable PKCE for Google Auth to ensure compatibility with all environments
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

from fastapi import FastAPI, BackgroundTasks, HTTPException, File, UploadFile
import shutil

# ... existing imports
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.docs import (
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import os

# Create static directory if not exists
os.makedirs("static/uploads", exist_ok=True)

# ...

from app.models import (
    ReportRequest,
    ReportResponse,
    AdviceSummarizeRequest,
)

from app.config import settings
from app.database import SessionLocal, ProcessedReport, ReportStatus, Site, UserCredential, SiteCredential, Profile, SharedReport
from app.auth import get_current_user
from sqlalchemy import desc
from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from datetime import datetime
from typing import List, Dict, Any, Optional


# ============================================================
# STARTUP
# ============================================================

print("============================================================")
print("       BNB.AI MARKETING INTELLIGENCES API")
print("============================================================")
print("---> Starting BNB.AI API Server...")

try:
    print("---> MySQL Database configured")
except Exception:
    print("---> Database configuration error")


# ============================================================
# FASTAPI APP
# ============================================================
#
# IMPORTANT:
#
# We disable FastAPI's automatic docs/openapi routes.
#
# We create them manually below.
#
# This prevents the old automatically generated 3.1.0
# definition from being returned.
#
# ============================================================

app = FastAPI(
    title="BNB.AI Marketing Intelligences API",
    # ...
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/upload", tags=["Management"])
async def upload_file(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    file_ext = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join("static/uploads", file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"{settings.api_url}/static/uploads/{file_name}"}


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "https://reports.blacknbold.in",
        "https://frontend.test",
        "https://www.frontend.test",

        "http://frontend.test",
        "http://www.frontend.test",

        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CUSTOM OPENAPI
# ============================================================

def create_openapi_schema():

    if app.openapi_schema is not None:
        return app.openapi_schema

    print("---> Creating custom OpenAPI schema...")

    schema = get_openapi(
        title="BNB.AI Marketing Intelligences API",
        version="0.1.0",
        description=app.description,
        routes=app.routes,
    )

    # ========================================================
    # FORCE OPENAPI 3.0.3
    # ========================================================

    schema["openapi"] = "3.0.3"

    # ========================================================
    # PUBLIC API SERVER
    # ========================================================

    schema["servers"] = [
        {
            "url": "/api",
            "description": "BNB.AI Production API",
        }
    ]

    return schema

app.openapi_schema = create_openapi_schema()


# ============================================================
# SITE & CREDENTIAL MANAGEMENT (Local DB)
# ============================================================

from app.models import SiteCreate, UserCredentialCreate, SiteCredentialCreate, ProfileUpdate, SharedReportCreate

@app.get("/profile", tags=["Management"])
async def get_profile(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    return profile

@app.patch("/profile", tags=["Management"])
async def update_profile(profile_data: ProfileUpdate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for key, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile

@app.get("/sites", tags=["Management"])
async def list_sites(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    sites = db.query(Site).filter(Site.user_id == user_id).all()
    return sites

@app.get("/shared-report-info/{share_id}", tags=["Public"])
async def get_shared_report_info(share_id: str, db: Session = Depends(get_db)):
    share = db.query(SharedReport).filter(SharedReport.id == share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Shared report not found")

    # Also fetch site info for branding
    site = db.query(Site).filter(Site.id == share.site_id).first()

    return {
        "share": share,
        "site": {
            "name": site.name if site else "Unknown",
            "image_url": site.image_url if site else None
        }
    }

@app.post("/shared-reports", tags=["Management"])
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

@app.post("/sites", tags=["Management"])
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

@app.patch("/sites/{site_id}", tags=["Management"])
async def update_site(site_id: str, site_data: SiteCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    site = db.query(Site).filter(Site.id == site_id, Site.user_id == user_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    for key, value in site_data.model_dump(exclude_unset=True).items():
        setattr(site, key, value)

    db.commit()
    db.refresh(site)
    return site

@app.delete("/sites/{site_id}", tags=["Management"])
async def delete_site(site_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    site = db.query(Site).filter(Site.id == site_id, Site.user_id == user_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    db.delete(site)
    db.commit()
    return {"success": True}

@app.get("/user-credentials", tags=["Management"])
async def list_user_credentials(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    creds = db.query(UserCredential).filter(UserCredential.user_id == user_id).all()
    return creds

@app.post("/user-credentials", tags=["Management"])
async def update_user_credentials(cred_data: UserCredentialCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(UserCredential).filter(UserCredential.user_id == user_id, UserCredential.platform == cred_data.platform).first()
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

@app.post("/site-credentials", tags=["Management"])
async def update_site_credentials(cred_data: SiteCredentialCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify site ownership
    site = db.query(Site).filter(Site.id == cred_data.site_id, Site.user_id == user_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    existing = db.query(SiteCredential).filter(SiteCredential.site_id == cred_data.site_id, SiteCredential.platform == cred_data.platform).first()
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

@app.get("/report-status/{report_id}", tags=["Reports"])
async def get_report_status(report_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    status = db.query(ReportStatus).filter(ReportStatus.report_id == report_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="Report status not found")
    return status

@app.get("/processed-report/{report_id}", tags=["Reports"])
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

@app.patch("/processed-report/{report_id}", tags=["Reports"])
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
    # INFO
    # ========================================================

    schema["info"] = {
        "title": "BNB.AI Marketing Intelligences API",
        "description": """
BNB.AI Marketing Intelligence API.

Provides:

- Google OAuth
- Meta OAuth
- Performance Reports
- SEO Reports
- Social Reports
- AI Advice Summarization
""",
        "version": "0.1.0",
    }

    app.openapi_schema = schema

    print(
        "---> OpenAPI schema created: "
        + schema["openapi"]
    )

    return schema


# ============================================================
# MANUAL OPENAPI JSON
# ============================================================
#
# URL:
#
# https://reports.blacknbold.in/api/openapi.json
#
# ============================================================

@app.get(
    "/openapi.json",
    include_in_schema=False,
)
async def custom_openapi_json():

    schema = create_openapi_schema()

    return JSONResponse(
        content=schema,
        media_type="application/json",
    )


# ============================================================
# MANUAL SWAGGER UI
# ============================================================
#
# URL:
#
# https://reports.blacknbold.in/api/docs
#
# ============================================================

@app.get(
    "/docs",
    include_in_schema=False,
)
async def custom_docs():

    return get_swagger_ui_html(
        openapi_url="/api/openapi.json",

        title="BNB.AI Marketing Intelligences API",

        swagger_js_url=(
            "https://cdn.jsdelivr.net/npm/"
            "swagger-ui-dist@5.11.10/"
            "swagger-ui-bundle.js"
        ),

        swagger_css_url=(
            "https://cdn.jsdelivr.net/npm/"
            "swagger-ui-dist@5.11.10/"
            "swagger-ui.css"
        ),

        oauth2_redirect_url=(
            "/api/docs/oauth2-redirect"
        ),

        swagger_ui_parameters={
            "deepLinking": True,
            "displayRequestDuration": True,
            "filter": True,
            "tryItOutEnabled": True,
            "persistAuthorization": True,
            "displayOperationId": False,
            "defaultModelsExpandDepth": 1,
            "defaultModelExpandDepth": 1,
        },
    )


# ============================================================
# SWAGGER OAUTH REDIRECT
# ============================================================

@app.get(
    "/docs/oauth2-redirect",
    include_in_schema=False,
)
async def swagger_oauth_redirect():

    return get_swagger_ui_oauth2_redirect_html()


# ============================================================
# ROOT / LANDING PAGE
# ============================================================

@app.get("/", include_in_schema=False)
async def root_page():
    return HTMLResponse(
        content="""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>BNB.AI Marketing Intelligences API</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 850px;
                    margin: 60px auto;
                    padding: 20px;
                    color: #1f2937;
                    background: #f8fafc;
                }
                .card {
                    background: white;
                    padding: 35px;
                    border-radius: 14px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                }
                h1 { margin-top: 0; }
                .status {
                    display: inline-block;
                    padding: 7px 12px;
                    border-radius: 20px;
                    background: #dcfce7;
                    color: #166534;
                    font-weight: bold;
                }
                a {
                    display: inline-block;
                    margin-top: 12px;
                    margin-right: 10px;
                    padding: 11px 16px;
                    border-radius: 8px;
                    background: #2563eb;
                    color: white;
                    text-decoration: none;
                }
                .muted { color: #64748b; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>BNB.AI Marketing Intelligences API</h1>
                <p><span class="status">● Online</span></p>
                <p class="muted">
                    Marketing intelligence and reporting API services.
                </p>

                <h3>Available Services</h3>
                <ul>
                    <li>Google OAuth</li>
                    <li>Meta OAuth</li>
                    <li>Performance Reports</li>
                    <li>SEO Reports</li>
                    <li>Social Reports</li>
                    <li>AI Advice Summarization</li>
                    <li>Local MySQL Integration</li>
                </ul>

                <a href="/api/docs">Open API Documentation</a>
                <a href="/api/health">Health Check</a>
            </div>
        </body>
        </html>
        """
    )


# ============================================================
# HEALTH
# ============================================================

@app.get(
    "/health",
    tags=["System"],
    summary="Health Check",
)
async def health_check():

    return {
        "status": "online",
        "database_connected": True
    }


# ============================================================
# OAUTH ROUTER
# ============================================================

try:

    from app.routes import oauth

    app.include_router(oauth.router)

    print("---> OAuth router loaded successfully")

except Exception as e:

    print(
        "!!! OAuth router failed to load: "
        f"{e}"
    )


# ============================================================
# REPORT CACHE HELPER
# ============================================================

def check_existing_report(
    site_id: str,
    module: str,
    start_date: str,
    end_date: str,
):
    db = SessionLocal()
    try:
        existing = db.query(ProcessedReport).filter(
            ProcessedReport.site_id == site_id,
            ProcessedReport.module == module,
            ProcessedReport.start_date == start_date,
            ProcessedReport.end_date == end_date
        ).order_by(desc(ProcessedReport.created_at)).first()

        if existing:
            print(f"---> Existing {module} report: {existing.report_id}")
            return existing.report_id

    except Exception as e:
        print(f"---> Cache check failed: {e}")
    finally:
        db.close()

    return None


# ============================================================
# PERFORMANCE REPORT
# ============================================================

@app.post(
    "/performance-report",
    tags=["Reports"],
    summary="Performance Report",
)
async def performance_report(
    req: ReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    print(
        f"---> Received performance report request "
        f"for site: {req.site_id}"
    )

    try:

        from app.workers.performance_worker import (
            run_performance_report
        )

    except Exception as e:

        print(
            f"!!! Performance worker import failed: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Performance worker could not be loaded: "
                f"{str(e)}"
            ),
        )

    # --------------------------------------------------------
    # CACHE (Local MySQL)
    # --------------------------------------------------------

    try:
        existing = db.query(ProcessedReport).filter(
            ProcessedReport.site_id == req.site_id,
            ProcessedReport.module == "performance",
            ProcessedReport.start_date == req.start_date,
            ProcessedReport.end_date == req.end_date
        ).order_by(desc(ProcessedReport.created_at)).first()

        if existing:
            print(f"---> Found cached performance report: {existing.report_id}")
            # Convert SQLAlchemy object to dict for response if needed
            return {
                "success": True,
                "report_id": existing.report_id,
                "data": {c.name: getattr(existing, c.name) for c in existing.__table__.columns},
            }

    except Exception as e:
        print(f"---> Performance cache check failed: {e}")

    # --------------------------------------------------------
    # NEW REPORT
    # --------------------------------------------------------

    report_id = str(uuid.uuid4())

    try:
        new_status = ReportStatus(
            report_id=report_id,
            user_id=req.user_id,
            site_id=req.site_id,
            module="performance",
            status="pending"
        )
        db.add(new_status)
        db.commit()

        print(f"---> Performance status created in Local DB: {report_id}")

    except Exception as e:
        print(f"!!! Performance database error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Local Database Error: {str(e)}",
        )

    background_tasks.add_task(
        run_performance_report,
        req.user_id,
        req.site_id,
        req.start_date,
        req.end_date,
        report_id,
        req.bnb_mode,
    )

    return ReportResponse(
        success=True,
        report_id=report_id,
    )


# ============================================================
# SEO REPORT
# ============================================================

@app.post(
    "/seo-report",
    tags=["Reports"],
    summary="SEO Report",
)
async def seo_report(
    req: ReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    print(
        f"---> Received SEO report request "
        f"for site: {req.site_id}"
    )

    try:

        from app.workers.seo_worker import (
            run_seo_report
        )

    except Exception as e:

        print(
            f"!!! SEO worker import failed: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "SEO worker could not be loaded: "
                f"{str(e)}"
            ),
        )

    # --------------------------------------------------------
    # CACHE (Local MySQL)
    # --------------------------------------------------------

    try:
        existing = db.query(ProcessedReport).filter(
            ProcessedReport.site_id == req.site_id,
            ProcessedReport.module == "seo",
            ProcessedReport.start_date == req.start_date,
            ProcessedReport.end_date == req.end_date
        ).order_by(desc(ProcessedReport.created_at)).first()

        if existing:
            print(f"---> Found cached SEO report: {existing.report_id}")
            return {
                "success": True,
                "report_id": existing.report_id,
                "data": {c.name: getattr(existing, c.name) for c in existing.__table__.columns},
            }
    except Exception as e:
        print(f"---> SEO cache check failed: {e}")

    # --------------------------------------------------------
    # NEW REPORT
    # --------------------------------------------------------

    report_id = str(uuid.uuid4())

    try:
        new_status = ReportStatus(
            report_id=report_id,
            user_id=req.user_id,
            site_id=req.site_id,
            module="seo",
            status="pending"
        )
        db.add(new_status)
        db.commit()

        print(f"---> SEO status created in Local DB: {report_id}")

    except Exception as e:
        print(f"!!! SEO database error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Local Database Error: {str(e)}",
        )

    background_tasks.add_task(
        run_seo_report,
        req.user_id,
        req.site_id,
        req.start_date,
        req.end_date,
        report_id,
        req.bnb_mode,
    )

    return ReportResponse(
        success=True,
        report_id=report_id,
    )


# ============================================================
# SOCIAL REPORT
# ============================================================

@app.post(
    "/social-report",
    tags=["Reports"],
    summary="Social Report",
)
async def social_report(
    req: ReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    print(
        f"---> Received Social report request "
        f"for site: {req.site_id}"
    )

    try:

        from app.workers.social_worker import (
            run_social_report
        )

    except Exception as e:

        print(
            f"!!! Social worker import failed: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Social worker could not be loaded: "
                f"{str(e)}"
            ),
        )

    # --------------------------------------------------------
    # CACHE (Local MySQL)
    # --------------------------------------------------------

    try:
        existing = db.query(ProcessedReport).filter(
            ProcessedReport.site_id == req.site_id,
            ProcessedReport.module == "social",
            ProcessedReport.start_date == req.start_date,
            ProcessedReport.end_date == req.end_date
        ).order_by(desc(ProcessedReport.created_at)).first()

        if existing:
            print(f"---> Found cached social report: {existing.report_id}")
            return {
                "success": True,
                "report_id": existing.report_id,
                "data": {c.name: getattr(existing, c.name) for c in existing.__table__.columns},
            }
    except Exception as e:
        print(f"---> Social cache check failed: {e}")

    # --------------------------------------------------------
    # NEW REPORT
    # --------------------------------------------------------

    report_id = str(uuid.uuid4())

    try:
        new_status = ReportStatus(
            report_id=report_id,
            user_id=req.user_id,
            site_id=req.site_id,
            module="social",
            status="pending"
        )
        db.add(new_status)
        db.commit()

        print(f"---> Social status created in Local DB: {report_id}")

    except Exception as e:
        print(f"!!! Social database error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Local Database Error: {str(e)}",
        )

    background_tasks.add_task(
        run_social_report,
        req.user_id,
        req.site_id,
        req.start_date,
        req.end_date,
        report_id,
    )

    return ReportResponse(
        success=True,
        report_id=report_id,
    )


# ============================================================
# SUMMARIZE ADVICE
# ============================================================

@app.post(
    "/summarize-advice",
    tags=["AI"],
    summary="Summarize AI Advice",
)
async def api_summarize_advice(
    req: AdviceSummarizeRequest,
    db: Session = Depends(get_db)
):

    print(
        f"---> Summarizing advice for report "
        f"{req.report_id}"
    )

    try:

        from app.services.gemini import (
            summarize_advice
        )

    except Exception as e:

        print(
            f"!!! Gemini import failed: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Gemini service could not be loaded: "
                f"{str(e)}"
            ),
        )

    try:

        summarized = await summarize_advice(
            req.advice_list
        )

        report = db.query(ProcessedReport).filter(ProcessedReport.report_id == req.report_id).first()
        if report:
            report.ai_recommendations_summarized = summarized
            db.commit()

        return {
            "success": True,
            "summarized": summarized,
        }

    except Exception as e:

        print(
            f"!!! Error summarizing advice: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


# ============================================================
# STARTUP INFORMATION
# ============================================================

print("============================================================")
print("---> BNB.AI API loaded successfully")
print("---> API prefix: /api")
print("---> Health: /api/health")
print("---> OpenAPI: /api/openapi.json")
print("---> Swagger: /api/docs")
print("---> OpenAPI version: 3.0.3")
print("============================================================")