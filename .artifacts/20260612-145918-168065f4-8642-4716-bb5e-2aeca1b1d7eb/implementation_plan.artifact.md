# Fix Empty Graphs and Missing Data in SEO Intelligence

The goal is to fix the issue where graphs in the SEO Intelligence section (Geographical Engagement, Temporal Activity Flux, etc.) are empty, despite data being available in metric cards. This involves fixing layout issues with Recharts `ResponsiveContainer`, ensuring data mapping consistency, and adding missing metrics like Bounce Rate.

## Proposed Changes

### Frontend (UI Components)

#### [ReportViews.tsx](file:///D:/BNB fast new/src/components/ReportViews.tsx)

- Update `GraphBlock` to ensure `ResponsiveContainer` has a stable height.
- Add `minTickGap` and `interval` to `XAxis` in `GraphBlock` to handle large time-series data (e.g., 1 year of daily points).
- Increase `YAxis` width for horizontal charts to prevent truncation of long page titles.
- Add defensive rendering: show a "No data available" message if the `data` array is empty.

```tsx
function GraphBlock({ title, data, dataKey, nameKey, type, horizontal = false, secondKey }: { title: string, data: any[], dataKey: string, nameKey: string, type: 'bar' | 'line' | 'pie', horizontal?: boolean, secondKey?: string }) {
  const hasData = data && data.length > 0;

  return (
    <div className="glass-panel p-8 rounded-[2.5rem] min-h-[450px] flex flex-col ...">
      <h4 ...>{title}</h4>
      <div className="flex-1 w-full min-h-[300px] relative"> {/* Added min-h and relative */}
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            {/* ... charts with improved Axis settings ... */}
            <XAxis
              dataKey={horizontal ? undefined : nameKey}
              interval="preserveStartEnd"
              minTickGap={30}
              // ...
            />
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-white/20 text-xs font-mono uppercase tracking-widest">
            Awaiting Data Feed...
          </div>
        )}
      </div>
    </div>
  );
}
```

### Frontend (Data Mapping)

#### [useReportData.ts](file:///D:/BNB fast new/src/components/command-center/useReportData.ts)

- Ensure `topCountries` and other list properties are always passed to the mapper, even if empty.
- Fix potential property name mismatches between `RawReport` and `ReportResponse`.

#### [mapper.ts](file:///D:/BNB fast new/src/utils/mapper.ts)

- Refine the `seo` mapping to be more robust against missing or empty properties.
- Ensure `userActivityOverTime` correctly uses either `chart_datasets` or `ga4_details.daily_users` as a fallback.

### Backend (GA4 Service & Worker)

#### [ga4.py](file:///D:/BNB fast new/fastapi-backend/app/services/ga4.py)

- Add `bounceRate` to the `metrics` list in `fetch_ga4_totals`.

#### [seo_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/seo_worker.py)

- Ensure all fetched GA4 lists are correctly saved to the `ga4_details` JSONB column in `processed_reports` for better redundancy.

---

## Verification Plan

### Automated Tests
- I will verify the fix by checking that the `seo` object in `MarketingReport` (on the frontend) contains populated arrays for `activeUsersByCountry` and `userActivityOverTime`.
- I will verify that `bounceRate` is present in the `ga4_totals` object.

### Manual Verification
- Navigate to the SEO Intelligence section and click on the "Graphs" tab.
- Verify that "Geographical Engagement" shows a bar chart with country data.
- Verify that "Temporal Activity Flux" shows a line chart with user activity over time.
- Verify that the "Bounce Rate" metric card shows a non-zero value (if data is available).
- Resize the window to ensure `ResponsiveContainer` still renders correctly in the `flex-1` grid.
