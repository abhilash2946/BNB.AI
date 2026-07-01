from datetime import datetime, timedelta

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
