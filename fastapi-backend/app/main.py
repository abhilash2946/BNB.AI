from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from app.models import ReportRequest, ReportResponse, AdviceSummarizeRequest
from app.supabase_client import supabase
from app.config import settings
# Deferred imports for workers to speed up startup
import uuid
print(f"---> Starting BNB.AI API Server...")
print(f"---> Configured Supabase URL: {settings.supabase_url[:15]}...")

app = FastAPI(title="BNB.AI Marketing Intelligences API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Loosened for debugging CORS issues
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "online", "supabase_connected": bool(settings.supabase_url)}

# Defer router import to speed up startup if possible,
# but usually routes are fine. Moving it here for consistency.
from app.routes import oauth
app.include_router(oauth.router)

def check_existing_report(site_id: str, module: str, start_date: str, end_date: str):
    try:
        # Check if we have a processed report already
        res = supabase.table("processed_reports").select("report_id").eq("site_id", site_id).eq("module", module).eq("start_date", start_date).eq("end_date", end_date).order("created_at", desc=True).limit(1).execute()

        if res.data and len(res.data) > 0:
            existing_report_id = res.data[0]["report_id"]
            print(f"---> Found existing {module} report in processed_reports: {existing_report_id}")
            return existing_report_id

    except Exception as e:
        print(f"Error checking cache: {e}")
    return None

@app.post("/performance-report")
async def performance_report(req: ReportRequest, background_tasks: BackgroundTasks):
    from app.workers.performance_worker import run_performance_report
    print(f"---> Received Performance report request for site: {req.site_id}")
    
    # Check if we have a processed report already
    try:
        res = supabase.table("processed_reports")\
            .select("*")\
            .eq("site_id", req.site_id)\
            .eq("module", "performance")\
            .eq("start_date", req.start_date)\
            .eq("end_date", req.end_date)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if res.data and len(res.data) > 0:
            existing = res.data[0]
            print(f"---> Found cached report {existing['report_id']}, returning immediately.")
            return {"success": True, "report_id": existing["report_id"], "data": existing}
    except Exception as e:
        print(f"Error checking cache: {e}")

    report_id = str(uuid.uuid4())
    try:
        supabase.table("report_status").insert({
            "report_id": report_id,
            "user_id": req.user_id,
            "site_id": req.site_id,
            "module": "performance",
            "status": "pending",
        }).execute()
        print(f"---> Successfully initialized report {report_id} in database")
    except Exception as e:
        print(f"!!! Error inserting report status: {e}")
        # Return detailed error to help debug 500 issues
        raise HTTPException(
            status_code=500,
            detail=f"Database Error: {str(e)}. Ensure Supabase connection is valid."
        )

    background_tasks.add_task(run_performance_report, req.user_id, req.site_id, req.start_date, req.end_date, report_id, req.bnb_mode)
    return ReportResponse(success=True, report_id=report_id)

@app.post("/seo-report")
async def seo_report(req: ReportRequest, background_tasks: BackgroundTasks):
    from app.workers.seo_worker import run_seo_report
    print(f"---> Received SEO report request for site: {req.site_id}")
    
    # Check if we have a processed report already
    try:
        res = supabase.table("processed_reports")\
            .select("*")\
            .eq("site_id", req.site_id)\
            .eq("module", "seo")\
            .eq("start_date", req.start_date)\
            .eq("end_date", req.end_date)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if res.data and len(res.data) > 0:
            existing = res.data[0]
            print(f"---> Found cached report {existing['report_id']}, returning immediately.")
            return {
                "success": True,
                "report_id": existing["report_id"],
                "data": existing # Optional: Send full data back to skip polling
            }
    except Exception as e:
        print(f"Error checking cache: {e}")

    report_id = str(uuid.uuid4())
    try:
        supabase.table("report_status").insert({
            "report_id": report_id,
            "user_id": req.user_id,
            "site_id": req.site_id,
            "module": "seo",
            "status": "pending",
        }).execute()
        print(f"---> Successfully initialized report {report_id} in database")
    except Exception as e:
        print(f"!!! Error inserting report status: {e}")
        # Return detailed error to help debug 500 issues
        raise HTTPException(
            status_code=500,
            detail=f"Database Error: {str(e)}. Ensure Supabase connection is valid."
        )

    background_tasks.add_task(run_seo_report, req.user_id, req.site_id, req.start_date, req.end_date, report_id, req.bnb_mode)
    return ReportResponse(success=True, report_id=report_id)

@app.post("/social-report")
async def social_report(req: ReportRequest, background_tasks: BackgroundTasks):
    from app.workers.social_worker import run_social_report
    print(f"---> Received Social report request for site: {req.site_id}")
    
    # Check if we have a processed report already
    try:
        res = supabase.table("processed_reports")\
            .select("*")\
            .eq("site_id", req.site_id)\
            .eq("module", "social")\
            .eq("start_date", req.start_date)\
            .eq("end_date", req.end_date)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if res.data and len(res.data) > 0:
            existing = res.data[0]
            print(f"---> Found cached report {existing['report_id']}, returning immediately.")
            return {"success": True, "report_id": existing["report_id"], "data": existing}
    except Exception as e:
        print(f"Error checking cache: {e}")

    report_id = str(uuid.uuid4())
    try:
        supabase.table("report_status").insert({
            "report_id": report_id,
            "user_id": req.user_id,
            "site_id": req.site_id,
            "module": "social",
            "status": "pending",
        }).execute()
        print(f"---> Successfully initialized report {report_id} in database")
    except Exception as e:
        print(f"!!! Error inserting report status: {e}")
        # Return detailed error to help debug 500 issues
        raise HTTPException(
            status_code=500,
            detail=f"Database Error: {str(e)}. Ensure Supabase connection is valid."
        )

    background_tasks.add_task(run_social_report, req.user_id, req.site_id, req.start_date, req.end_date, report_id)
    return ReportResponse(success=True, report_id=report_id)

@app.post("/summarize-advice")
async def api_summarize_advice(req: AdviceSummarizeRequest):
    from app.services.gemini import summarize_advice
    print(f"---> Summarizing advice for report {req.report_id}")
    try:
        summarized = await summarize_advice(req.advice_list)

        # Update database
        supabase.table("processed_reports").update({
            "ai_recommendations_summarized": summarized
        }).eq("report_id", req.report_id).execute()

        return {"success": True, "summarized": summarized}
    except Exception as e:
        print(f"!!! Error summarizing advice: {e}")
        raise HTTPException(status_code=500, detail=str(e))
