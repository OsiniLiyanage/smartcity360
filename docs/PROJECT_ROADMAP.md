# SmartCity360 product completion roadmap

Updated 8 November 2026 following the user's project-first direction.

Additional user direction: add dashboard charts/graphs and in-application printable reports. Additional patterns taught in class may be used where they solve a real implementation problem. The five assessed patterns remain clearly identifiable.

## Delivery boundary

Finish the application first. Do not start assembling the consolidated PDF, preparing the submission ZIP or preparing/recording the video until Osini explicitly says to proceed. Existing pattern report drafts remain reference material. This file is a development plan, not submission-document preparation.

Operational reports inside SmartCity360 are authorized application features. Printing such a report, including the browser's Save as PDF option, is separate from assembling the assignment's consolidated report. The submission-artifact hold still applies.

The five pattern implementations and the account/access foundation are working. Resident signup, sign-in, profile/password changes, admin provisioning, five roles, city restrictions and complaint ownership are implemented. Work events now use authenticated actors and resident history excludes internal notes. The home screen has real complaint counts. The chain assigns an authority tier, and authorized managers can now allocate a named employee. Resident messages, public staff replies and reopening review are integrated. Dashboards include scoped counts, a resolution chart and recent cases. Complete operational reports, richer trend charts and the remaining workflows below are not yet complete. See [accounts](ACCOUNTS.md) and [verification](VERIFICATION.md).

## Recommended roles

The account roles and basic access boundaries are enforced. Responsibilities such as named assignment, replies and reopening requests describe remaining workflow work; the exact implemented permissions are listed in the account guide.

| Role | Responsibility | Access boundary |
|---|---|---|
| Resident | Register, manage their profile, submit complaints, track their own cases, reply and request reopening, receive updates | Their own private records; public city/service information only |
| Local Staff | Work on local-level assigned complaints, record work notes, report/repair streetlight faults and enter operational observations | Assigned city and assigned/authorized operational work |
| Supervisor | Triage complaints, assign staff, review local work, handle supervisor-level cases and escalate issues | Assigned city; local-team oversight |
| City Manager | Handle high-severity cases, oversee city operations, manage operational policies and authorize broad power commands | Assigned city; no global account administration |
| System Admin | Provision staff, assign roles/city access, manage account status, configure cities and system administration | Cross-city administrative access; exceptional operational actions must be recorded |

City Manager and System Admin are separate responsibilities. Technical account administration must not silently impersonate a resident or member of staff. The application should record the authenticated identity behind every action.

Public registration always creates a Resident account. The server must ignore/reject attempts to self-select staff/admin privileges. Staff use the same sign-in mechanism but receive different permitted navigation and actions. Initial admin setup must be a deliberate local bootstrap, not a public first-user-becomes-admin route or committed default password.

An account role alone is insufficient: permissions must also check its city assignment, record ownership, current workflow state and assigned responsibility. A resident must not gain access to another complaint by changing an ID. A staff member must not gain access to another city by changing a URL. User-visible buttons reflect permissions, while Java independently enforces them on every request.

## Build sequence and completion checks

### 1. Accounts and permission enforcement - foundation implemented

- Persist accounts, roles, account status and staff city assignments; add resident registration, sign-in, sign-out, profile and password change.
- Use password hashing, server-controlled login sessions, session expiry, request protection for state-changing operations and bounded login attempts. Use Jakarta/Payara facilities and standard libraries where appropriate; no Spring Boot or paid identity service is needed.
- Provide local initial-admin setup and admin user-management screens. Staff creation/activation must not depend on a fake email-delivery screen.
- Protect all existing API operations, not only new pages. Explicitly identify the small set of public endpoints.
- Replace free-typed identity with authenticated identity. Add complaint ownership and real actor IDs to history.
- Treat pre-existing demonstration complaints without an account owner as unclaimed demonstration records; do not assign them to a resident by matching a display name.
- Adapt existing live verification scripts to authenticated test users and add tests for denied access, ownership, role escalation attempts, cross-city access, logout and disabled accounts.
- Completion: two residents cannot read each other's private cases; staff permissions and city boundaries are enforced even through direct API requests; signing out or disabling an account prevents further authorized actions.

### 2. Resident and complaint workflows - core journey integrated

- Resident home with their open/resolved cases and notifications; complaint submission linked to an area and reporting category.
- Preserve the Chain of Responsibility for routing to authority tiers, then allow authorized assignment to an individual staff member.
- Staff work queues, filters/search, triage, work notes, resident-visible replies and resolution explanations.
- Distinguish staff-only notes from resident-visible updates before exposing history to residents.
- Resident follow-up and reopening request; authorized review of that request. Record who changed severity or status and why.
- Completion: a resident submits a case, the proper tier receives it, a real employee works on it, escalation reaches the next tier when needed, the resident sees the outcome and can follow up.

### 3. Complete municipal operations

- Zones: edit names/details, search the hierarchy, show affected scope before a power command and retain command history with actor/reason. Archive safely where appropriate instead of deleting referenced history.
- Meters: useful reading history, reporting periods and trends, clear meter status and controlled credential operations. Residents may view building-specific consumption only after an authorized account-to-building relationship exists.
- Streetlights: search/filter by area and fault, maintenance history, work assignment and repair completion. Fault repair must retain prior evidence instead of simply losing the old note.
- Policies: management restricted to appropriate city roles, evaluation access for operational staff, active/inactive controls and a complete edit history. Keep the existing original-rule snapshots for evaluations.
- Completion: each module supports a meaningful lifecycle and feeds real information into the other screens. Device operations remain explicitly simulated until there is actual hardware integration.

