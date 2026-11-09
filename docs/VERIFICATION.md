# Verified development checkpoints

## 7 November 2026 - first persistent city

Environment: Windows, Java 21, Payara Community 7.2026.10, PostgreSQL 18.6, PostgreSQL JDBC 42.7.14. Application at localhost:9080; database at 127.0.0.1:5433. A dedicated local development domain/database was used.

| Check | Observed result |
|---|---|
| Maven package | BUILD SUCCESS; five Java sources compiled with release 21 |
| Deploy WAR | Payara reported successful deployment |
| GET /api/cities | HTTP 200 with a JSON array |
| POST city name with surrounding spaces | HTTP 201; generated numeric ID; returned name was trimmed |
| Missing name | HTTP 400 |
| Null name | HTTP 400 |
| Numeric name | HTTP 400 |
| Whitespace-only name | HTTP 400 |
| 101-character name | HTTP 400 |
| Row count after invalid requests | Unchanged by the five rejected requests |
| Page and JavaScript URLs | HTTP 200; expected form and script served |
| Restart PostgreSQL and Payara | Both restarted; same city ID/name returned by API |
| Direct SQL with app login | Matched the saved API record |
| JavaScript syntax | node --check passed |
| PowerShell helper syntax | Parser reported no errors |
| Git whitespace | git diff --check passed |
| Local files ignored | Credentials and PostgreSQL data paths were excluded by Git |

One clearly labelled **Demo City** record was retained so the student can inspect it. It is demonstration data.

These were live scripted HTTP/SQL checks during development, not a committed automated regression suite. Browser interactions have not been automated or visually reviewed at this checkpoint. No load, authentication or complete assignment acceptance test is claimed.

## Reproduce the main user journey

1. Start PostgreSQL, then Payara; build/deploy as documented.
2. Open the application and create a city with a valid name.
3. Refresh the list and the page; confirm the record remains.
4. Submit missing/blank/invalid names directly to the API; expect HTTP 400 and no new row.
5. Stop Payara, stop PostgreSQL, start PostgreSQL, then start Payara.
6. Fetch /api/cities again and confirm the same ID/name remains.

The form can be used for the normal journey; direct API requests are necessary to verify that server validation still works when browser validation is bypassed.

At this first checkpoint, the root city was only a persistence foundation. The next checkpoint verifies the hierarchy implementation.

## 7 November 2026 - Composite hierarchy and Tailwind workspace

Same Java/Payara/PostgreSQL environment as above. Tests used labelled demonstration cities, preserving all existing user records.

| Check | Observed result |
|---|---|
| Maven package | BUILD SUCCESS; 13 Java source files; five JUnit tests passed |
| Tailwind build | CLI 4.3.0 generated the local CSS successfully |
| Dependency installation | npm reported zero vulnerabilities at installation time |
| Live API regression | `node scripts/verify-zones.mjs`: 41 HTTP checks passed |
| Exact usage aggregation | 12.125 + 7.875 + 5 = 25 kWh; three buildings |
| District shutdown | Two buildings off; neighbouring district's building on; city MIXED |
| Building and city commands | Single-building command and whole-city on/off produced expected counts |
| Recorded usage after shutdown | Still 25 kWh |
| Concurrent district commands | Both off commands persisted; no neighbouring update lost in this check |
| Empty city | Zero usage/buildings; EMPTY power state |
| Invalid hierarchy | Wrong levels, root type, invalid IDs, missing city and cross-city targets rejected |
| Invalid readings | Negative, too many decimals, over-limit, text/null, and group readings rejected |
| Invalid power value | String `"false"` rejected; boolean required |
| Rejected-request effects | No additional nodes and no changed readings/power states |
| Browser workflow | Selected city/areas; created district, street and building; changed district power; saved a reading and observed the total change |
| Browser empty-group controls | Power buttons disabled until a building exists |
| Visual inspection | Tailwind styles loaded; hierarchy and forms readable in the available narrow browser viewport |
| Restart persistence | Stopped Payara and PostgreSQL; started both; full hierarchy JSON matched saved snapshot including readings and power states |
| JavaScript syntax | `node --check src/main/webapp/assets/js/cities.js` passed |

The main API demo city is ID 4, named `Composite Demo 2026-11-07T01:53:44.928Z`. It contains East/West Districts, Lake/Park Roads and Library/Clinic/Community Hall. ID 5, `Isolation Demo 4`, was also used for cross-city rejection checks and later received a separate Browser Demo district/street/building through the page. Test readings in city 4 were restored to their initial 25 kWh total with all three buildings on after the browser checks.

