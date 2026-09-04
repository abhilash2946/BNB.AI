from datetime import datetime, timedelta, timezone
import re

def safe_parse_iso(dt_str: any):
    """
    Robust ISO date parsing. Always returns a timezone-aware UTC datetime.
    """
    if not dt_str:
        return None

    if isinstance(dt_str, datetime):
        if dt_str.tzinfo is None:
            return dt_str.replace(tzinfo=timezone.utc)
        return dt_str

    # Standardize UTC indicator
    dt_str = str(dt_str).replace('Z', '+00:00')

    try:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        # Final fallback: strip microsecond part and try again
        try:
            dt = datetime.strptime(dt_str.split('+')[0].split('.')[0], "%Y-%m-%dT%H:%M:%S")
            return dt.replace(tzinfo=timezone.utc)
        except:
            return None

def compute_previous_period(start_date: str, end_date: str):
    """
    User-requested change: Always fetch exactly 1 month prior to the start_date
    as the comparison period, regardless of the current report length.
    """
    start = datetime.strptime(start_date, "%Y-%m-%d")

    # prev_end is 1 day before start
    prev_end = start - timedelta(days=1)

    # prev_start is 30 days before prev_end (Total 1 month approx)
    prev_start = prev_end - timedelta(days=30)

    return prev_start.strftime("%Y-%m-%d"), prev_end.strftime("%Y-%m-%d")
