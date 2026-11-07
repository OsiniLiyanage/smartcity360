param(
    [ValidateSet('Setup', 'Start', 'Stop', 'Status', 'ConfigurePayara')]
    [string]$Action = 'Status',
    [string]$PostgresHome = (Join-Path $PSScriptRoot '..\..\tools\pgsql'),
    [string]$PayaraHome = (Join-Path $PSScriptRoot '..\..\tools\payara7'),
    [string]$JavaHome = 'C:\Program Files\Java\jdk-21'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$local = Join-Path $root '.local'
$data = Join-Path $local 'postgres-data'
$credentialsFile = Join-Path $local 'database.json'
$bin = Join-Path $PostgresHome 'bin'
$pgctl = Join-Path $bin 'pg_ctl.exe'
$psql = Join-Path $bin 'psql.exe'
if (-not (Test-Path -LiteralPath $pgctl)) { throw 'Install the PostgreSQL Windows binaries or supply -PostgresHome.' }

function Invoke-Pg {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL operation failed (exit $LASTEXITCODE)." }
}
function Invoke-Admin {
    param([string[]]$Arguments)
    & (Join-Path $JavaHome 'bin\java.exe') -jar (Join-Path $PayaraHome 'glassfish\lib\client\appserver-cli.jar') --host 127.0.0.1 --port 9048 @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'Payara database configuration failed.' }
}

switch ($Action) {
    'Setup' {
        New-Item -ItemType Directory -Path $local -Force | Out-Null
        if (-not (Test-Path -LiteralPath $credentialsFile)) {
            if (Test-Path -LiteralPath (Join-Path $data 'PG_VERSION')) {
                throw 'Existing database found without its credentials file. Restore that file; do not reset this database.'
            }
            $credentials = @{
                adminPassword = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
                appPassword = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
                host = '127.0.0.1'; port = 5433; database = 'smartcity360'; user = 'smartcity360_app'
            }
            $credentials | ConvertTo-Json | Set-Content -LiteralPath $credentialsFile -Encoding UTF8
        }
        $credentials = Get-Content -LiteralPath $credentialsFile -Raw | ConvertFrom-Json
        if (-not (Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))) {
            $passwordFile = Join-Path $local 'init-password.tmp'
            try {
                [IO.File]::WriteAllText($passwordFile, $credentials.adminPassword)
                Invoke-Pg -Program (Join-Path $bin 'initdb.exe') -Arguments @('-D', $data,
                    '-U', 'postgres', '--encoding=UTF8', '--locale=C', '--auth=scram-sha-256', '--pwfile', $passwordFile)
            } finally {
                if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile }
            }
        }
        & $pgctl -D $data status *> $null
        if ($LASTEXITCODE -ne 0) {
            Invoke-Pg -Program $pgctl -Arguments @('-D', $data, '-l', (Join-Path $local 'postgres.log'),
                '-o', '-p 5433 -h 127.0.0.1', '-w', 'start')
        }
        $oldPassword = $env:PGPASSWORD
        $oldAppPassword = $env:SC_APP_PASSWORD
        try {
            $env:PGPASSWORD = $credentials.adminPassword
            $env:SC_APP_PASSWORD = $credentials.appPassword
            # psql reads the password from the process environment, not command arguments.
            @'
\getenv app_password SC_APP_PASSWORD
SELECT format('CREATE ROLE smartcity360_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'smartcity360_app') \gexec
SELECT 'CREATE DATABASE smartcity360'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'smartcity360') \gexec
'@ | & $psql -X -h 127.0.0.1 -p 5433 -U postgres -d postgres -v ON_ERROR_STOP=1
            if ($LASTEXITCODE -ne 0) { throw 'Could not create database/role.' }
            Invoke-Pg -Program $psql -Arguments @('-X', '-h', '127.0.0.1', '-p', '5433', '-U', 'postgres',
                '-d', 'smartcity360', '-v', 'ON_ERROR_STOP=1', '-f', (Join-Path $root 'database\001_city.sql'))
        } finally {
            $env:PGPASSWORD = $oldPassword
            $env:SC_APP_PASSWORD = $oldAppPassword
        }
        Write-Host 'Database ready on localhost:5433. Private credentials are in .local/database.json.'
    }
    'Start' {
        Invoke-Pg -Program $pgctl -Arguments @('-D', $data, '-l', (Join-Path $local 'postgres.log'),
            '-o', '-p 5433 -h 127.0.0.1', '-w', 'start')
    }
    'Stop' { Invoke-Pg -Program $pgctl -Arguments @('-D', $data, '-m', 'fast', '-w', 'stop') }
    'Status' { Invoke-Pg -Program $pgctl -Arguments @('-D', $data, 'status') }
    'ConfigurePayara' {
        $credentials = Get-Content -LiteralPath $credentialsFile -Raw | ConvertFrom-Json
        $driver = Join-Path $env:USERPROFILE '.m2\repository\org\postgresql\postgresql\42.7.14\postgresql-42.7.14.jar'
        if (-not (Test-Path -LiteralPath $driver)) { throw 'Run mvn package first to obtain the PostgreSQL driver.' }
        $domainLib = Join-Path $PayaraHome 'glassfish\domains\smartcity360\lib'
        Copy-Item -LiteralPath $driver -Destination (Join-Path $domainLib 'postgresql-42.7.14.jar') -Force
        $resourceFile = Join-Path $local 'jdbc-resources.tmp.xml'
        $safePassword = [Security.SecurityElement]::Escape($credentials.appPassword)
        try {
            $xml = @"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE resources PUBLIC "-//GlassFish.org//DTD GlassFish Application Server 3.1 Resource Definitions//EN" "http://glassfish.org/dtds/glassfish-resources_1_5.dtd">
<resources>
  <jdbc-connection-pool name="SmartCity360Pool" res-type="javax.sql.DataSource" datasource-classname="org.postgresql.ds.PGSimpleDataSource" steady-pool-size="1" max-pool-size="10">
    <property name="serverName" value="127.0.0.1"/>
    <property name="portNumber" value="5433"/>
    <property name="databaseName" value="smartcity360"/>
    <property name="user" value="smartcity360_app"/>
    <property name="password" value="$safePassword"/>
  </jdbc-connection-pool>
  <jdbc-resource jndi-name="jdbc/SmartCity360DS" pool-name="SmartCity360Pool"/>
</resources>
"@
            [IO.File]::WriteAllText($resourceFile, $xml, (New-Object Text.UTF8Encoding($false)))
            Invoke-Admin -Arguments @('add-resources', $resourceFile)
        } finally {
            if (Test-Path -LiteralPath $resourceFile) { Remove-Item -LiteralPath $resourceFile }
        }
        Write-Host 'JDBC resource configured. Restart Payara to load the driver, then deploy the WAR.'
    }
}
