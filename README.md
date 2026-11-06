# SmartCity360

Java web assignment project. Current stage: Maven and Jakarta REST foundation.

Verification (6 November 2026): `mvn -B -ntp package` succeeded with Java release 21. The WAR contains both REST classes and the setup page. No automated tests have been added for this minimal foundation. Server deployment and HTTP/database checks are still pending.

## Requirements

- JDK 21
- Maven
- Payara Community 7, compatible with Jakarta EE 11

PostgreSQL/JPA, Tailwind and the five assignment features are planned but not yet configured or implemented.

## Build

Set the project SDK and Maven runner JDK to Java 21 in IntelliJ, reload the Maven project, then run the Maven `package` lifecycle goal (or `mvn package`).

Output: `target/smartcity360.war`.

## First deployment check

Deploy the WAR on Payara 7 with application context `/smartcity360`. For a local server configured on HTTP port 8080:

- Setup page: `http://localhost:8080/smartcity360/`
- REST check: `http://localhost:8080/smartcity360/api/health`

Expected REST response: `{"application":"SmartCity360","status":"UP"}`.

The REST check confirms the Java endpoint responds; it does not verify a database connection. Building the WAR alone does not establish that deployment works. Payara setup and deployment verification are the next learning step.

## Understand these files

- `pom.xml`: Java version, Jakarta EE dependency and WAR packaging. `provided` means the server supplies the Jakarta implementation.
- `RestApplication.java`: establishes `/api` as the REST base path.
- `HealthResource.java`: handles `GET /api/health` and returns JSON.
- `src/main/webapp/index.html`: simple setup page served with the application. This is not the final Tailwind interface.

There is no Spring Boot dependency or standalone `main` method: Payara runs this web application.
