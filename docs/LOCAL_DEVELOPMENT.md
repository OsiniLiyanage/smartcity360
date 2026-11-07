# Running SmartCity360 in IntelliJ Ultimate

## Tools and locations

- Project: `D:\OODP2\smartcity360`
- JDK: Java 21 (`C:\Program Files\Java\jdk-21` on this computer)
- Runtime: Payara Community 7.2026.10, extracted to `D:\OODP2\tools\payara7`
- Application domain: `smartcity360`
- Browser URL: http://localhost:9080/smartcity360/
- REST check: http://localhost:9080/smartcity360/api/health
- Local administration console: http://localhost:9048/

The runtime sits outside the Git repository. The older `C:\payara6` installation is separate. A domain is a named server configuration: ours uses different ports from the default domain, so it can coexist with previous coursework.

## First-time setup on another computer

1. Install JDK 21 and Maven, then open the project's `pom.xml` in IntelliJ as a project.
2. Set Project SDK and the Maven runner JRE to Java 21; reload Maven.
3. Download Payara Community 7 from https://www.azul.com/downloads/azul-payara-community-edition/ and extract its ZIP. The default script path expects a sibling `tools/payara7` folder beside the project folder. Supply `-PayaraHome` if yours is elsewhere.
4. Open IntelliJ's Terminal tool window in the project folder. The following commands use PowerShell. A process-only execution-policy option allows the reviewed project script to run without changing the machine's policy.
5. Create the local domain once:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\server.ps1 -Action Setup
```

Setup preserves an existing `smartcity360` domain. A newly created domain uses local web/admin listener addresses, HTTP 9080 and admin 9048. Its passwordless admin is for local coursework development only, not public hosting.

To specify other installation locations, append these parameters to script commands:

```powershell
-PayaraHome 'D:\tools\payara7' -JavaHome 'C:\Program Files\Java\jdk-21'
```

## Daily development

Start the server when it is stopped:

First start PostgreSQL as described in [Database setup](DATABASE.md). The application now needs its configured JDBC resource and database.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\server.ps1 -Action Start
```

Build using **Maven tool window -> Lifecycle -> package**, or:

```powershell
mvn package
```

If the build reports **BUILD SUCCESS**, deploy its WAR:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\server.ps1 -Action Deploy
```

Open http://localhost:9080/smartcity360/ and follow the check link. Expected JSON:

```json
{"application":"SmartCity360","status":"UP"}
```

This confirms Jakarta REST responds. Database readiness is a separate future check.

After editing Java or web files, build again and deploy again. The deploy action replaces this application's previous deployment. It does not recreate the domain or touch other applications.

Check status or stop the server:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\server.ps1 -Action Status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\server.ps1 -Action Stop
```

## Understand the first request

1. Payara serves `src/main/webapp/index.html`.
2. Its link requests `/smartcity360/api/health`.
3. `/smartcity360` is the deployed application's context path.
4. `RestApplication` declares `/api` with `@ApplicationPath`.
5. `HealthResource` declares `/health`; `@GET` selects the method.
6. The method builds a JSON response. `@Produces` declares its content type.

Maven compiles and packages the code; Payara runs it. JAX-RS routes the HTTP request. No Spring Boot component is involved.

## GitHub workflow

Save a separate commit for each meaningful working change. Review the diff, run the relevant checks, commit, then push. GitHub Desktop shows commits created from the terminal too. Build output, installed servers, local environment values and downloaded dependencies are not project source and stay outside commits.

## Verified checkpoint - 6 November 2026

- Runtime version: Payara Server 7.2026.10 (build 18), using Java 21.
- Separate `smartcity360` domain created and started.
- Application deployed with context `/smartcity360`.
- Setup page returned HTTP 200 and contained the endpoint link.
- `/api/health` returned HTTP 200, `application/json`, and the expected application/status values.
- Server helper syntax and Git whitespace checks passed.

During setup, PowerShell's default XML save inserted a UTF-8 byte-order mark that Payara's startup parser rejected. The helper now writes UTF-8 without that mark. No old Payara 6 settings were changed.

This initial checkpoint was followed by PostgreSQL/JPA integration on 7 November; see [verification evidence](VERIFICATION.md). Tailwind and assignment feature behavior remain later milestones.
