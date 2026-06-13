# Task List

- [x] Investigate why report data is missing in the frontend
    - [x] Locate relevant files (`performance_worker.py`, `useReportData.ts`)
    - [x] Analyze `performance_worker.py` to see how data is stored
    - [x] Analyze `useReportData.ts` to see how data is fetched and processed
    - [x] Identify discrepancies between stored data and frontend expectations
- [x] Fix the data display issue
    - [x] Update `useReportData.ts` with better checks and simplified mapping
    - [x] Update `mapper.ts` to correctly handle raw data and fix numeric parsing
    - [x] Update `ReportViews.tsx` for key consistency
- [x] Verify the fix