The integration script saves a private snapshot in `.local/zone-verification.json`. The browser screenshot is retained in `docs/report/evidence/composite-workspace.png` for report assembly. No credentials or database files are included in that evidence.

### Reproduce the Part B demonstration

1. Apply the current SQL files with the database helper's Setup action, build and deploy.
2. Run `mvn test` for the five pure Java behavior tests.
3. With both servers running, run `node scripts/verify-zones.mjs`. Each run retains two new labelled demo cities; it does not delete existing records.
4. In the workspace choose the generated Composite Demo city. Select East District and switch it off.
5. Select the city: expect 25 kWh, three buildings, one powered on and Mixed state. Select West District: expect its building to remain on.
6. Select Library, edit usage, and inspect its ancestors for updated totals. Restore demonstration readings when finished.
7. Select the city and switch on to restore all buildings.

### Limits

These checks establish the local Part B behavior, not completion of all five assignment scenarios. The browser was inspected at its available viewport; a full desktop/mobile/browser compatibility sweep has not been performed. Concurrent commands were checked once with two requests; no stress or scale benchmark is claimed. Power is simulated and readings are entered manually for a shared reporting period. Authentication, real device delivery, historical reporting periods and final report/PDF/video production remain pending.

## 7 November 2026 - Complaint workflow and Chain of Responsibility

The complaint module was built and verified against the same local Java 21 / Payara 7 / PostgreSQL 18 setup. Existing cities/zones were preserved by the additive schema update.

| Check | Observed result |
|---|---|
| Java build | Maven package succeeded; 25 Java sources; all 11 tests passed (six chain, five Composite) |
| All severity routes | LOW accepted by local staff; MEDIUM forwarded to supervisor; HIGH forwarded through both to city manager |
| Stop-at-first acceptance | Later handlers absent from successful LOW/MEDIUM routes |
| Shortened chain | Unit test returned explicit UNHANDLED with no authority |
| Alternative wiring | Unit test started at supervisor and handled LOW/HIGH without changing caller |
| Independent results | Later requests did not modify earlier route histories; result list immutable |
| Live API regression | `node scripts/verify-complaints.mjs`: 46 HTTP checks passed |
| Input validation | Invalid/missing text, enum values, IDs, null/array/string bodies rejected with 400 |
| City/area isolation | Cross-city area, detail and mutation requests returned 404 |
| Work lifecycle | Assignment remained distinct from resolution; start, resolve and reopen saved mandatory notes |
| Invalid lifecycle | Direct ASSIGNED → RESOLVED and resolved escalation rejected with 409 |
| Escalation | Higher severity rerouted, preserved earlier history and reset status to ASSIGNED |
| Stale updates | Old version rejected with 409 for status and escalation |
| Concurrent edits | Two updates with the same version produced one 200 and one 409; one work event saved |
| Browser submission | Created complaint #11 and saw Local staff assignment |
| Browser escalation | LOW → MEDIUM assigned Supervisor; original assignment remained in history |
| Browser work/resolve | Start work then resolve with notes; page displayed Resolved |
| Browser filtering/search | Resolved filter worked; unmatched search showed 0 of 1; matching subject showed 1 of 1 |
| Browser reload | Reopened saved complaint after page reload; resolved state and history remained |
| Full restart persistence | Stopped/started Payara and PostgreSQL; all four API detail snapshots matched exactly, including histories/versions/timestamps; browser complaint remained RESOLVED with seven events |
| Frontend checks | Tailwind build and JavaScript syntax check passed; inspected the desktop layout |

### Defects found and corrected before this checkpoint

The first live test showed that the JPA provider could reorder pending history inserts, producing a misleading display order. The service now flushes each event in logical order inside the same transaction. All route ordering assertions then passed.

A later negative-input check found that accepting only a `JsonObject` parameter allowed JSON `null` to cause a provider argument mismatch and HTTP 500. Complaint endpoints now accept `JsonValue`, explicitly require an object and return HTTP 400 for null/array/scalar bodies. The regression script covers these cases.

### Evidence and retained demonstration data

