# Indian Localization for Currency and Number Formatting

This plan outlines the changes required to localize the application for India, including replacing all dollar symbols with the Rupee symbol (₹) and ensuring number formatting follows the Indian system (Lakh/Crore).

## User Review Required

- **Number System**: The Indian number system (Lakh/Crore) will be applied using the `en-IN` locale for all `toLocaleString()` calls.
- **Currency Symbol**: All instances of `$` will be replaced with `₹`.

## Proposed Changes

### Frontend Utilities

#### [mapper.ts](file:///D:/BNB%20fast%20new/src/utils/mapper.ts)

- Update all `.toLocaleString()` calls to `.toLocaleString('en-IN')`.
- Ensure all cost and CPA fields use the `₹` symbol.

#### [useReportData.ts](file:///D:/BNB%20fast%20new/src/components/command-center/useReportData.ts)

- Update all `.toLocaleString()` calls to `.toLocaleString('en-IN')`.
- Ensure `getGoogleAdsKpis` uses the `₹` symbol for Spend and Cost per Lead.

---

### Frontend Components

#### [ClientReports.tsx](file:///D:/BNB%20fast%20new/src/components/command-center/ClientReports.tsx)

- Update any `.toLocaleString()` calls to `.toLocaleString('en-IN')`.
- Ensure table headers and values reflect Indian currency where appropriate (e.g., "Amount Spent (₹)").

---

### Backend Services

#### [google_ads.py](file:///D:/BNB%20fast%20new/fastapi-backend/app/services/google_ads.py)

- Review for any hardcoded `$` symbols in log messages or returned strings (though primarily data is numeric).

#### [meta_ads.py](file:///D:/BNB%20fast%20new/fastapi-backend/app/services/meta_ads.py)

- Review for any hardcoded `$` symbols.

## Verification Plan

### Automated Tests
- No specific automated tests.

### Manual Verification
- **Visual Inspection**: Run the application and verify that all currency amounts show `₹` and numbers above 100,000 follow the `##,##,###` grouping (e.g., `1,00,000` instead of `100,000`).
- **Grep Search**: Run a final grep search for `$` to ensure no literal symbols remain in the code (excluding template literals).
