# Complaint workflow - Part C

The complaints page is `http://localhost:9080/smartcity360/complaints.html`, also linked from **City zones**. All data belongs to the selected city; the affected area may be the whole city or one of its districts, streets or buildings.

## Run and demonstrate

1. Run the database helper with `-Action Setup` to apply the numbered scripts through `008_complaint_assignment.sql` to an existing installation.
2. Build/deploy normally. After changing UI classes, run `npm run build:css` before `mvn package`.
3. Sign in, open Complaints, choose a city and submit a demo complaint with a subject, description and severity. The reporter identity comes from the account.
4. LOW routes to local staff, MEDIUM to a supervisor, HIGH to a city manager. Inspect **Handling history** to see forwarding.
5. As authorized staff or admin, enter a private work note and select **Start work**. Add resolution details and select **Mark resolved**. A resolved complaint can be reopened with another note.
6. For an unresolved LOW/MEDIUM complaint, choose a higher severity and record a reason. Escalation preserves history, routes again and resets work status to ASSIGNED for the new team.

Routing is a Java Chain of Responsibility, not browser-side assignment. The browser only supplies severity; the handlers decide the authority. Power/device simulation and complaints remain in one Java WAR with the same city/zone database.

## API

Residents see only their own cases. Staff are restricted to their city and permitted authority tiers. Residents cannot change work status or severity; their history contains public summaries without staff-only notes. See [account permissions](ACCOUNTS.md).

All routes below are relative to `/api/cities/{cityId}/complaints`.

| Method and route | Request / result |
|---|---|
| GET `/` | City queue, newest update first; summary records |
| GET `/{id}` | Detail, affected-area name and ordered history |
| POST `/` | `{subject, description, severity, zoneId}`; optional/null zone means whole city; returns 201 detail |
| PUT `/{id}/status` | `{status, note, version}`; returns updated detail |
| PUT `/{id}/escalate` | `{severity, note, version}`; higher severity only; returns updated detail |
| GET `/{id}/assignees?page=0` | Up to 25 eligible employees, ordered by display name and ID; each has id, displayName and role |
| PUT `/{id}/assignment` | `{assignedUserId, note, version}`; positive employee ID or explicit null to clear allocation; returns updated detail |

### Named employee allocation

The assignment endpoints are for supervisors, city managers and system administrators within their existing city/tier access. Local staff and residents cannot allocate work or list candidates. A candidate must be enabled, belong to the complaint's city and have the exact role selected by the Chain of Responsibility. A supervisor can allocate local-staff or supervisor cases. City managers and administrators can allocate every tier they may access. System administrators are not staff candidates.

`assignedTo` retains its existing authority-tier meaning. Staff summaries additionally expose nullable `assignedUserId`. Staff detail includes nullable `assignee` with `id`, `displayName` and `eligible`, plus `canAssign`. These fields are omitted from resident responses. Candidate responses exclude email addresses and credentials. Resident history uses a generic allocation summary and excludes employee names, IDs and assignment reasons.

Assignment reasons must contain 1-1000 characters. A missing `assignedUserId` is rejected; explicit null clears the allocation. Resolved cases and cases without a responsible authority cannot be allocated. Requests require the current complaint version. A repeated request using the saved new version and same employee is a no-op. Retrying with the old version returns 409 after an actual change. Allocation preserves the current work status and existing tier-based operational permissions, including authorized team coverage. A named allocation does not give anyone access to a different city or authority tier.

Escalation clears the employee allocation and records that release in history. Disabling an allocated account or changing its city/role retains the historical allocation but makes `assignee.eligible` false. A manager can then reassign or clear it. Existing account access rules prevent that employee from using revoked permissions.

The migration adds a nullable foreign key and index, preserving older complaints as unallocated. Assignment holds a read lock on the candidate account and a write lock on the complaint while validating eligibility/version and recording its history in one transaction. The account lock is acquired first to keep simultaneous account changes ordered consistently.

Frontend controls for these endpoints are pending integration. Apply the migration before deploying Java code that maps the new column.

Resident name is 1–100 characters; subject 1–160; description 1–2000; work/escalation note 1–1000. Text is trimmed, JSON value types are checked, and null/array/scalar request bodies are rejected with 400. Cross-city or missing targets return 404. Invalid work transitions and stale versions return 409.

Allowed work transitions: ASSIGNED → IN_PROGRESS → RESOLVED; RESOLVED → IN_PROGRESS reopens work. Severity escalation is separate from those transitions. Do not retry a timed-out submission blindly: refresh the queue first to check whether it was saved.

## Persistence and consistency

`complaint` stores current status, severity, authority, city/area and a JPA version. `complaint_event` stores an append-only history from the application's perspective; the application role has only SELECT/INSERT privileges on this table. Database administrator actions are outside this restriction.

Status/escalation updates acquire a row lock, refresh current data and compare the browser's version. The status and all events commit in one transaction. Each event is flushed before creating the next so its generated ID preserves routing order even if the JPA provider would otherwise reorder pending inserts. Flushing does not commit the transaction.

`@Cacheable(false)` keeps complaint records/history out of the JPA shared cache. Timestamps use UTC instants truncated to milliseconds for consistent database round-trips; the browser displays them in its local timezone. Events are ordered by generated ID, not by potentially equal timestamps.

## Checks and limits

- `mvn test` runs six chain tests and seven focused allocation tests alongside the other pattern and security suites. The allocation tests cover role allowlists, candidate eligibility, account changes, existing unallocated cases and escalation cleanup. They do not replace live HTTP, transaction or migration verification.
- `node scripts/verify-complaints.mjs` runs the live complaint regression checks. It creates two labelled demo cities and four complaints per successful run and retains them for inspection.
- `.local/complaint-verification.json` stores a private snapshot for restart verification.
- Queue filtering/search runs in the browser over records the current user may access; pagination is not implemented.
- No real authority receives a notification. New submissions and work updates record authenticated identities; old ownerless demonstrations stay unclaimed. Resident replies, notifications and reopening requests remain pending.
- Named staff allocation has backend endpoints; its frontend integration and live HTTP verification remain pending. Runtime chain editing and manual assignment of an unhandled complaint are not implemented. The default chain covers every supported severity; a shortened chain's explicit unhandled result is covered by unit tests.

The separate [Part C report draft](report/PART_C_CHAIN_OF_RESPONSIBILITY.md) contains the assessment answers and supporting UML source.
