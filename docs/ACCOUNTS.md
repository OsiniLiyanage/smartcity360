# Accounts and access

SmartCity360 uses the same sign-in page for residents and city teams: `http://localhost:9080/smartcity360/login.html`. Java checks permissions on every protected API request. Hiding a button is only a usability measure.

## First local setup

1. Run `scripts/database.ps1 -Action Setup` to apply all numbered scripts, including `007_accounts.sql`.
2. Run `scripts/bootstrap-admin.ps1` once. It uses the private local database administrator connection and creates a system administrator only when no system administrator exists. There is no public admin registration endpoint or committed default password.
3. Open the ignored `.local/bootstrap-admin.json` privately to obtain the initial email/password. Do not commit or share that file. Sign in and change the temporary password through **My account**.
4. The system administrator can open **Manage users** to provision accounts, choose a staff city, change roles or disable accounts. A generated temporary password is shown once. Share it privately with its intended user; no email is sent.

The local verification helper can perform the bootstrap password change automatically and save the replacement in the same private file. On this development installation it has already done so. Always use the current file contents, not an earlier password.

Residents can select **Create resident account**. Public registration cannot choose a staff/admin role or city assignment. A registered email is an account identifier; ownership of that email is not verified by email delivery.

## Enforced permissions

| Action | Resident | Local staff | Supervisor | City manager | System admin |
|---|---|---|---|---|---|
| Profile and password | Own | Own | Own | Own | Own |
| Submit a complaint | Yes | No | No | No | No |
| Complaint visibility | Own records | Local tier | Local and supervisor tiers | All city tiers | All cities |
| Work notes, resolution and escalation | No | Accessible tier | Accessible tiers | All city tiers | All cities |
| View operational hierarchy, meters, lights and policies | No | Assigned city | Assigned city | Assigned city | All cities |
| Record usage/readings, recover meter payloads, update individual lights, evaluate rules | No | Assigned city | Assigned city | Assigned city | All cities |
| Add areas/meters/lights; replace meter credentials | No | No | Assigned city | Assigned city | All cities |
| Command hierarchy power; create/edit/validate policy rules | No | No | No | Assigned city | All cities |
| Create cities, shared lamp specifications and run sharing demonstration | No | No | No | No | Yes |
| Manage users and inspect account activity | No | No | No | No | Yes |

Staff have exactly one assigned city. Residents can choose a city and area for reporting, but their area response contains names/types only, without operational usage or power information. System admins and residents have no staff city assignment. An admin cannot change their own role or active status in Manage users.

## Complaint identity and privacy

The reporter's display name and user ID come from the signed-in resident session. A request cannot impersonate someone by sending `residentName`. New submissions are resident-only. Historical unclaimed operational records remain accessible under the existing staff rules; matching names never grants resident ownership.

Residents see only their own cases and public progress summaries. Staff work notes remain internal. Events record the actual actor ID, with a name snapshot for staff history. Residents see **You** or **City team** instead of staff identities. Routing is still the class-taught Chain of Responsibility; it assigns an authority tier. Authorized managers can separately allocate an eligible employee while preserving team coverage.

## Sessions and passwords

- Passwords use PBKDF2-HMAC-SHA256 with a fresh random salt and 600,000 iterations. Password length is 8 to 128 characters; spaces are preserved.
- Server sessions use HttpOnly, SameSite=Strict cookies, a 30-minute idle timeout and an eight-hour absolute lifetime. Payara sets Secure dynamically on HTTPS; this local demonstration uses loopback HTTP.
- Sign-in rotates the session. Writes require a session-specific CSRF token, including registration and sign-in. Responses are marked no-store.
- Sign-out invalidates the current session. Password changes and account access/status changes invalidate previous sessions for the affected account on their next request.
- A provisioned account must change its temporary password before accessing application data.
- Login attempts are limited to 20 per minute per remote address, registration to 10, and password changes to 10 per account. Limits are in memory and reset on restart; they are not a distributed production rate limiter.
- Unknown API operations are denied until explicitly included in the access rules.

Account activity records registration, provisioning, profile/password changes and access updates. It does not claim to be a complete operational audit trail. Password hashes, raw passwords and session tokens are not returned in user lists or activity records.

## Verification and limits

`mvn test` includes five security tests alongside the five pattern suites. `node scripts/verify-accounts.mjs` exercises all five roles, ownership, cross-city denial, privilege injection, private notes, session rotation, CSRF, disabled users, password/session invalidation and stale account edits. It retains labelled demonstration data and writes generated credentials only under ignored `.local`.

For restart verification, run `node scripts/verify-account-persistence.mjs snapshot`, restart both servers in the documented order, wait for application health, then run the same script with `verify`. It compares accounts, activity, staff scope and resident history and rechecks denied access.

All live feature scripts now sign in through `scripts/auth-client.mjs`. For the local server they use `.local/bootstrap-admin.json`; alternatively supply `SMARTCITY_EMAIL` and `SMARTCITY_PASSWORD` privately through the environment. Non-local targets require explicit credentials. Do not place credentials in committed commands or documentation.

Password recovery and email verification/delivery are not implemented. There is no pretend reset-email confirmation. Named employee assignment, public resident/staff messages and reopening review now have integrated screens. Dashboards display authorized complaint counts, recent cases and a status chart. Notifications, historical trend charts and printable operational reports remain later product milestones.

## Implementation references

- [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Jakarta Servlet 6.1 sessions](https://jakarta.ee/specifications/servlet/6.1/jakarta-servlet-spec-6.1.html)
- [Payara deployment descriptor elements](https://docs.azul.com/payara-community/technical-documentation/payara-server-documentation/application-deployment/elements-of-deployment-descriptors.html)

Authentication is supporting application infrastructure. It is not presented as one of the assessed design patterns or as an authentication lesson from the supplied class notes.

## User-management records workspace

Manage users opens a full-width account table with name, email, role, assigned city, active status and a labelled Edit action. Add user and Edit access open native modal dialogs. Account activity opens its own read-only dialog instead of competing with the main table. The current administrator has no self-edit action; the Java service also rejects self-access changes.

Search matches name/email, ignoring case and surrounding whitespace. Expand Filters to intersect role, active/disabled status and assigned city. Apply/Clear reset pagination. The API filters before counting and paging (25 records per page), so searches include users beyond the currently displayed page. Percent and underscore are literal characters. The applied-filter summary and counts describe the rendered results; a failed request preserves the preceding results. Existing unfiltered API requests remain supported.

`GET api/admin/accounts` accepts `page`, `q` (up to 254 characters), `role`, `status` (`active` or `disabled`) and `city` (positive ID). Both row and count queries use the same parameterized predicates and remain system-admin-only. City selectors list visible cities; editing existing staff with an archived assignment preserves that assignment as a labelled option.

Dialogs support Escape and Cancel and restore focus when closed. Closing is blocked during a pending save to avoid losing a result. The generated temporary password stays inside the creation dialog until it closes, then its text is cleared. API failures keep the entered form values. Notification alerts move into the active dialog so they remain accessible above the modal. The responsive table scrolls within its own container; forms scroll internally on short screens. Palette/font configuration stays in themes.css; records.css owns the layout and users.js owns this page.

Run `node scripts/verify-user-filters.mjs` against the running local application to check full-result filtering, pagination, wildcard literals, invalid inputs and role restrictions using retained local verification accounts. It does not create users or modify access. Existing provisioning, CSRF, version checks, temporary-password generation and session invalidation are unchanged by the layout revision.
