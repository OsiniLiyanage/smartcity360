# Interface verification: 11 November 2026

Checked deployed revision d953237 using the existing administrator account.

- Desktop dark dashboard: summary cards share the same surface, outline and lime top border.
- At 390 x 844, dashboard cards stack vertically with readable labels. Measured document width was 375 pixels within a 390-pixel viewport, with no page-level horizontal overflow.
- Complaint records inspected in light and dark mobile modes. Search, city selector and filter controls fit the viewport; the wider table stays within its scrolling container. Page width did not exceed the viewport.
- Mobile sidebar opens and closes; its theme switch updates the appearance. Temporary viewport override restored afterward.
- One session expired during navigation. Signing in again restored access. No account or application data was changed during these checks.

Automated verification: 21 tests passed using `node --test scripts/verify-feedback.cjs scripts/verify-auth-session.cjs scripts/verify-report-model.cjs scripts/verify-city-explorer.cjs`.

This is a focused layout and client-logic checkpoint. It does not claim full all-role journeys, every dialog, native print preview, Java regression or database permission verification. Those remain separate acceptance tasks.

## Subsequent role and Java checks

`node scripts/verify-current-roles.mjs` passed 105 live checks across the five existing roles. This uses the private local account configuration, without embedding credentials. Covered login/session/logout, visible city scope, complaint authority-tier filtering, resident denial for meters/lights/policies, staff cross-city denial, resident detail omission of employee-assignment fields and report totals/status filters. No business records were modified.

Second-resident ownership isolation was explicitly skipped because every complaint in the selected active city belonged to the retained resident. The script reports that missing fixture rather than claiming coverage. Write journeys and other-resident isolation remain to be exercised separately.

`mvn -B -o test` passed all 67 Java tests, with zero failures, errors or skips. This supersedes the earlier Java-regression limitation for this checkpoint, but mocked service tests do not replace live transaction and permission testing.

## Live complaint writes and two-resident isolation

`node scripts/verify-live-complaint-journey.mjs --apply` passed 42 live checks against the running application/database. The explicit apply flag is required because each run creates and retains two complaints. The script creates or reuses a second local resident using the private sample account configuration; no credentials are committed.

Verified both directions of resident detail/queue isolation, rejected other-resident messages/reopening requests, resident denial of staff status updates, named employee assignment, resident follow-up, public staff reply, stale-version rejection, private work-note exclusion, resolution, pending reopening, local-staff review denial, supervisor rejection and approval with explanations, final resolution, and persistence after signing in again. Cases 95 and 96 remain in city 35 from this run.

This closes the earlier missing second-resident complaint fixture and verifies a complete live complaint write journey. It does not claim equivalent write acceptance for account administration, every meter operation, every policy operation or every browser form.

The subsequent current-role verifier passed 106 live checks with no ownership-fixture skip, using the retained second-resident case.