- Successful API checkpoint: city **10**, `Complaint Demo 2026-11-07T08:48:15.180Z`; four complaints covering the three severities and concurrent edits.
- Browser checkpoint: city **11**, `Complaint Isolation 10`; complaint **11**, `Blocked drain near the library`, escalated from LOW to MEDIUM and resolved with seven history entries.
- Private restart snapshot: `.local/complaint-verification.json`.
- Screenshots: `docs/report/evidence/complaint-resolved.png` and `complaint-history.png`.
- Earlier failed development runs retained labelled demo cities 6 and 8; use the successful checkpoint cities above when reproducing the verified demonstration. No existing user data was deleted.

### Remaining scope

No real municipality is notified. Demo operator labels are not authenticated identities; role enforcement remains pending. The normal chain handles all supported severities, so the intentionally shortened-chain failure is a unit-test scenario, not a UI configuration. No runtime chain editor, manual assignment screen, named staff allocation, large-queue benchmark or complete browser compatibility audit is claimed. Parts A, D and E and final report/PDF/video production remain outstanding.

## 7 November 2026 - Meter processing and Decorator

Same local Java/Payara/PostgreSQL environment. `004_meters.sql` adds meter and reading tables without replacing prior records. The feature is a sequence of bounded meter messages, not a connection to real hardware.

| Check | Observed result |
|---|---|
| Maven package | BUILD SUCCESS; 37 Java sources; 18 tests passed, including seven new Decorator tests |
| Eight layer combinations | Exact original byte recovery for every authentication/compression/encryption combination, in unit and live tests |
| Credential failure | Unit test verified rejection before delegation; live submission/recovery returned 401 |
| Encryption | Fresh nonces produced different encrypted outputs; wrong key and modified/truncated ciphertext rejected in unit tests |
| Compression | Repetitive unit-test data became smaller; corrupted GZIP rejected |
| Expansion limit | Over-64-KiB decoded message rejected |
| Input protection | Base component did not expose/mutate its input array; oversized input rejected |
| Live regression | `node scripts/verify-meters.mjs`: 63 HTTP checks passed |
| Registration rules | Building required; duplicate building meter returned 409; cross-city building returned 404 |
| Meter list | Exposed only ID, name and building ID; no credential/hash |
| Reading integration | Latest accepted reading replaced building usage; neighbouring building remained at its existing total |
| Rejected inputs | Negative/over-limit/over-precision/non-numeric usage, invalid flags and non-object bodies rejected |
| Rejected-request effects | No saved reading and no usage change from rejected submissions |
| Credential replacement | Old credential rejected; new credential recovered an earlier authenticated reading |
| Optional authentication | Explicitly disabled layer allowed processing/recovery without a valid credential, as labelled in the demo |
| Corrupted copy | Recovery rejected a modified copy; subsequent original recovery succeeded |
| Browser registration | Registered Clinic demonstration meter for Demo Clinic |
| Browser accepted reading | Reading #10 stored 42.125 kWh; city total became 60.25 kWh |
| Browser recovery | Exact JSON message recovered with all three layers selected |
| Browser corruption test | Corrupted copy rejected; original still recovered |
| Size reporting | Browser sample: 87 original bytes → 132 encoded bytes; increase displayed explicitly |
| Full restart | Stopped/started PostgreSQL and Payara; all nine API snapshots matched and every payload recovered successfully using the persistent key |
| Frontend | Tailwind build, JavaScript syntax and desktop visual inspection passed |

### Evidence

Successful API city: **12**, `Meter Demo 2026-11-07T13:44:03.229Z`. Library meter is **1**; the API script retained nine readings, IDs 1–9. The browser then registered meter **2**, `Clinic demonstration meter`, for building **18**, and saved reading **10**. The private API restart snapshot is `.local/meter-verification.json`; it contains a generated demonstration credential and must not be published. Browser proof is `docs/report/evidence/meter-recovery.png`, which does not reveal the credential or encryption key.

### Reproduce

1. Apply numbered SQL files with the database helper's Setup action, then build/deploy.
2. Run `mvn test`, and `node scripts/verify-meters.mjs` with the servers running.
3. In Energy meters, choose a city with an unregistered building and register a meter. Save its issued credential privately.
4. Process a reading with all three layers; verify building/city totals and recover the message.
5. Test a corrupted copy, then recover the original again.
6. For restart checks, retain the meter credential privately and preserve the domain key; restart both servers and recover stored readings.

### Limits

