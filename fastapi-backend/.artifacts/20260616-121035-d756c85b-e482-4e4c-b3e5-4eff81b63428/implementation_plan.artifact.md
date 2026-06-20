# Add Dedicated Site Radar Beside Competitor Radar

The user wants a dedicated radar chart for their own site data, displayed next to the existing competitor radar chart. This will provide a clearer view of the site's individual performance alongside the competitive comparison.

## User Review Required

> [!NOTE]
> I will implement a dual-radar layout:
> 1.  **Left Radar**: Competitor Tactical Radar (shows site vs competitors for comparison).
> 2.  **Right Radar**: {Site Name} Strategic Radar (shows only the site's data, potentially with more detailed metrics from `radar_self`).
>
> Does this split work for you, or did you want the site radar to replace the "Current Site" line in the first radar entirely?

## Proposed Changes

### Frontend Components

#### [types.ts](file:///D:/BNB fast/src/types.ts)

- Add `siteName` to `ReportResponse` to ensure it's available in all views.

```typescript
export interface ReportResponse {
  // ... existing fields ...
  siteName?: string;
}
```

#### [CompetitorRadar.tsx](file:///D:/BNB fast/src/components/CompetitorRadar.tsx)

- Update `CompetitorRadar` to accept `siteName` and an optional `siteData` (from `radar_self`).
- Refactor the rendering logic into a reusable `RadarPanel` or function.
- Implement a two-column grid layout when `siteName` or `siteData` is available.
- Ensure the site-specific radar uses a distinct color or title for clarity.

```tsx
export const CompetitorRadar: React.FC<{
  data: any[],
  siteName?: string,
  siteData?: Record<string, number>
}> = ({ data, siteName, siteData }) => {
  // ...
  // Use 'siteData' (radar_self) if available for the second radar
  // otherwise fallback to 'Current Site' values from 'data'.
}
```

#### [ReportViews.tsx](file:///D:/BNB fast/src/components/ReportViews.tsx)

- Update `SeoReportView` and `PerformanceReportView` to pass `report.siteName` and `report.radar_self` to the `CompetitorRadar` component.

```tsx
<CompetitorRadar
  data={radarData}
  siteName={report.siteName}
  siteData={report.radar_self}
/>
```

### Backend (Optional but recommended for consistency)

- Ensure `site_name` is always included in the report payload if not already consistent. (Research showed it's mostly there in `report.site_name` or added during mapping).

## Verification Plan

### Automated Tests
- I will use `render_compose_preview` (if available/applicable) or verify by running the app locally.
- Check that `CompetitorRadar` handles both `data` and `siteData` correctly.

### Manual Verification
1.  Open a "BnB Report" in the dashboard.
2.  Verify that two radar charts are displayed side-by-side.
3.  Confirm the left chart shows competitors and the site.
4.  Confirm the right chart is titled "{Site Name} Strategic Radar" and shows only the site's metrics.
5.  Verify that if a site has a different set of metrics in `radar_self` (e.g. SEO metrics like "Search Visibility"), they are correctly displayed in the second radar.
