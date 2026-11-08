param([string]$Email = 'admin@smartcity360.local', [string]$DisplayName = 'System Administrator')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$credentialsPath = Join-Path $projectRoot '.local\database.json'
$outputPath = Join-Path $projectRoot '.local\bootstrap-admin.json'
if (Test-Path -LiteralPath $outputPath) { throw 'The private bootstrap credential file already exists. Use the existing account; this command does not reset passwords.' }
$db = Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json
$psql = Join-Path $projectRoot '..\tools\pgsql\bin\psql.exe'
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$randomBytes = New-Object byte[] 32
$salt = New-Object byte[] 16
$rng.GetBytes($randomBytes)
$rng.GetBytes($salt)
$password = [Convert]::ToBase64String($randomBytes)
$derive = [Security.Cryptography.Rfc2898DeriveBytes]::new($password, $salt, 600000, [Security.Cryptography.HashAlgorithmName]::SHA256)
try { $hash = 'pbkdf2-sha256$600000$' + [Convert]::ToBase64String($salt) + '$' + [Convert]::ToBase64String($derive.GetBytes(32)) }
finally { $derive.Dispose(); $rng.Dispose() }
$oldPassword = $env:PGPASSWORD
$oldEmail = $env:SC_BOOTSTRAP_EMAIL
$oldName = $env:SC_BOOTSTRAP_NAME
$oldHash = $env:SC_BOOTSTRAP_HASH
try {
    $env:PGPASSWORD = $db.adminPassword
    $env:SC_BOOTSTRAP_EMAIL = $Email.Trim().ToLowerInvariant()
    $env:SC_BOOTSTRAP_NAME = $DisplayName
    $env:SC_BOOTSTRAP_HASH = $hash
    $result = @'
\getenv account_email SC_BOOTSTRAP_EMAIL
\getenv account_name SC_BOOTSTRAP_NAME
\getenv account_hash SC_BOOTSTRAP_HASH
BEGIN;
DO $$ BEGIN PERFORM pg_advisory_xact_lock(360007); END $$;
WITH added AS (
 INSERT INTO app_user(email,display_name,password_hash,role,password_change_required)
 SELECT :'account_email', :'account_name', :'account_hash', 'SYSTEM_ADMIN', true
 WHERE NOT EXISTS(SELECT 1 FROM app_user WHERE role='SYSTEM_ADMIN')
 RETURNING id
), logged AS (
 INSERT INTO account_event(target_id,action) SELECT id,'ADMIN_BOOTSTRAPPED' FROM added
)
SELECT id FROM added;
COMMIT;
'@ | & $psql -X -q -t -A -h 127.0.0.1 -p 5433 -U postgres -d smartcity360 -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw 'Admin setup failed. No credentials were printed.' }
    $idText = ($result | Where-Object { $_ -match '^\d+$' } | Select-Object -Last 1)
    if (-not $idText) { throw 'An administrator already exists. Bootstrap did not create another account.' }
    @{email=$Email.Trim().ToLowerInvariant(); password=$password; userId=[long]$idText} | ConvertTo-Json | Set-Content -LiteralPath $outputPath -Encoding UTF8
    Write-Host 'Administrator created. Private sign-in details are in .local/bootstrap-admin.json. Change the temporary password after signing in.'
} finally {
    $env:PGPASSWORD=$oldPassword; $env:SC_BOOTSTRAP_EMAIL=$oldEmail; $env:SC_BOOTSTRAP_NAME=$oldName; $env:SC_BOOTSTRAP_HASH=$oldHash
}
