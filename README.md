# SmartCity360

Java web assignment project. Current stage: meter processing using **Decorator (Part A)**, a city hierarchy using **Composite (Part B)**, complaints using **Chain of Responsibility (Part C)**, streetlights using **Flyweight (Part D)** and city policies using **Interpreter (Part E)**, with Jakarta REST, PostgreSQL/JPA and Tailwind CSS.

Create city hierarchies, process meter readings with optional authentication/compression/encryption, and inspect usage totals. Route complaints by severity and record work through resolution. Register streetlights, control individual power/fault states and demonstrate specification sharing for 100,000 temporary lights. Save/edit noise and parking rules, evaluate zone observations and retain the original rule with each result. The latest recorded checkpoint passed 67 Java tests, six alert lifecycle tests, six report model tests, 40 live profile/demo checks and 62 live report checks. Earlier full-module and restart checks remain dated evidence; they have not all been repeated after the latest permission changes. See [verification evidence](docs/VERIFICATION.md) for scope and limits.

## Requirements

For the one-command IntelliJ workflow and deployment repair, see
[Run from IntelliJ](docs/INTELLIJ_RUN.md).

- JDK 21
- Maven
- Payara Community 7, compatible with Jakarta EE 11

PostgreSQL 18.6 and JPA are configured locally. See [database setup](docs/DATABASE.md). All five assessed pattern features are implemented. Resident registration, sign-in, five roles, account administration and complaint privacy are implemented. Named staff assignment, resident follow-up/reopening, role dashboards and configurable light/dark themes are integrated. Filtered complaint reports, profile photos/contact details and action alerts are implemented. The [assessment review](docs/ASSESSMENT_REVIEW.md) records requirement coverage and its verification limits. Native print verification and broader operational reports remain pending. Builder and Visitor are planned extensions, not implemented patterns. Review the final assignment document before submission; source packaging and the recorded demonstration are separate deliverables. The optional meter credential wrapper is distinct from application user authentication. This is a local demonstration, not a production deployment.

## Build

Set the project SDK and Maven runner JDK to Java 21 in IntelliJ, reload the Maven project, then run the Maven `package` lifecycle goal (or `mvn package`).

Output: `target/smartcity360.war`.

