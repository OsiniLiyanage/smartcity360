# Complaint reports

Open **Reports** from a staff sidebar or **My reports** from a resident sidebar. The dashboard shortcut carries the selected city into the report. This is an operational application feature, not the assignment submission document.

## Generate a report

1. Choose an available city. Residents receive only their own complaints. Staff receive the city and authority-tier scope enforced by the existing Java complaint API.
2. Optionally select an area, submission dates, current status and severity. An area includes its child areas. Whole-city complaints means cases with no specific area.
3. Select **Generate report**. This fetches saved records again and applies all filters together. **Reset filters** clears the optional filters while retaining the city.
4. Review totals, current-status and severity bars, submission-month bars and the matching case table. Open a reference to inspect a case.
5. Select **Print / Save as PDF**. The application refreshes and rechecks access before calling the browser print flow. Choose a printer or the browser's PDF destination. There is no separate server PDF generator.

Changing filters hides the old preview and disables printing until a valid report is generated. Failed requests also hide the preview. An empty result is a valid report with zero totals and an explicit no-data message. On a small screen only the table scrolls horizontally.

## Metric definitions

- Submission dates are inclusive UTC calendar days. The ending day is included through its last instant. All report table dates and generation timestamps are UTC.
- Current-status and severity counts describe the filtered cases now. They do not reconstruct historical status at the end of a date range.
- Open means any current status except resolved. Pending reopening requests remain resolved until approved and have a separate total.
- Submission-month bars count the same filtered cases by their UTC submission month. Only months with submissions appear; omitted months have zero. A partial date range can cover part of a month.
- The numeric bar labels, totals and detail table all derive from the same filtered collection. Cases are ordered by submission time descending, then reference descending.

The page uses the existing protected city, area and complaint-list endpoints. It does not fetch complaint history. The report model explicitly selects permitted summary fields and excludes reporter names, employee identities, private work notes, descriptions and credentials. Subjects remain visible to authorized users and render as text, never HTML. Existing direct case permissions still apply when following a reference.

## Implementation and appearance

`reports.html`, `assets/js/reports.js`, `assets/js/report-model.js` and `assets/css/reports.css` contain this feature. Report navigation is in the existing shared sidebar and dashboard script. No Java source, dependency or database migration is required by this report feature. It does not introduce an additional design pattern.

Reports inherit the current screen theme and configured application font. Their summary sections use a flat layout. Print palette tokens are defined in `assets/css/themes.css` as `--print-*`; the report print rules preserve a neutral light page even when later screen styles override the dark/light palette. Print rules hide navigation and filters, remove the desktop sidebar margin, repeat table headings and allow the table to flow across pages.

## Verification on 9 November 2026

- `node --test scripts/verify-report-model.cjs`: six tests passed. Covers inclusive UTC/offset boundaries, invalid dates/ranges, intersecting filters, descendant areas, totals, pending requests, empty data, stable ordering and exclusion of private fields.
- `node scripts/verify-reports.mjs`: 62 read-only live checks passed against the retained local verification accounts, including all five roles, unauthorized access, cross-city denial, tier scope, resident separation and chart/table totals. This script does not seed cities, change passwords or modify complaints.
- Browser: the current simple-demo resident account opened Colombo with two own cases. Resolved filter returned zero. A reversed date range was rejected with printing disabled. A single-day filter returned the correct one case and matching chart totals. Reset restored two cases. Editing filters hid the stale preview. Five visible demo cities remained intact.
- Browser desktop: 1280px light and dark report surfaces inspected. Mobile: 390 x 844 CSS viewport, both themes, drawer open/close, fields and contained table scrolling checked. No page-wide horizontal overflow. Mobile checks use rendered dimensions and interactions, not a real-device certification.
- The updated shared application packaged and deployed successfully. Backend source was unchanged by this report milestone; Java tests were not rerun for these frontend changes.
- **Native print preview remains unverified.** The in-app browser did not expose a print preview. Windows computer use then stopped because it could not reliably identify Chrome's current URL. The print button refreshed the report successfully; the browser print dialog, pagination and Save as PDF output still require a normal-browser check. No physical print or PDF output was produced.

[Report table and monthly chart evidence](evidence/complaint-report-light.png).

This milestone covers complaint summaries. Individual public-history reports, energy reports, maintenance reports and policy reports remain future work.
