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

class SiteCreate(BaseModel):
    name: str
    url: str
    industry: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    image_url: Optional[str] = None

class UserCredentialCreate(BaseModel):
    platform: str
    credentials: Dict[str, Any]

class SiteCredentialCreate(BaseModel):
    site_id: str
    platform: str
    credentials: Dict[str, Any]

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    agency_name: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    tier: Optional[str] = None

class SharedReportCreate(BaseModel):
    site_id: str
    date_range: Dict[str, str]
    access_type: str
    shared_pages: List[str]
    report_id: Optional[str] = None
