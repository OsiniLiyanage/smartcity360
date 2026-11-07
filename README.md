# SmartCity360

Java web assignment project. Current stage: a working city hierarchy workspace using the **Composite pattern (Part B)**, Jakarta REST, PostgreSQL/JPA and Tailwind CSS.

Create cities, districts, streets and buildings; record building usage; inspect recursive totals; and switch simulated power at any level. Five JUnit tests and 41 live HTTP checks passed. Browser interactions were also checked. See [verification evidence](docs/VERIFICATION.md) for scope and limits.

## Requirements

- JDK 21
- Maven
- Payara Community 7, compatible with Jakarta EE 11

PostgreSQL 18.6 and JPA are configured locally. See [database setup](docs/DATABASE.md). Parts A, C, D and E, authentication, the final report and the recorded demonstration remain pending. This is a local demonstration, not a production deployment.

## Build

Set the project SDK and Maven runner JDK to Java 21 in IntelliJ, reload the Maven project, then run the Maven `package` lifecycle goal (or `mvn package`).

Output: `target/smartcity360.war`.

The compiled Tailwind CSS is committed, so a fresh checkout can build the WAR with Maven alone. After changing styles or utility classes, run `npm ci` once, then `npm run build:css` before Maven packaging. Node is a build tool only; Payara runs the application. See the [official Tailwind CLI workflow](https://tailwindcss.com/docs/installation/tailwind-cli).

## First deployment check

Follow [Local development in IntelliJ](docs/LOCAL_DEVELOPMENT.md) to configure and run Payara 7. Our separate `smartcity360` domain uses HTTP port 9080 and administration port 9048. Deploy the WAR with application context `/smartcity360`:

- City workspace: `http://localhost:9080/smartcity360/`
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

## Try the hierarchy

1. Open the workspace, expand **Create a city**, enter a name and save.
2. Add a district. Select it in **City structure**, then add a street.
3. Select the street and add a building. Select the building to save usage in kWh.
4. Select the city or district to see the sum of its buildings' readings.
5. Switch a district off and inspect the city: another powered district produces a **Mixed** state. Recorded usage stays unchanged.

Use the same reporting period for all manual readings. These are saved values, not live meter telemetry. Empty groups have no buildings to control.

## Verify

- `mvn test`: five Composite behavior tests.
- `node scripts/verify-zones.mjs`: live API checks with Payara/PostgreSQL running; creates and retains two labelled demo cities per run.
- [Part B report draft](docs/report/PART_B_COMPOSITE.md): class roles, UML source, tradeoffs and viva explanation.

There is no Spring Boot dependency or standalone `main` method: Payara runs this web application.
