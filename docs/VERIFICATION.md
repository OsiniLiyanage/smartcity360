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
