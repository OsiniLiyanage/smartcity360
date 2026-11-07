# SmartCity360

Java web assignment project. Current stage: Jakarta REST and PostgreSQL/JPA foundation, with a working create/list city page.

Verification (7 November 2026): Maven packaging and Payara deployment succeeded. Live HTTP checks covered city creation/listing, name trimming and five invalid inputs. A saved city survived restarting both PostgreSQL and Payara, and a direct SQL query matched the API response. See [verification evidence](docs/VERIFICATION.md) for details and limits.

## Requirements

- JDK 21
- Maven
- Payara Community 7, compatible with Jakarta EE 11

PostgreSQL 18.6 and JPA are configured locally. See [database setup](docs/DATABASE.md). Tailwind, authentication and the five assignment features are later milestones; this page is the persistence checkpoint.

## Build

Set the project SDK and Maven runner JDK to Java 21 in IntelliJ, reload the Maven project, then run the Maven `package` lifecycle goal (or `mvn package`).

Output: `target/smartcity360.war`.

## First deployment check

Follow [Local development in IntelliJ](docs/LOCAL_DEVELOPMENT.md) to configure and run Payara 7. Our separate `smartcity360` domain uses HTTP port 9080 and administration port 9048. Deploy the WAR with application context `/smartcity360`:

- Setup page: `http://localhost:9080/smartcity360/`
- REST check: `http://localhost:9080/smartcity360/api/health`
- Saved city records: `http://localhost:9080/smartcity360/api/cities`

Expected REST response: `{"application":"SmartCity360","status":"UP"}`.

The health endpoint confirms Java responds; listing cities also checks the database path. Start PostgreSQL before Payara in later development sessions.

## Understand these files

- `pom.xml`: Java version, Jakarta EE dependency and WAR packaging. `provided` means the server supplies the Jakarta implementation.
- `RestApplication.java`: establishes `/api` as the REST base path.
- `HealthResource.java`: handles `GET /api/health` and returns JSON.
- `src/main/webapp/index.html`: simple setup page served with the application. This is not the final Tailwind interface.

There is no Spring Boot dependency or standalone `main` method: Payara runs this web application.
