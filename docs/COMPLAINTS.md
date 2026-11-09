# Complaint workflow - Part C

The complaints page is `http://localhost:9080/smartcity360/complaints.html`, also linked from **City zones**. All data belongs to the selected city; the affected area may be the whole city or one of its districts, streets or buildings.

## Run and demonstrate

1. Run the database helper with `-Action Setup` to apply the numbered scripts through `009_complaint_follow_up.sql` to an existing installation.
2. Build/deploy normally. After changing UI classes, run `npm run build:css` before `mvn package`.
3. Sign in as a resident, open Complaints, choose a city and submit a demo complaint with a subject, description and severity. The reporter identity comes from the account. Staff and administrators review records and cannot submit a new resident complaint.
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
| POST `/{id}/messages` | `{message, version}`; resident follow-up or staff public reply; returns updated detail |
| POST `/{id}/reopen-request` | `{note, version}`; the owning resident requests reopening of a resolved case; returns updated detail |
| PUT `/{id}/reopen-request` | `{approve, note, version}`; supervisor or higher reviews a pending request; approve is a JSON boolean; returns updated detail |

### Resident follow-up and reopening

Messages are visible to the resident who owns the complaint and to staff with existing city/tier access. Staff use the message endpoint for public replies, including explanations of a resolution. Existing work-status notes remain private. Every message records the authenticated actor, while resident history labels staff as City team. Ownerless demonstration complaints reject messages because there is no resident recipient. Messages may be added to open or resolved cases and do not change their work status.

A resident can request reopening only for their own resolved complaint, with one pending request at a time. The request sets `reopenRequested` to true while status stays RESOLVED. Supervisors, city managers and administrators can review requests within their existing city/tier access. Approval changes status to IN_PROGRESS; decline keeps RESOLVED. Both clear the pending flag and store a resident-visible explanation. After a decline, the resident may submit another request with further evidence. All prior requests and decisions remain in history.

Existing authorized staff can still reopen through the status endpoint. If a resident request is pending, this records acceptance and clears the flag. Its work note remains private. That preserves existing staff workflows alongside the new review route.

Messages and reasons require 1-1000 characters after trimming. Every write requires the latest complaint `version`. The service locks and refreshes the complaint before checking access, version and workflow state. Each accepted message changes the complaint activity timestamp, making JPA advance the version even for consecutive messages. A stale retry returns 409. Refresh the detail/history after a lost response before choosing whether to resubmit. Concurrent review requests use the same lock and version checks, so only one decision commits. The live integration check confirmed one 200 and one 409 for concurrent decisions using the same version.

All summaries include `reopenRequested`. Detail adds `canMessage`, `canRequestReopen` and `canReviewReopen` for frontend controls. These flags reflect the authorized detail response; Java independently checks permissions on writes. The frontend must visibly identify public messages and review explanations, render their text safely, refresh the saved version after each action, and keep the existing private work-note control separate.

Migration 009 defaults the pending flag to false for older complaints and widens history actor names to the account display-name limit of 100 characters. Apply migrations 008 and 009 before deploying this backend. Frontend controls are integrated: employee selection, public messages, resident reopening and manager review. See the integration checkpoint in VERIFICATION.md.

### Named employee allocation

The assignment endpoints are for supervisors, city managers and system administrators within their existing city/tier access. Local staff and residents cannot allocate work or list candidates. A candidate must be enabled, belong to the complaint's city and have the exact role selected by the Chain of Responsibility. A supervisor can allocate local-staff or supervisor cases. City managers and administrators can allocate every tier they may access. System administrators are not staff candidates.

`assignedTo` retains its existing authority-tier meaning. Staff summaries additionally expose nullable `assignedUserId`. Staff detail includes nullable `assignee` with `id`, `displayName` and `eligible`, plus `canAssign`. These fields are omitted from resident responses. Candidate responses exclude email addresses and credentials. Resident history uses a generic allocation summary and excludes employee names, IDs and assignment reasons.

Assignment reasons must contain 1-1000 characters. A missing `assignedUserId` is rejected; explicit null clears the allocation. Resolved cases and cases without a responsible authority cannot be allocated. Requests require the current complaint version. A repeated request using the saved new version and same employee is a no-op. Retrying with the old version returns 409 after an actual change. Allocation preserves the current work status and existing tier-based operational permissions, including authorized team coverage. A named allocation does not give anyone access to a different city or authority tier.