Optional meter authentication is not application login or role enforcement. Payload encryption leaves usage metadata plaintext and does not secure the HTTP connection. Registration/credential replacement are local demonstration operations. The key uses inherited domain file permissions; no distributed key vault or multi-key rotation is implemented. Message sizes are bounded, but high-volume streaming, large-history pagination and production security testing are not claimed. Part D, Part E, application access controls and final report/PDF/video remain pending.

## Part D checkpoint - 7–8 November 2026

Part D now provides persistent streetlight registration, individual power/fault controls, shared immutable specifications, paginated inventory and a separate Flyweight demonstration. The earlier checkpoint's pending-Part-D status is superseded by this section.

| Check | Observed result |
|---|---|
| Maven package | Passed; 46 Java source files compiled, WAR created |
| JUnit | 24 passed: 5 Composite, 6 Chain, 7 Decorator, 6 Flyweight; zero failures/errors |
| JavaScript syntax and Tailwind build | Passed |
| Numbered database setup | `005_streetlights.sql` applied; existing data retained |
| Live streetlight API | 55 checks passed |
| 100,000-light identity demonstration | 3 shared specification objects versus 100,000 actual baseline specification objects; 99,997 avoided |
| Independent state in demonstration | Passed; one light switched off while another with the same specification stayed on |
| Demonstration persistence impact | No database records created |
| Browser workflow | Shared specification creation, registration, individual switching, fault note and 100,000-light demonstration passed |
| Restart comparison | Saved inventory exactly matched after PostgreSQL/Payara restart, including versions and fault note |

### API and unit scope

The HTTP script checks exact configuration reuse (including concurrent creation), distinct configurations, pagination, actual shared identities on a page, independent power/fault/repair behavior, changing one light's configuration, duplicate labels, invalid JSON and field types, cross-city isolation, stale versions and simultaneous edits. One competing edit succeeds while the other receives 409. The unit suite checks 100,000 shared contexts and concurrent factory lookup as well as invalid configurations.

These are separate feature checkpoints, not a claim that all four live API scripts were rerun together after the latest deployment. The full unit suite passed with Part D included.

### Browser and restart evidence

In city 14, the browser registered `SL-BROWSER` at `Community centre entrance` with a new `Community LED 75` / 75 W / neutral-white specification. Switching it off left the other three lights unchanged. It was then commanded on and marked faulty with the note “Demonstration fault: lamp flickers; inspection requested.” The summary showed four saved lights, three healthy/on lights, one fault and 160 W simulated rated load.

The 100,000-light browser demonstration showed three shared specifications, 100,000 unshared specification objects and independent light state. Evidence images are [workspace](report/evidence/streetlight-workspace.png) and [sharing demonstration](report/evidence/streetlight-sharing.png).

A private local snapshot of the complete four-light inventory was taken before stopping Payara and PostgreSQL. After starting PostgreSQL and then Payara, an exact JSON comparison passed: all settings, IDs, versions and the fault note were retained. The reconstructed page again reported three shared specification identities for four light contexts. The snapshot is ignored local verification material, not required application configuration.

The API demonstration took 375.96 ms and the later browser demonstration took 106.30 ms on this machine. Each time covers the combined shared and baseline allocations plus identity counting. These uncontrolled samples are not a shared-versus-unshared speed benchmark or a heap-memory measurement.

### Reproduce

1. Apply numbered database scripts with `Setup`, build the WAR and deploy.
2. Run `mvn test` and, with both servers running, `node scripts/verify-streetlights.mjs`.
3. Open Streetlights, select a city with a street, create a specification and register a light.
4. Change that light's power, save a fault note and verify other lights remain unchanged.
5. Run the 100,000-light demonstration and inspect object counts and independent-state confirmation.
6. Save the inventory response; stop Payara then PostgreSQL, start PostgreSQL then Payara, and compare the inventory again.

The HTTP script retains two demo cities, three lights and test configurations per successful run. Browser verification added one further light. Do not mistake the in-memory 100,000-light exercise for 100,000 saved database records.

### Limits and remaining work

Rated load is a simulation based on nameplate watts, commanded power and fault status; it is not measured consumption. The inventory has no bulk operation, deletion or maintenance-history feature. The pool retains unique requested configurations until restart/redeployment. No production load, hardware integration or heap-memory benchmark was performed. Part E, application access controls, final consolidated report/PDF and recorded video remain pending.

## Part E checkpoint - 8 November 2026

Part E now supports saved city policy rules, syntax validation, zone-linked observations, explicit result meaning and immutable evaluation history. This supersedes the earlier pending-Part-E status. All five assessed pattern features are implemented; the final integrated acceptance audit and submission artifacts remain pending.

