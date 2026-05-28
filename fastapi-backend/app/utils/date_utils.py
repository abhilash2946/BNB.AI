from datetime import datetime, timedelta

def compute_previous_period(start_date: str, end_date: str):
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    length = (end - start).days
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=length)
    return prev_start.strftime("%Y-%m-%d"), prev_end.strftime("%Y-%m-%d")
