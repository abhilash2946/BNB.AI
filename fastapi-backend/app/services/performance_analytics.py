import math

def compute_performance_radar(google_ads_cur, meta_ads_cur):
    """
    Computes performance-specific radar scores (0-100) based on Google and Meta Ads KPIs.
    Returns a list of data points for the radar chart.
    """

    # 1. Spend Efficiency (Inverse of CPL/CPA relative to a benchmark)
    # This is synthetic for now but can be tied to actual ROI if target is known
    spend_eff = 75

    # 2. CTR (Engagement)
    g_ctr = float(google_ads_cur.get('ctr', 0))
    m_ctr = float(meta_ads_cur.get('ctr', 0))
    # Combine and normalize: Google CTR of 10% is great, Meta CTR of 2% is great.
    ctr_score = min(100, (g_ctr * 5) + (m_ctr * 25))

    # 3. CPA / Lead Quality
    # Lower is better, but here we want a high score for "efficiency"
    cpa_score = 65

    # 4. Lead Growth
    # Synthetic unless we compare to previous, but let's keep it static-ish for the 'Current Site' node
    lead_growth = 82

    # 5. Mobile Share / Device Optimization
    mobile_share = 90

    radar_data = [
        {"subject": "Spend Efficiency", "Current Site": spend_eff, "Competitor Alpha": 60, "Competitor Beta": 45, "Competitor Gamma": 70},
        {"subject": "CTR / Engagement", "Current Site": round(ctr_score), "Competitor Alpha": 55, "Competitor Beta": 80, "Competitor Gamma": 40},
        {"subject": "CPA Efficiency", "Current Site": cpa_score, "Competitor Alpha": 75, "Competitor Beta": 50, "Competitor Gamma": 30},
        {"subject": "Lead Growth", "Current Site": lead_growth, "Competitor Alpha": 40, "Competitor Beta": 85, "Competitor Gamma": 60},
        {"subject": "Mobile Reach", "Current Site": mobile_share, "Competitor Alpha": 85, "Competitor Beta": 70, "Competitor Gamma": 50}
    ]

    return radar_data
