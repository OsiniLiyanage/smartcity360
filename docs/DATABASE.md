# PostgreSQL and the city hierarchy

## Local setup

This project uses PostgreSQL 18.6 Windows binaries from the distributor linked by postgresql.org. On this computer the binaries are in `D:\OODP2\tools\pgsql`. The database runs on **127.0.0.1:5433**, separately from other database installations.

The helper creates a database named `smartcity360`, a separate application login `smartcity360_app`, and the `city` and `zone` tables. Admin and app passwords are generated locally in `.local/database.json`. That entire directory is ignored by Git and includes the database's actual data files. Do not delete it to clean the project: it contains saved data. Back it up privately when needed.

The application account has permission to read/change city and zone records and use their ID sequences. It is not the PostgreSQL superuser. Payara stores its connection settings in its local domain configuration, outside the repository.

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

Setup runs the numbered files in `database/` in filename order, each inside a transaction. The current `001_city.sql` and `002_zones.sql` scripts can safely run again and preserve existing records. There is no migration-history table: future scripts must remain safe to rerun or the runner must be upgraded before introducing one-time data transformations. Do not recreate the database to apply this update.

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

## Hierarchy storage and commands

`zone` stores district, street and building records. `city_id` identifies the owning city; `parent_id` is null for a district and references another zone for a street/building. A composite foreign key prevents cross-city parent links. Only buildings store `usage_kwh` and `power_on`; group values are calculated by the Composite classes. The service enforces the exact level order, as a foreign key alone cannot check the parent's type.

Every hierarchy mutation locks the owning city row within a JPA transaction. This serializes writes within that city. The service invokes the Composite power operation, then persists the resulting building states. This is a simulated power command with atomic database changes, not a connection to electrical hardware.

| Endpoint under `/api` | Operation |
|---|---|
| `GET /cities/{cityId}/zones` | Full hierarchy with totals and power states |
| `POST /cities/{cityId}/zones` | Add `{name, type, parentId}`; null parent means city |
| `PUT /cities/{cityId}/zones/{zoneId}/usage` | Replace a building's reading with `{usageKwh}` |
| `PUT /cities/{cityId}/zones/power` | Apply `{zoneId, powerOn}`; null/omitted zone means whole city |

Usage permits 0–999999999.999 kWh and up to three decimal places. Invalid inputs return 400; missing or cross-city targets return 404. Root city IDs and zone IDs are separate identities. `/api/health` remains application-only; a successful hierarchy request also checks the database path. User accounts remain pending.

## Source references

- PostgreSQL Windows distributions: https://www.postgresql.org/download/windows/
- Windows binary archives: https://www.enterprisedb.com/download-postgresql-binaries
- PostgreSQL JDBC: https://jdbc.postgresql.org/download/
- Jakarta Persistence 3.2: https://jakarta.ee/specifications/persistence/3.2/
- Payara database connectivity: https://docs.azul.com/payara-community/technical-documentation/payara-server-documentation/general-administration/administering-database-connectivity.html
