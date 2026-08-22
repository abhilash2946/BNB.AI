from datetime import datetime, timedelta, timezone
import re

def safe_parse_iso(dt_str: str):
    """
    Robust ISO date parsing for strings from Supabase/PostgreSQL.
    Handles varying microsecond precision which can break datetime.fromisoformat
    in Python versions older than 3.11.
    """
    if not dt_str:
        return None

    # Standardize UTC indicator
    dt_str = dt_str.replace('Z', '+00:00')

    try:
        return datetime.fromisoformat(dt_str)
    except ValueError:
        # Normalize microsecond precision to 6 digits if present
        # e.g., 2026-08-19T06:37:10.12887+00:00 -> 2026-08-19T06:37:10.128870+00:00
        match = re.search(r'\.(\d+)([+-])', dt_str)
        if match:
            ms = match.group(1)
            offset_sign = match.group(2)
            if len(ms) != 6:
                new_ms = ms.ljust(6, '0')[:6]
                dt_str = dt_str.replace(f".{ms}{offset_sign}", f".{new_ms}{offset_sign}")

        try:
            return datetime.fromisoformat(dt_str)
        except ValueError:
            # Final fallback: strip microsecond part and try again
            try:
                # Try simple format if regex normalization failed
                return datetime.strptime(dt_str.split('+')[0].split('.')[0], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
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
