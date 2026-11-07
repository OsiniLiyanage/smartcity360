# PostgreSQL and the first saved city

## Local setup

This project uses PostgreSQL 18.6 Windows binaries from the distributor linked by postgresql.org. On this computer the binaries are in `D:\OODP2\tools\pgsql`. The database runs on **127.0.0.1:5433**, separately from other database installations.

The helper creates a database named `smartcity360`, a separate application login `smartcity360_app`, and the initial `city` table. Admin and app passwords are generated locally in `.local/database.json`. That entire directory is ignored by Git and includes the database's actual data files. Do not delete it to clean the project: it contains saved data. Back it up privately when needed.

The application account has permission to read/change city records and use their ID sequence. It is not the PostgreSQL superuser. Payara stores its connection settings in its local domain configuration, outside the repository.

From IntelliJ's Terminal in the project folder, first-time setup is:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\database.ps1 -Action Setup
mvn package
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\database.ps1 -Action ConfigurePayara
```

Payara must be running for ConfigurePayara. It installs the JDBC driver into the project's domain and creates `jdbc/SmartCity360DS`. Run that configuration step once per new domain. Restart Payara afterwards and deploy:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\server.ps1 -Action Stop
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\server.ps1 -Action Start
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\server.ps1 -Action Deploy
```

Setup can be rerun to ensure the role, database and first table exist; it does not drop existing city records. Later schema changes will use new numbered SQL files rather than recreating the database.

For later sessions, start PostgreSQL before Payara:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\database.ps1 -Action Start
```

Use `-Action Status` to check it. When finished, stop Payara first, then stop PostgreSQL with `-Action Stop`. Binaries are portable; no new Windows service is registered. After reboot these servers need starting again.

## Connecting from IntelliJ's Database window

Add a PostgreSQL data source with host `127.0.0.1`, port `5433`, database `smartcity360`, user `smartcity360_app`. Use the **appPassword** from your private `.local/database.json` as its password. Keep it in the IDE's password storage; do not put it in source files or send it in chat. IntelliJ may offer to download its database driver.

## Understand the save flow

1. `index.html` collects the city name.
2. `cities.js` submits JSON to `POST /api/cities`.
3. `CityResource` checks the JSON field type and calls `CityService`.
4. The service validates and trims the name. `@Transactional` gives the save a database transaction.
5. `City` is a JPA entity. Its `@Table`, `@Id` and `@Column` annotations describe the database mapping.
6. The injected `EntityManager` persists the object using `SmartCity360PU` from `persistence.xml`.
7. That persistence unit uses Payara's JDBC resource. Payara's JPA provider communicates with PostgreSQL through the PostgreSQL JDBC driver.
8. The API returns HTTP 201 with the generated record ID. The page then calls `GET /api/cities` to refresh the list.

The JavaScript displays names using `textContent`, so entered text is displayed as text. Both browser and server validate input; the server remains authoritative. The table also prevents null/empty names. Names may currently repeat; records have distinct IDs.

This is the persistence foundation. The city/district/street/building Composite behavior, user accounts and the final Tailwind interface are later milestones. `/api/health` remains an application-only check; a successful `/api/cities` query demonstrates the database path is working.

## Source references

- PostgreSQL Windows distributions: https://www.postgresql.org/download/windows/
- Windows binary archives: https://www.enterprisedb.com/download-postgresql-binaries
- PostgreSQL JDBC: https://jdbc.postgresql.org/download/
- Jakarta Persistence 3.2: https://jakarta.ee/specifications/persistence/3.2/
- Payara database connectivity: https://docs.azul.com/payara-community/technical-documentation/payara-server-documentation/general-administration/administering-database-connectivity.html
