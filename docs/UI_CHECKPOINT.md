# Interface verification: 11 November 2026

Checked deployed revision d953237 using the existing administrator account.

- Desktop dark dashboard: summary cards share the same surface, outline and lime top border.
- At 390 x 844, dashboard cards stack vertically with readable labels. Measured document width was 375 pixels within a 390-pixel viewport, with no page-level horizontal overflow.
- Complaint records inspected in light and dark mobile modes. Search, city selector and filter controls fit the viewport; the wider table stays within its scrolling container. Page width did not exceed the viewport.
- Mobile sidebar opens and closes; its theme switch updates the appearance. Temporary viewport override restored afterward.
- One session expired during navigation. Signing in again restored access. No account or application data was changed during these checks.

Automated verification: 21 tests passed using `node --test scripts/verify-feedback.cjs scripts/verify-auth-session.cjs scripts/verify-report-model.cjs scripts/verify-city-explorer.cjs`.

This is a focused layout and client-logic checkpoint. It does not claim full all-role journeys, every dialog, native print preview, Java regression or database permission verification. Those remain separate acceptance tasks.
