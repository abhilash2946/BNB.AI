# ============================================================
# BNB.AI MARKETING INTELLIGENCES API
# app/main.py
# ============================================================

import uuid
import os

# Disable PKCE for Google Auth to ensure compatibility with all environments
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.docs import (
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.responses import JSONResponse, HTMLResponse

from app.models import (
    ReportRequest,
    ReportResponse,
    AdviceSummarizeRequest,
)

from app.supabase_client import supabase
from app.config import settings


# ============================================================
# STARTUP
# ============================================================

print("============================================================")
print("       BNB.AI MARKETING INTELLIGENCES API")
print("============================================================")
print("---> Starting BNB.AI API Server...")

try:
    print(
        "---> Configured Supabase URL: "
        + settings.supabase_url[:20]
        + "..."
    )
except Exception:
    print("---> Supabase URL configured")


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
    description="""
BNB.AI Marketing Intelligence API.

Available services:

- Google OAuth
- Meta OAuth
- Performance reports
- SEO reports
- Social reports
- AI advice summarization
- Supabase integration
""",
    version="0.1.0",

    # Public URL is /api/...
    root_path="/api",

    # IMPORTANT
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


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

    # ========================================================
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
                    <li>Supabase Integration</li>
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
        "supabase_connected": bool(
            settings.supabase_url
        ),
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

    try:

        result = (
            supabase
            .table("processed_reports")
            .select("report_id")
            .eq("site_id", site_id)
            .eq("module", module)
            .eq("start_date", start_date)
            .eq("end_date", end_date)
            .order(
                "created_at",
                desc=True,
            )
            .limit(1)
            .execute()
        )

        if result.data:

            report_id = result.data[0]["report_id"]

            print(
                f"---> Existing {module} report: "
                f"{report_id}"
            )

            return report_id

    except Exception as e:

        print(
            f"---> Cache check failed: {e}"
        )

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
):

    print(
        f"---> Received Performance report request "
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
    # CACHE
    # --------------------------------------------------------

    try:

        result = (
            supabase
            .table("processed_reports")
            .select("*")
            .eq("site_id", req.site_id)
            .eq("module", "performance")
            .eq("start_date", req.start_date)
            .eq("end_date", req.end_date)
            .order(
                "created_at",
                desc=True,
            )
            .limit(1)
            .execute()
        )

        if result.data:

            existing = result.data[0]

            print(
                "---> Found cached performance report: "
                f"{existing['report_id']}"
            )

            return {
                "success": True,
                "report_id": existing["report_id"],
                "data": existing,
            }

    except Exception as e:

        print(
            f"---> Performance cache check failed: {e}"
        )

    # --------------------------------------------------------
    # NEW REPORT
    # --------------------------------------------------------

    report_id = str(uuid.uuid4())

    try:

        supabase.table(
            "report_status"
        ).insert(
            {
                "report_id": report_id,
                "user_id": req.user_id,
                "site_id": req.site_id,
                "module": "performance",
                "status": "pending",
            }
        ).execute()

        print(
            "---> Performance status created: "
            f"{report_id}"
        )

    except Exception as e:

        print(
            f"!!! Performance database error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Database Error: "
                f"{str(e)}"
            ),
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
    # CACHE
    # --------------------------------------------------------

    try:

        result = (
            supabase
            .table("processed_reports")
            .select("*")
            .eq("site_id", req.site_id)
            .eq("module", "seo")
            .eq("start_date", req.start_date)
            .eq("end_date", req.end_date)
            .order(
                "created_at",
                desc=True,
            )
            .limit(1)
            .execute()
        )

        if result.data:

            existing = result.data[0]

            print(
                "---> Found cached SEO report: "
                f"{existing['report_id']}"
            )

            return {
                "success": True,
                "report_id": existing["report_id"],
                "data": existing,
            }

    except Exception as e:

        print(
            f"---> SEO cache check failed: {e}"
        )

    # --------------------------------------------------------
    # NEW REPORT
    # --------------------------------------------------------

    report_id = str(uuid.uuid4())

    try:

        supabase.table(
            "report_status"
        ).insert(
            {
                "report_id": report_id,
                "user_id": req.user_id,
                "site_id": req.site_id,
                "module": "seo",
                "status": "pending",
            }
        ).execute()

        print(
            "---> SEO status created: "
            f"{report_id}"
        )

    except Exception as e:

        print(
            f"!!! SEO database error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Database Error: "
                f"{str(e)}"
            ),
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
    # CACHE
    # --------------------------------------------------------

    try:

        result = (
            supabase
            .table("processed_reports")
            .select("*")
            .eq("site_id", req.site_id)
            .eq("module", "social")
            .eq("start_date", req.start_date)
            .eq("end_date", req.end_date)
            .order(
                "created_at",
                desc=True,
            )
            .limit(1)
            .execute()
        )

        if result.data:

            existing = result.data[0]

            print(
                "---> Found cached social report: "
                f"{existing['report_id']}"
            )

            return {
                "success": True,
                "report_id": existing["report_id"],
                "data": existing,
            }

    except Exception as e:

        print(
            f"---> Social cache check failed: {e}"
        )

    # --------------------------------------------------------
    # NEW REPORT
    # --------------------------------------------------------

    report_id = str(uuid.uuid4())

    try:

        supabase.table(
            "report_status"
        ).insert(
            {
                "report_id": report_id,
                "user_id": req.user_id,
                "site_id": req.site_id,
                "module": "social",
                "status": "pending",
            }
        ).execute()

        print(
            "---> Social status created: "
            f"{report_id}"
        )

    except Exception as e:

        print(
            f"!!! Social database error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Database Error: "
                f"{str(e)}"
            ),
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

        (
            supabase
            .table("processed_reports")
            .update(
                {
                    "ai_recommendations_summarized":
                        summarized
                }
            )
            .eq(
                "report_id",
                req.report_id,
            )
            .execute()
        )

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