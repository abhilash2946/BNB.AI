def build_dynamic_radar(self_radar, competitor_names):
    """
    Builds the final list of radar data points.
    Uses a deterministic heuristic for competitor scores to ensure consistency.
    """
    radar_data = []

    # If no competitors found, add some synthetic "Market Average"
    comps = competitor_names if competitor_names else ["Market Average"]

    for subject, self_score in self_radar.items():
        point = {
            "subject": subject,
            "Current Site": self_score
        }

        # Add competitors with deterministic variations
        for i, comp in enumerate(comps):
            # First competitor 0.8x, second 0.9x, etc. capped at 1.2x
            factor = 0.8 + (i * 0.1)
            if factor > 1.2: factor = 1.2

            comp_score = max(5, min(95, int(self_score * factor)))

            point[comp] = comp_score

        radar_data.append(point)

    return radar_data