The compiled Tailwind CSS is committed, so a fresh checkout can build the WAR with Maven alone. After changing styles or utility classes, run `npm ci` once, then `npm run build:css` before Maven packaging. Node is a build tool only; Payara runs the application. See the [official Tailwind CLI workflow](https://tailwindcss.com/docs/installation/tailwind-cli).

## First deployment check

Follow [Local development in IntelliJ](docs/LOCAL_DEVELOPMENT.md) to configure and run Payara 7. Our separate `smartcity360` domain uses HTTP port 9080 and administration port 9048. Deploy the WAR with application context `/smartcity360`:

- Sign in: `http://localhost:9080/smartcity360/login.html`
- Personal workspace: `http://localhost:9080/smartcity360/home.html`
- City workspace: `http://localhost:9080/smartcity360/`
- Complaints: `http://localhost:9080/smartcity360/complaints.html`
- Energy meters: `http://localhost:9080/smartcity360/meters.html`
- Streetlights: `http://localhost:9080/smartcity360/streetlights.html`
- City policies: `http://localhost:9080/smartcity360/policies.html`
- REST check: `http://localhost:9080/smartcity360/api/health`
- Saved city records: `http://localhost:9080/smartcity360/api/cities`

Expected REST response: `{"application":"SmartCity360","status":"UP"}`.

Apply the account migration and bootstrap the first admin using the [account setup guide](docs/ACCOUNTS.md). All application data endpoints now require sign-in.

The health endpoint confirms Java responds; listing cities also checks the database path. Start PostgreSQL before Payara in later development sessions.

## Understand these files

- `pom.xml`: Java version, Jakarta EE dependency and WAR packaging. `provided` means the server supplies the Jakarta implementation.
- `RestApplication.java`: establishes `/api` as the REST base path.
- `HealthResource.java`: handles `GET /api/health` and returns JSON.
- `src/main/webapp/index.html` and `assets/js/cities.js`: Tailwind workspace and plain JavaScript REST client.
- `pattern/composite/`: common component, zone group and building leaf.
- `ZoneService.java`: constructs the Composite from stored rows and saves command results.
- `docs/report/PART_B_COMPOSITE.md`: report draft with explanation and UML source. Documentation is separate from the deployed app.
- `pattern/chain/`: complaint handlers and their accept-or-forward algorithm.
- `ComplaintService.java`: stores routing history and validates work transitions/escalation.
- `docs/report/PART_C_CHAIN_OF_RESPONSIBILITY.md`: separate C1–C3 report draft.
- `pattern/decorator/`: common meter stream, base component and three wrappers.
- `MeterService.java`: processes/recover-checks readings before updating building usage; `MeterKeyStore` keeps the private encryption key outside the repository.
- `pattern/flyweight/`: immutable lamp specifications, the shared pool and independent light contexts.
- `StreetlightService.java`: saves inventory and reconstructs paginated contexts using shared specifications.
- `FlyweightDemonstration.java`: isolated object-identity comparison without database writes.
- `pattern/interpreter/`: terminal comparisons, boolean expression nodes, observation context and bounded rule parser.
- `PolicyService.java`: validates saved revisions and stores evaluations with original rule snapshots.

## Try the hierarchy

1. Sign in as system admin, open City zones, expand **Create a city**, enter a name and save.
2. Add a district. Select it in **City structure**, then add a street.
3. Select the street and add a building. Select the building to save usage in kWh.
4. Select the city or district to see the sum of its buildings' readings.
5. Switch a district off and inspect the city: another powered district produces a **Mixed** state. Recorded usage stays unchanged.

Use the same reporting period for all manual readings. These are saved values, not live meter telemetry. Empty groups have no buildings to control.

## Verify

Most live scripts use an administrator fixture; report verification uses retained accounts across roles. The helpers read ignored local credentials or explicit private environment credentials. Older scripts that submit complaints as admin must be adapted to use a resident before rerunning them. Data-generating suites retain extra demo cities; avoid running them against the five-city demonstration just to view the app.

- `mvn test`: 67 tests: 33 core pattern tests, five account-security, seven assignment, 17 follow-up and five profile/permission tests.
- `node scripts/verify-feedback.cjs`: six notification lifecycle tests using a minimal DOM and clock.
- `node scripts/verify-report-model.cjs`: six report calculation tests.
- `node scripts/verify-reports.mjs`: 62 read-only checks with retained local accounts; no new demo cities.
- `node scripts/verify-accounts.mjs`: checks all five roles and privacy boundaries; retains labelled test users/cities and private local credentials.
- [Account setup and permissions](docs/ACCOUNTS.md): bootstrap, sign-in, password changes and role boundaries.
- `node scripts/verify-zones.mjs`: live API checks with Payara/PostgreSQL running; creates and retains two labelled demo cities per run.
- `node scripts/verify-complaints.mjs`: live complaint checks; creates two labelled demo cities and four complaints per successful run.
- `node scripts/verify-meters.mjs`: live meter checks; creates two labelled demo cities, a meter and nine accepted readings per successful run. Generated credentials stay in ignored `.local`.
- `node scripts/verify-streetlights.mjs`: live streetlight checks; creates two labelled demo cities, three saved lights and test specifications. The separate 100,000-light demonstration creates no database rows.
- `node scripts/verify-policies.mjs`: live policy checks; retains two labelled demo cities, three policies and eight evaluation results on a successful run.
- [Part B report draft](docs/report/PART_B_COMPOSITE.md): class roles, UML source, tradeoffs and viva explanation.
- [Complaint workflow guide](docs/COMPLAINTS.md): UI steps, API, data model and limitations.
- [Part C report draft](docs/report/PART_C_CHAIN_OF_RESPONSIBILITY.md): assessment answers and supporting UML source.
- [Meter workflow guide](docs/METERS.md): registration, layer choices, recovery, key backup and limitations.
- [Part A report draft](docs/report/PART_A_DECORATOR.md): A1–A3 answers, UML source and standard-library references.
- [Streetlight workflow guide](docs/STREETLIGHTS.md): registration, individual controls, API and sharing demonstration limits.
- [Part D report draft](docs/report/PART_D_FLYWEIGHT.md): D1–D3 answers, UML source and evidence for object sharing.

- [Policy workflow guide](docs/POLICIES.md): language grammar, saved revisions, observations, API and limitations.
- [Part E report draft](docs/report/PART_E_INTERPRETER.md): E1–E3 answers, required UML source and critical assessment.

The five report sections are source material for one final document; they are not separate submission reports or a finished PDF.

There is no Spring Boot dependency or standalone `main` method: Payara runs this web application.

## Interface and workflow checkpoint

See [interface design and theme configuration](docs/DESIGN.md) for the central color file and responsive sidebar. Every role has Dashboard and Profile; other sections follow API permissions. [Complaint controls](docs/COMPLAINTS.md) now cover named employee assignment, public messages and reopening review. Profiles now include validated username, phone and photo fields. See [action alerts](docs/ACTION_FEEDBACK.md) and [complaint reports](docs/REPORTS.md). Final browser and native print checks remain outstanding.
