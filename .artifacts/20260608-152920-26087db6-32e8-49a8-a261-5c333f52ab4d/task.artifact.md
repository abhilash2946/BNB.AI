# Task List

- [x] Research project structure and implementation of Sidebar and CommandCenter
- [x] Create implementation plan (updated with "Client Doc" sub-menu)
- [x] Execute implementation
    - [x] Update `Sidebar.tsx`:
        - [x] Rename `client-reports` to `client-ppt`
        - [x] Add `client-doc` with `subItems` (SEO, Performance, Social)
        - [x] Remove `Client Report` from shared `subSections`
        - [x] Update rendering logic to handle custom `subItems`
    - [x] Update `CommandCenter.tsx`:
        - [x] Update view rendering for `client-ppt`
        - [x] Implement rendering for `client-doc` (forced "Client Report" section)
- [x] Verify changes
    - [x] Check Sidebar labels and items
    - [x] Verify sub-menu under "Client Doc"
    - [x] Verify "Client PPT" functionality
    - [x] Verify "Client Doc" sub-items navigate correctly and show correct content
    - [x] Confirm "Client Report" removal from standard intel sub-menus