| Check | Observed result |
|---|---|
| Maven package | Passed; 57 Java source files compiled and WAR produced |
| Full JUnit suite | 33 passed: 5 Composite, 6 Chain, 7 Decorator, 6 Flyweight, 9 Interpreter; zero failures/errors |
| JavaScript syntax and Tailwind build | Passed; compiled local CSS included |
| Database setup | `006_policies.sql` applied without recreating existing tables/data |
| Live policy API | 84 HTTP checks passed |
| Browser rule workflow | Created a rule, checked syntax, saved/evaluated it, edited its threshold and retained both results |
| Error handling in browser | `noise >` produced “Expected a decimal number at character 8.”; dirty draft disabled evaluation |
| Restart persistence | Exact comparison passed for 4 policies and 10 saved evaluations after PostgreSQL/Payara restart |

### Covered behavior

Unit tests verify overnight rules and boundaries, all six decimal comparison operators, boolean precedence, parentheses, negation, parking rules, runtime threshold changes, missing fields even on short-circuited branches, malformed/unsupported text, source/token/nesting/literal limits, observation ranges/precision and immutable contexts.

The HTTP script additionally checks saved creation/editing, explicit violation/permission outcomes, required fields and grouping, policy/history pagination, unchanged earlier snapshots after rule edits, disabled rules, duplicate names, cross-city records/zones, invalid JSON/types/values, stale updates/evaluations and two concurrent edits (one succeeds, the other receives 409). Rejected evaluations do not add history.

An initial API run stopped because its test assumed a new JPA version would be zero. Payara assigned version 1. The test now accepts the valid server-provided non-negative version, and the UI displays that stored revision directly. The successful rerun completed all 84 checks. The earlier partial demo dataset was retained; no user data was deleted.

### Browser evidence

In city 18, the browser created **Browser overnight noise check** with `noise > 65 AND (hour >= 22 OR hour < 6)` and true meaning violation. For Library Street, 70 dB at hour 23 produced a violation at revision 1. Editing the threshold to 75, saving and evaluating the same observations produced no violation at revision 2. Expanded history displayed both original rules and their outcomes. The screen required saving the draft before another evaluation.

The browser also checked a malformed rule and reloaded the saved valid rule without creating an invalid revision. [History evidence](report/evidence/policy-history.png) shows both saved versions. The browser check covered the noise workflow; permission outcomes and parking boundaries were separately exercised by API/unit tests.

### Restart and reproduction

Before restart, the complete current policy list and each policy's history for city 18 were saved in ignored `.local/policy-restart.json`. Payara and PostgreSQL were stopped, PostgreSQL was started first, then Payara. Exact JSON comparisons passed for all four policies and ten historical evaluations, including rule text, versions, observations, results, notes and timestamps.

To reproduce the feature checks, apply numbered database scripts, build/deploy, run `mvn test`, then run `node scripts/verify-policies.mjs` with both servers running. A successful HTTP run retains two demo cities, three policies and eight evaluations. Browser verification added a fourth policy and two evaluations to its demo city. For restart verification, snapshot the complete list/history, restart in the documented order and compare again.

The full unit suite passed with Part E included. Earlier live API checkpoints for A–D were not all rerun in this milestone; their original evidence remains above. Packaging after the revision-label-only JavaScript correction skipped repeating Java tests; the corrected interface was verified in the browser.

### Limits and remaining work

The language has three known numeric fields; it does not execute scripts, perform arithmetic, handle dates or automatically enforce outcomes. Observations are manual and the timestamp records evaluation time. History preserves evaluated revisions, not every intermediate edit. No load benchmark or production access-control audit was performed. User login/roles, the integrated dashboard, the full acceptance audit, rendered final report/PDF, clean-run source ZIP and 10–15-minute video remain to be completed.


## Accounts and access checkpoint - 8 November 2026

This checkpoint supersedes earlier statements that application login and permissions are pending. It completes the account foundation, not the full product roadmap. The submission PDF, ZIP and video remain on hold.

