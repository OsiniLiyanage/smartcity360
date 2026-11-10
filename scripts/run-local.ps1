param(
    [switch]$RepairDeployment,
    [string]$JavaHome = 'C:\Program Files\Java\jdk-21',
    [string]$MavenHome = 'C:\maven\apache-maven-3.9.14'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$maven = Join-Path $MavenHome 'bin\mvn.cmd'
$pgctl = Join-Path $projectRoot '..\tools\pgsql\bin\pg_ctl.exe'
foreach ($requiredFile in @($maven, $pgctl, (Join-Path $JavaHome 'bin\java.exe'))) {
    if (-not (Test-Path -LiteralPath $requiredFile)) { throw "Required program not found: $requiredFile" }
}

function Test-AdminListener {
    $connection = New-Object Net.Sockets.TcpClient
    try {
        $pending = $connection.ConnectAsync('127.0.0.1', 9048)
        return ($pending.Wait(1500) -and $connection.Connected)
    } catch { return $false }
    finally { $connection.Dispose() }
}

$previousJavaHome = $env:JAVA_HOME
Push-Location -LiteralPath $projectRoot
try {
    $env:JAVA_HOME = $JavaHome
    # Uses the installed Maven cache and intentionally skips tests.
    & $maven -B -o -DskipTests package
    if ($LASTEXITCODE -ne 0) { throw 'Build failed. The running application was not redeployed.' }

    & $pgctl -D (Join-Path $projectRoot '.local\postgres-data') status
    $databaseStatus = $LASTEXITCODE
    if ($databaseStatus -eq 3) { & (Join-Path $PSScriptRoot 'database.ps1') -Action Start }
    elseif ($databaseStatus -ne 0) { throw 'Cannot determine database status. Check the existing local database setup.' }

    if (-not (Test-AdminListener)) { & (Join-Path $PSScriptRoot 'server.ps1') -Action Start -JavaHome $JavaHome }
    $deploymentAction = if ($RepairDeployment) { 'RepairDeploy' } else { 'Deploy' }
    & (Join-Path $PSScriptRoot 'server.ps1') -Action $deploymentAction -JavaHome $JavaHome
    Write-Host 'Open http://localhost:9080/smartcity360/ and press Ctrl+F5.'
} finally {
    $env:JAVA_HOME = $previousJavaHome
    Pop-Location
}
