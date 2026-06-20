# Implementation Plan - PPT Restructuring

Restructure the Client PPT presentation to match the design shown in the provided images while using the real marketing data from the application.

## User Review Required

> [!IMPORTANT]
> - The new design uses a very clean, professional aesthetic with specific typography and spacing. I will attempt to match this as closely as possible using the existing `EditableText` and `DashboardComponents`.
> - I will reorganize the `SLIDES` registry to match the order in the images if necessary, although the current order seems mostly aligned.

## Proposed Changes

### Frontend Components

#### [slides.tsx](file:///D:/BNB%20fast/src/components/command-center/slides.tsx)

- Update `SlideCover` to match the new minimalist header/footer and large bold title.
- Update `SlideExecutiveSummary` to include the Performance Score badge in the top right.
- Update `SlideBusinessHealth` to match the 3x2 grid of score rings and the AI Intelligence Insight box at the bottom.
- Update `SlideOverallPerformance` to match the table styling and Growth Analysis box at the bottom.
- Update `SlideOrganicGrowth` to match the 4 KPI cards and the split view with Search Visibility chart and AI Intelligence text.
- Update `SlideKeywordOpportunity` to match the scatter plot and High-Impact Keyword table.
- Update `SlideCampaignPerformance` to match the two-column campaign cards with bar charts and bottom recommendations.
- Update `SlideAudience` to match the Geographic Concentration map (placeholder) and Top City Performance bar chart.
- Update `SlideLeadGenIntelligence` to match the donut chart and Channel Efficiency Metrics table.
- Update `90-Day Strategic Growth Roadmap` to match the three-column layout with category badges.
- Update `Growth Intelligence Summary` to match the 4 KPI cards and the Final Strategic Outlook box.

#### [DashboardComponents.tsx](file:///D:/BNB%20fast/src/components/command-center/DashboardComponents.tsx)

- Adjust `KPICard` styling to be more minimalist if needed.
- Adjust `ScoreRing` to match the thin stroke and centered score in the images.
- Adjust `InfoCard` padding and rounding.

#### [ClientReports.tsx](file:///D:/BNB%20fast/src/components/command-center/ClientReports.tsx)

- Update `BrandingHeader` and `BrandingFooter` to match the new positioning and style (e.g., logo on left, "INTELLIGENCE REPORT // 2025" on right).

## Verification Plan

### Manual Verification
- Launch the application and navigate to the "Client PPT" section.
- Compare each slide with the provided reference images.
- Verify that real data from the `MarketingReport` is correctly populated in the new structures.
- Test the "Edit PPT" mode to ensure all new text elements are still editable.
- Verify that the "AI Refine" functionality still works with the new layout.
