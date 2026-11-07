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

## 7 November 2026 — Composite hierarchy and Tailwind workspace

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

## 7 November 2026 — Complaint workflow and Chain of Responsibility

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
