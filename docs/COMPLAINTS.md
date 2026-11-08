# Complaint workflow - Part C

The complaints page is `http://localhost:9080/smartcity360/complaints.html`, also linked from **City zones**. All data belongs to the selected city; the affected area may be the whole city or one of its districts, streets or buildings.

## Run and demonstrate

1. Run the database helper with `-Action Setup` to apply `003_complaints.sql` to an existing installation.
2. Build/deploy normally. After changing UI classes, run `npm run build:css` before `mvn package`.
3. Open Complaints, choose a city and submit a demo complaint with a name, subject, description and severity.
4. LOW routes to local staff, MEDIUM to a supervisor, HIGH to a city manager. Inspect **Handling history** to see forwarding.
5. Enter a work note and select **Start work**. Add resolution details and select **Mark resolved**. A resolved complaint can be reopened with another note.
6. For an unresolved LOW/MEDIUM complaint, choose a higher severity and record a reason. Escalation preserves history, routes again and resets work status to ASSIGNED for the new team.

Routing is a Java Chain of Responsibility, not browser-side assignment. The browser only supplies severity; the handlers decide the authority. Power/device simulation and complaints remain in one Java WAR with the same city/zone database.

## API

All routes below are relative to `/api/cities/{cityId}/complaints`.

| Method and route | Request / result |
|---|---|
| GET `/` | City queue, newest update first; summary records |
| GET `/{id}` | Detail, affected-area name and ordered history |
| POST `/` | `{residentName, subject, description, severity, zoneId}`; optional/null zone means whole city; returns 201 detail |
| PUT `/{id}/status` | `{status, note, version}`; returns updated detail |
| PUT `/{id}/escalate` | `{severity, note, version}`; higher severity only; returns updated detail |

Resident name is 1–100 characters; subject 1–160; description 1–2000; work/escalation note 1–1000. Text is trimmed, JSON value types are checked, and null/array/scalar request bodies are rejected with 400. Cross-city or missing targets return 404. Invalid work transitions and stale versions return 409.

Allowed work transitions: ASSIGNED → IN_PROGRESS → RESOLVED; RESOLVED → IN_PROGRESS reopens work. Severity escalation is separate from those transitions. Do not retry a timed-out submission blindly: refresh the queue first to check whether it was saved.

## Persistence and consistency

`complaint` stores current status, severity, authority, city/area and a JPA version. `complaint_event` stores an append-only history from the application's perspective; the application role has only SELECT/INSERT privileges on this table. Database administrator actions are outside this restriction.

Status/escalation updates acquire a row lock, refresh current data and compare the browser's version. The status and all events commit in one transaction. Each event is flushed before creating the next so its generated ID preserves routing order even if the JPA provider would otherwise reorder pending inserts. Flushing does not commit the transaction.

`@Cacheable(false)` keeps complaint records/history out of the JPA shared cache. Timestamps use UTC instants truncated to milliseconds for consistent database round-trips; the browser displays them in its local timezone. Events are ordered by generated ID, not by potentially equal timestamps.

## Checks and limits

- `mvn test` runs six chain tests plus five Composite tests.
- `node scripts/verify-complaints.mjs` runs the live complaint regression checks. It creates two labelled demo cities and four complaints per successful run and retains them for inspection.
- `.local/complaint-verification.json` stores a private snapshot for restart verification.
- Queue filtering/search runs in the browser over all records in the city; pagination is not implemented.
- No real authority receives a notification. Demo identities are labels, not authenticated users. Authentication and role permissions remain a later milestone.
- Runtime chain editing, named staff allocation and manual assignment of an unhandled complaint are not implemented. The default chain covers every supported severity; a shortened chain's explicit unhandled result is covered by unit tests.

The separate [Part C report draft](report/PART_C_CHAIN_OF_RESPONSIBILITY.md) contains the assessment answers and supporting UML source.