| Check | Observed result |
|---|---|
| Maven package | Passed; 71 application Java sources, WAR deployed |
| Full JUnit suite | 38 passed, zero failures/errors: 33 pattern tests plus 5 security tests |
| JavaScript syntax and Tailwind build | Passed; local compiled CSS and versioned account assets included |
| Account/access HTTP suite | 95 checks passed across all five roles |
| Existing feature regression | All rerun with authentication: 41 hierarchy, 46 complaints, 63 meters, 55 streetlights, 84 policies (289 total) |
| Browser | Resident sign-in/private history, staff city scope and hidden controls, admin user list/account activity, and sign-out verified |
| Restart persistence | Exact comparison passed for 6 accounts, activity records, staff scopes and resident complaint history; unauthorized access remained denied |
| Repository checks | No em dashes or private local credential values found in publishable text files; Git whitespace checks passed |

### Access and privacy coverage

The account suite checks unauthenticated requests, CSRF on writes/login, HttpOnly and SameSite=Strict session cookies, login session rotation, normalized duplicate emails, attempted privilege selection during public signup, temporary-password restrictions, each staff city boundary, complaint tier boundaries and resident record ownership. It verifies that staff-only notes and real staff names do not appear in resident history. Pre-existing and staff-created ownerless complaints are not claimed by a resident with the same display name.

Profile/password checks cover incorrect current passwords and invalidation of a second session after password change. Admin checks cover disabled-account session invalidation, stale edits, self-access protection, city reassignment and account activity without password hashes. Signing out makes reuse of the prior cookie fail. The unit suite separately checks password hashing, role allowlists and bounded login-attempt windows.

Before this checkpoint, cookie settings were moved under Payara's session configuration and the minimal resident area endpoint was separated from the city resource so it did not shadow existing root-level routes. The passing HTTP suite checks those resolved paths and cookies.

### Browser scope

A resident signed in and selected their own case in the account demonstration city. Only their complaint appeared, with public route/status summaries and no work/escalation controls. Local staff saw only their assigned city, no account-management link, and no city creation, hierarchy creation or hierarchy power controls. The system admin opened Manage users, saw all six accounts and loaded the account activity list. [Account screen evidence](evidence/account-management.png) shows the staff accounts and activity panel without passwords.

Browser verification exposed empty restricted-action panels; permission rendering now hides their containers. Hierarchy-wide power restrictions are scoped to the hierarchy page, preserving the separately authorized individual streetlight control. Read-only policy users receive the saved expression and its meaning outside the hidden editor. The home complaint link now carries its selected city and the complaint page validates that choice against accessible cities. The latter link and policy display changes were code/syntax checked; their complete browser journeys are not claimed here.

The final packaging after adding asset version query strings reused the already passing Java tests. Versioned assets avoid reusing older scripts after the updated HTML loads. An existing tab may need refresh after redeployment. No mobile/responsive sweep or public production security audit was performed.

### Restart reproduction

1. With both servers running and the account demonstration present, run `node scripts/verify-account-persistence.mjs snapshot`.
2. Stop Payara, then PostgreSQL. Start PostgreSQL, then Payara.
3. Wait until `/smartcity360/api/health` reports UP, then run `node scripts/verify-account-persistence.mjs verify`.

The initial comparison attempt ran while Payara's port was open but the WAR was still loading and received 404. After application readiness, comparison passed unchanged. The verifier signs in afresh as all five roles and also checks other-resident denial and cross-city denial. It does not claim session continuity across restart. Private snapshots and generated credentials remain ignored under `.local`.

### Remaining product work

Named employee assignment, resident replies/reopening requests, notifications, fuller operations history, charts and printable operational reports remain to be built. The home screen has actual accessible complaint counts only. Email verification, password recovery and email delivery are not implemented. The class pattern report drafts remain earlier source material for later reconciliation, not a finished submission document.


## Themes and complaint integration checkpoint - 9 November 2026

The preserved interface redesign now includes separate complete light/dark palettes, a remembered theme switch, a responsive sidebar, Dashboard and Profile for all five roles, role-specific work links, local city imagery, scoped complaint counts, a numeric-backed status ring and recent cases. All editable color values live in `assets/css/themes.css`; layout styles reference these tokens.

The existing backend commits `a30a77d` and `4824233` were preserved. A successful remote fetch confirmed both were already on GitHub before this work. Additive database scripts 008 and 009 were applied before deploying the current Java mappings. Existing data was preserved.

