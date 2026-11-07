# SmartCity360

Java web assignment project. Current stage: a city hierarchy workspace using **Composite (Part B)** and a complaint workflow using **Chain of Responsibility (Part C)**, with Jakarta REST, PostgreSQL/JPA and Tailwind CSS.

Create city hierarchies, record usage and control simulated power. Submit complaints linked to those cities/areas, route by severity, escalate and record work through resolution. Eleven JUnit tests passed; separate live checkpoints verified 41 hierarchy HTTP checks and 46 complaint HTTP checks. Browser workflows and restart persistence were checked. See [verification evidence](docs/VERIFICATION.md) for scope and limits.

## Requirements

- JDK 21
- Maven
- Payara Community 7, compatible with Jakarta EE 11

PostgreSQL 18.6 and JPA are configured locally. See [database setup](docs/DATABASE.md). Parts A, D and E, authentication, the final report and the recorded demonstration remain pending. This is a local demonstration, not a production deployment.

## Build

Set the project SDK and Maven runner JDK to Java 21 in IntelliJ, reload the Maven project, then run the Maven `package` lifecycle goal (or `mvn package`).

Output: `target/smartcity360.war`.

The compiled Tailwind CSS is committed, so a fresh checkout can build the WAR with Maven alone. After changing styles or utility classes, run `npm ci` once, then `npm run build:css` before Maven packaging. Node is a build tool only; Payara runs the application. See the [official Tailwind CLI workflow](https://tailwindcss.com/docs/installation/tailwind-cli).

## First deployment check

Follow [Local development in IntelliJ](docs/LOCAL_DEVELOPMENT.md) to configure and run Payara 7. Our separate `smartcity360` domain uses HTTP port 9080 and administration port 9048. Deploy the WAR with application context `/smartcity360`:

- City workspace: `http://localhost:9080/smartcity360/`
- Complaints: `http://localhost:9080/smartcity360/complaints.html`
- REST check: `http://localhost:9080/smartcity360/api/health`
- Saved city records: `http://localhost:9080/smartcity360/api/cities`

Expected REST response: `{"application":"SmartCity360","status":"UP"}`.

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

## Try the hierarchy

1. Open the workspace, expand **Create a city**, enter a name and save.
2. Add a district. Select it in **City structure**, then add a street.
3. Select the street and add a building. Select the building to save usage in kWh.
4. Select the city or district to see the sum of its buildings' readings.
5. Switch a district off and inspect the city: another powered district produces a **Mixed** state. Recorded usage stays unchanged.

Use the same reporting period for all manual readings. These are saved values, not live meter telemetry. Empty groups have no buildings to control.

## Verify

- `mvn test`: five Composite and six Chain of Responsibility tests.
- `node scripts/verify-zones.mjs`: live API checks with Payara/PostgreSQL running; creates and retains two labelled demo cities per run.
- `node scripts/verify-complaints.mjs`: live complaint checks; creates two labelled demo cities and four complaints per successful run.
- [Part B report draft](docs/report/PART_B_COMPOSITE.md): class roles, UML source, tradeoffs and viva explanation.
- [Complaint workflow guide](docs/COMPLAINTS.md): UI steps, API, data model and limitations.
- [Part C report draft](docs/report/PART_C_CHAIN_OF_RESPONSIBILITY.md): assessment answers and supporting UML source.

There is no Spring Boot dependency or standalone `main` method: Payara runs this web application.