Escalation clears the employee allocation and records that release in history. Disabling an allocated account or changing its city/role retains the historical allocation but makes `assignee.eligible` false. A manager can then reassign or clear it. Existing account access rules prevent that employee from using revoked permissions.

The migration adds a nullable foreign key and index, preserving older complaints as unallocated. Assignment holds a read lock on the candidate account and a write lock on the complaint while validating eligibility/version and recording its history in one transaction. The account lock is acquired first to keep simultaneous account changes ordered consistently.

The complaint detail screen includes these controls for authorized roles. Apply the migration before deploying Java code that maps the new column.

Resident name is 1–100 characters; subject 1–160; description 1–2000; work/escalation note 1–1000. Text is trimmed, JSON value types are checked, and null/array/scalar request bodies are rejected with 400. Cross-city or missing targets return 404. Invalid work transitions and stale versions return 409.

Allowed work transitions: ASSIGNED → IN_PROGRESS → RESOLVED; RESOLVED → IN_PROGRESS reopens work. Severity escalation is separate from those transitions. Do not retry a timed-out submission blindly: refresh the queue first to check whether it was saved.

## Persistence and consistency

`complaint` stores current status, severity, authority, city/area and a JPA version. `complaint_event` stores an append-only history from the application's perspective; the application role has only SELECT/INSERT privileges on this table. Database administrator actions are outside this restriction.

Status/escalation updates acquire a row lock, refresh current data and compare the browser's version. The status and all events commit in one transaction. Each event is flushed before creating the next so its generated ID preserves routing order even if the JPA provider would otherwise reorder pending inserts. Flushing does not commit the transaction.

`@Cacheable(false)` keeps complaint records/history out of the JPA shared cache. Timestamps use UTC instants truncated to milliseconds for consistent database round-trips; the browser displays them in its local timezone. Events are ordered by generated ID, not by potentially equal timestamps.

## Checks and limits

- `mvn test` runs six chain tests and seven focused allocation tests alongside the other pattern and security suites. The allocation tests cover role allowlists, candidate eligibility, account changes, existing unallocated cases and escalation cleanup. They do not replace live HTTP, transaction or migration verification.
- `ComplaintFollowUpTest` exercises actual service/resource methods with mocked persistence. It covers ownership, city/tier restrictions, public/private history, request/review transitions, stale writes, validation, legacy staff reopening and assignment service regressions. Its mocks do not emulate JPA version increments or prove transaction locking.
- The 8 November 2026 backend checkpoint passed 62 Java tests, including 17 service/resource follow-up checks. Test-only Mockito, Jersey and Parsson dependencies support these checks outside Payara. Mockito uses interface proxies and reflection to avoid dynamic agent attachment. Migrations 008/009, live HTTP and frontend integration were not exercised in this checkpoint.
- `node scripts/verify-complaints.mjs` runs the live complaint regression checks. It creates two labelled demo cities and four complaints per successful run and retains them for inspection.
- `.local/complaint-verification.json` stores a private snapshot for restart verification.
- Queue filtering/search runs in the browser over records the current user may access; pagination is not implemented.
- No real authority receives a notification. New submissions and work updates record authenticated identities; old ownerless demonstrations stay unclaimed. Resident messages, public staff replies and reopening requests have backend endpoints. Frontend integration is complete; notifications remain pending.
- Named staff allocation has backend endpoints; its frontend integration and live HTTP verification are recorded in the 9 November checkpoint. Runtime chain editing and manual assignment of an unhandled complaint are not implemented. The default chain covers every supported severity; a shortened chain's explicit unhandled result is covered by unit tests.

The separate [Part C report draft](report/PART_C_CHAIN_OF_RESPONSIBILITY.md) contains the assessment answers and supporting UML source.

## Using the integrated complaint screen

Open a complaint from Dashboard or Complaint queue. Supervisors and higher roles can load eligible employees, select a name (or clear allocation), enter a private assignment reason and save. The list loads 25 candidates at a time. Existing tier-based team coverage still applies.

Use **Message / public reply** for text the resident may read. Use **Private work note / resolution details** for staff-only information. The owning resident can message the team and, after resolution, request reopening. Authorized managers review the request using a decision and public explanation. Pending requests remain resolved until approved. The screen refreshes the saved version after each accepted action; a stale conflict asks for refreshed details rather than silently retrying.

`node scripts/verify-complaint-follow-up.mjs` reuses private demo accounts, creates a labelled case, and checks allocation, messages, private history, repeated/stale requests, review validation, concurrency, escalation release and city/tier boundaries. No passwords are printed or committed.