| Check | Actual result |
|---|---|
| Java build | 62 JUnit tests passed, zero failures/errors; WAR packaged and deployed |
| Live assignment/follow-up suite | 48 checks passed against PostgreSQL, including concurrent review returning one 200 and one 409 |
| Existing complaint regression | 46 checks passed after integration |
| Existing account sign-in | Admin, both residents, local staff, supervisor and city manager verified; no passwords changed |
| Browser login | Local staff, supervisor, resident, city manager and admin reached their role dashboard |
| Browser complaint journey | Supervisor cleared/reassigned an employee, sent a public reply, started/resolved work; resident requested reopening; city manager approved and resumed work |
| Resident privacy in browser | Public reply visible; private work notes and employee assignment controls absent |
| Desktop layouts | 1280px theme/navigation/form checks; screenshots inspected for both sign-in and dashboard themes |
| Mobile layouts | 390 x 844 CSS viewport: navigation drawer, profile, complaints, admin, city, meters, lights and policies checked; no horizontal overflow in checked pages |
| Theme persistence | Choice survived page navigation and reload; mobile and desktop switch controls worked |
| Form states | Staff city selection disabled for non-staff role; busy/error recovery checked; failed sign-in now has a friendly error |
| Color contrast | 14 configured text/background pairs passed 4.5:1; lowest measured pair 5.45:1 |

Dark operational/admin pages had no visible white panel/input surfaces in the computed-style audit. Light pages used the light palette. Both theme palettes cover lists, form fields, feedback states and chart surfaces. Native browser validation/dialog styling follows `color-scheme`; no custom modal dialog workflow was added or claimed.

The browser verification used retained case 20 in account demonstration city 20. The API verification retained its labelled integration case and the existing regression script retained its own labelled cities. Browser actions added public/private demonstration history and left case 20 in progress after the manager approved reopening. The data is test material, not a real municipal complaint.

Initially the local runtime was unavailable. PostgreSQL and Payara were started; all saved staff credentials then authenticated successfully. This proves the current logins work, not the exact cause of a previous user sign-in failure. Browser tabs share the same login session on one origin; sign out before checking a different role.

Screenshots: [light sign-in](evidence/signin-light.png), [dark sign-in](evidence/signin-dark.png), [light dashboard](evidence/dashboard-light.png), [dark dashboard](evidence/dashboard-dark.png). Mobile screenshot output was unusually downscaled by the browser tool, so mobile conclusions rely on rendered DOM dimensions, visibility, field colors and actual interaction checks rather than a high-resolution screenshot claim. No real-device or cross-browser certification was performed.

After the full passing Java run, subsequent packaging skipped repeating unchanged Java tests for frontend-only theme and error-message refinements. This checkpoint did not rerun the other four pattern HTTP suites or perform another database restart comparison. Prior evidence remains dated above. Reporting/notifications and final acceptance work remain pending; submission PDF/ZIP/video preparation remains on hold.

## Profiles, appearance and action feedback - 9 November 2026

The current application adds optional username, phone and resized profile photographs, an eight-character minimum password, resident-only complaint submission, archived demonstration cities, separate neutral light/dark palettes, configurable system fonts, a desktop icon rail and a browser favicon. See PROFILE_AND_APPEARANCE.md and ACTION_FEEDBACK.md for behavior and configuration.

Verification on the combined checkout:
- Maven package: 67 Java tests passed, no failures or errors; WAR deployed successfully.
- Feedback lifecycle: six deterministic Node tests passed, covering microtask timing, delayed loading, result messages, dismissal, persistence, expiry and validation warnings. These use a minimal DOM, not a browser renderer.
- Report calculations: six Node tests passed.
- Live profile/demo checks: 40 passed across five role logins, visible city counts, non-resident submission denial, field rejection, username conflicts and JPEG persistence.
- Live report checks: 62 passed using retained accounts, including ownership and city/tier restrictions. No new cities were seeded for these checks.
- JavaScript syntax and whitespace checks passed.

Earlier browser checks in this milestone observed both neutral themes, desktop icon collapse, mobile drawer navigation, profile save, font switching and the eight-character password field minimum. The 390-pixel mobile viewport had no page-wide horizontal overflow in the checked complaint/profile pages. Mobile screenshots were downscaled, so sizing conclusions use rendered DOM measurements.

The final notification integration has not completed a real-browser visual pass: browser automation timed out during this continuation. Native print preview, pagination and Save as PDF also remain unverified as documented in REPORTS.md. No new screenshot, physical print, restart-persistence test or all-pattern HTTP regression is claimed here. Older HTTP fixtures that submit complaints as an admin need a resident submitting client under the new permission rule; historical results above predate that change.
