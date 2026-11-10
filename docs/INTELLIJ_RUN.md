# Run from IntelliJ IDEA

Open the smartcity360 project folder. This is a Jakarta EE WAR hosted by
Payara, so it does not have an Application main class to run.

## One command

In IntelliJ's Terminal, from the project root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-local.ps1
```

This builds with cached Maven dependencies, skips tests, starts PostgreSQL and
Payara if needed, and deploys or redeploys the application. Open
http://localhost:9080/smartcity360/ and refresh with Ctrl+F5. Run only one
deployment at a time. Services keep running when the command finishes.

The defaults match this local workspace: Java 21 in C:\Program Files\Java\jdk-21,
Maven in C:\maven\apache-maven-3.9.14, and Payara/PostgreSQL under ../tools.
Use -JavaHome and -MavenHome to supply different Java/Maven locations.

## Add an IntelliJ menu action

Settings > Tools > External Tools > +:

| Setting | Value |
| --- | --- |
| Name | Run SmartCity360 |
| Program | C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe |
| Arguments | -NoProfile -ExecutionPolicy Bypass -File "$ProjectFileDir$\scripts\run-local.ps1" |
| Working directory | $ProjectFileDir$ |

Save, then use Tools > External Tools > Run SmartCity360. A keyboard shortcut
can be assigned to the action under Settings > Keymap > External Tools.
This approach uses the project's installed Payara, without an IDE application
server plugin. See [JetBrains external tools documentation](https://www.jetbrains.com/help/idea/configuring-third-party-tools.html).

## Repair an incomplete deployment

If deployment reports that the application name is already in use, or the
server log reports missing files under applications/smartcity360, first try
the normal command above. It uses redeploy for an existing registration.
If that still fails, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-local.ps1 -RepairDeployment
```

The repair builds first, then removes only the existing smartcity360 application
registration and installs the WAR again. PostgreSQL records and database/server
configuration are preserved. Active application sessions may end. If installation
fails, correct the reported error and run the normal command again.

If the WAR is already current and Payara is running, the shorter commands are
`.\scripts\server.ps1 -Action Deploy` and, for explicit repair,
`.\scripts\server.ps1 -Action RepairDeploy`.

## Manual City zones check

1. Sign in as admin. Open City zones and drill into a district and street.
2. Use the breadcrumb to return; search within the current location.
3. Open a building and confirm its details appear in a dialog.
4. Check Add opens a separate form; cancel without changing sample data.
5. Check light/dark themes and mobile layout; confirm resident navigation hides City zones.

The launcher and deployment repair are not yet verified on the running server.
