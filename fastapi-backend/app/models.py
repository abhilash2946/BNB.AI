from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ReportRequest(BaseModel):
    user_id: str
    site_id: str
    start_date: str   # YYYY-MM-DD
    end_date: str     # YYYY-MM-DD
    bnb_mode: Optional[bool] = False

class ReportResponse(BaseModel):
    success: bool
    report_id: str
    status: str = "processing"

class AdviceSummarizeRequest(BaseModel):
    report_id: str
    advice_list: List[str]
