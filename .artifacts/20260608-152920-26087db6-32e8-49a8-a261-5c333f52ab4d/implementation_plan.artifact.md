# Rename "Client Reports" to "Client PPT" and add "Client Doc" with Sub-menu

The goal is to:
1. Rename "Client Reports" (PPT-style) to "Client PPT".
2. Create a new "Client Doc" section in the sidebar.
3. Move the "Client Report" view from the SEO and Performance Intel sub-menus to a new sub-menu under "Client Doc".
4. The "Client Doc" sub-menu will have "SEO Client Report" and "Performance Client Report" (and potentially Social).

## Proposed Changes

### UI Components

#### [Sidebar.tsx](file:///D:/BNB fast new/src/components/Sidebar.tsx)

- Update `navItems`:
    - Rename `client-reports` to `client-ppt` and update label to "Client PPT".
    - Add `client-doc` with label "Client Doc", `FileText` icon, and a custom `subItems` array.
- Update `subSections`:
    - Remove `Client Report` from the standard sub-menu used by intelligence categories.
- Update rendering logic:
    - Support rendering custom `subItems` for "Client Doc".
    - Ensure the sub-menu expands when "Client Doc" is active or hovered.

```tsx
// Inside Sidebar component
const navItems = [
  // ...
  {
    id: 'client-ppt',
    label: 'Client PPT',
    icon: Presentation,
    action: () => onNavigate('client-ppt')
  },
  {
    id: 'client-doc',
    label: 'Client Doc',
    icon: FileText,
    action: () => onNavigate('client-doc', activeCategory, 'Client Report'),
    subItems: [
      { name: "SEO Client Report", category: 'SEO' as CategoryType },
      { name: "Performance Client Report", category: 'Performance Marketing' as CategoryType },
      { name: "Social Client Report", category: 'Social Media Marketing' as CategoryType },
    ]
  },
  // ...
];

const subSections = [
  { name: "Reports", label: "AI Analysis" },
  { name: "Graphs", label: "Visual Charts" },
  { name: "BnB Report", label: "Internal Strategy" },
  // "Client Report" removed
];
```

#### [CommandCenter.tsx](file:///D:/BNB fast new/src/components/CommandCenter.tsx)

- Update view rendering logic:
    - Handle `client-ppt` (renamed).
    - Handle `client-doc` by rendering `ReportViews` with `activeSection="Client Report"`.
- Ensure `handleNavigate` correctly triggers data fetching when switching categories via the "Client Doc" sub-menu.

```tsx
          ) : activeView === 'client-ppt' ? (
            <ClientReports
              report={marketingReport}
              category={category}
              setCategory={setCategory}
              isFullscreen={isFullscreenReport}
              setIsFullscreen={setIsFullscreenReport}
              userAvatarUrl={user.avatarUrl}
            />
          ) : activeView === 'client-doc' ? (
            marketingReport ? (
              <ReportViews report={marketingReport} activeSection="Client Report" />
            ) : (
              // Empty state / No Intel Generated component
            )
          ) : marketingReport ? (
            <ReportViews report={marketingReport} activeSection={section} />
          ) : ( ... )
```

## Verification Plan

### Manual Verification
- **Sidebar Check**:
    - Verify "Client PPT" exists and is renamed from "Client Reports".
    - Verify "Client Doc" exists.
    - Click "Client Doc" or hover over it: Verify sub-menu shows "SEO Client Report", "Performance Client Report", etc.
    - Verify "Client Report" is GONE from "SEO Intelligence" and "Performance Intel" sub-menus.
- **Navigation Check**:
    - Click "SEO Client Report" under "Client Doc": Verify it shows the "Authenticated Client Briefing" for SEO.
    - Click "Performance Client Report" under "Client Doc": Verify it switches category and shows the Performance client report.
    - Click "Client PPT": Verify it shows the slide presentation.
- **State Check**:
    - Ensure navigating between "Client Doc" sub-items correctly updates the `category` and fetches new data if needed.
