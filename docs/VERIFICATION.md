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

The root city record is not yet the complete Composite implementation. District/street/building relationships and recursive usage/power behavior will have their own tests when added.