### 4. Connect the product and improve usability

- Role-appropriate home pages and a manager dashboard using saved data: complaints by status/severity, outstanding faults, consumption summaries and policy outcomes.
- In-app notifications generated by real workflow changes; read/unread handling and ownership restrictions.
- Consistent navigation, responsive layouts, useful empty/error/loading states, clear permission messages and searchable/paginated lists where needed.
- An administrator activity view for important account and operational actions.
- Use labelled, coherent demo data for a connected city journey rather than relying only on separate test datasets. Preserve existing user records.

### Dashboard charts and operational reports

Build these on the protected APIs and completed workflows, so charts and exports cannot bypass account permissions.

| Workspace | Useful charts and summaries | Printable reports |
|---|---|---|
| Resident | Own complaints by status and submission date; own linked-building energy history only after authorized linking exists | Own complaint details and progress history |
| Local Staff | Assigned workload, overdue/open work when due dates exist, completed work and assigned maintenance tasks | Assigned work list and permitted case/maintenance details |
| Supervisor | Team workload, complaint severity/status, submitted versus resolved counts over time, outstanding faults | Team workload, complaint progress and maintenance reports within authorized city scope |
| City Manager | City complaint trends, resolution durations where recorded, district energy summaries, lighting faults and policy outcomes | City operations summary, energy, maintenance and policy-evaluation reports |
| System Admin | Account status/role totals and administrative activity; explicitly authorized cross-city summaries | User administration and permitted audit/activity reports |

- Use line charts for trends, bar charts for comparisons and status charts where proportions are useful. Each chart needs a title, units, a clear time range, readable legends and a corresponding numeric/table view.
- Provide city/area/date/status filters as applicable, reset controls and explicit no-data states. Apply the same filter definitions to chart totals, detail tables and printed output.
- Define metrics before plotting them. Current building usage is a saved reading for a reporting period; successive snapshots must not be summed as though each were additional consumption. Energy trends require defined periods/readings. Historical complaint status and resolution timing must come from recorded events, not today's status projected backwards.
- A report preview should show its title, authorized scope, selected filters, generated time, summary, readable charts and relevant details. Print layout must omit navigation/forms and handle page breaks and table headings sensibly.
- Provide Print / Save as PDF using the browser print flow as the first working output. Do not claim a separate downloadable PDF generator exists unless implemented. Keep charts and assets local so the existing local demonstration does not depend on paid services or a CDN.
- Prevent secret fields, meter credentials, password hashes, internal staff notes and unauthorized personal records from entering reports. A resident-visible case report must include only resident-visible history.
- Completion: filtered chart totals agree with underlying records, changing filters updates all related views consistently, print preview remains readable, and direct report requests cannot reveal another user's or city's restricted data.

### Additional class-taught patterns

These are intended applications, not claims that the extra patterns are already implemented. Their addition should follow the feature they support and be explained with actual class roles and behavior.

| Pattern | Natural application | Guardrail |
|---|---|---|
| Builder | Assemble an immutable operational-report request with optional date range, authorized area, status filters and selected sections | Validate the finished request; permissions are derived from the authenticated user, never granted by builder options |
| Visitor | Traverse the existing city hierarchy to collect reporting statistics/details for different node types | Use explicit `accept`/`visit` collaboration, preserve Composite operations, and avoid double-counting both group totals and their leaves |

Builder is covered in the supplied class PDF around pages 13–17 and Visitor around pages 40–43. They extend the product without replacing the five selected A–E patterns. Prototype for reusable templates or Mediator for cross-feature coordination can be considered later if those workflows genuinely benefit; neither is required merely to increase the pattern count.

Do not describe a normal constructor, generic service or utility method as a design pattern without the corresponding structure. The class notes themselves warn against unnecessary complexity and overly large classes (anti-pattern discussion, pages 45–46).

### 5. Finish and verify the application

- Verify full resident, local-staff, supervisor, city-manager and system-admin journeys.
- Recheck all five patterns after access control and workflow integration.
- Verify persistence, simultaneous edits, input validation, unauthorized access and recovery from ordinary failures.
- Check that every displayed count, alert and action has a real implementation. Do not show fake email delivery, invented hardware telemetry or nonfunctional dashboard buttons.
- Review backup/restore and clean setup for the application itself. Submission ZIP/PDF/video work remains on hold until explicitly released by the user.

## Scope discipline

The aim is a complete municipal operations product whose five design patterns remain easy to identify and explain. A separate technician role, maps/GPS, SMS/email providers, payments and new application frameworks are not currently needed to complete these workflows. Add them only for a concrete agreed use case, rather than increasing complexity without improving the resident/staff journey.

Password recovery, if presented, must have a real verified recovery mechanism. Until email delivery or an equivalent secure recovery route is configured, do not claim an email reset has been sent. This implementation decision belongs in the account milestone.

## Supporting references

- Jakarta Security 4.0: https://jakarta.ee/specifications/security/4.0/jakarta-security-spec-4.0.html
- OWASP Authorization Cheat Sheet (request-by-request authorization and default denial): https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

Role boundaries and workflow choices above are project design proposals, not requirements imposed by those references or claims that the class notes teach authentication implementation.
