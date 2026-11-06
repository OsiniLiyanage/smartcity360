param(
    [ValidateSet('Setup', 'Start', 'Stop', 'Deploy', 'Status', 'Version')]
    [string]$Action = 'Status',
    [string]$PayaraHome = (Join-Path $PSScriptRoot '..\..\tools\payara7'),
    [string]$JavaHome = 'C:\Program Files\Java\jdk-21'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$java = Join-Path $JavaHome 'bin\java.exe'
$cli = Join-Path $PayaraHome 'glassfish\lib\client\appserver-cli.jar'
$domains = Join-Path $PayaraHome 'glassfish\domains'
$domainName = 'smartcity360'
$domainConfig = Join-Path $domains "$domainName\config\domain.xml"

if (-not (Test-Path -LiteralPath $java)) {
    throw 'Java was not found. Supply -JavaHome with your JDK 21 installation folder.'
}
if (-not (Test-Path -LiteralPath $cli)) {
    throw 'Payara was not found. Install Payara Community 7 or supply -PayaraHome.'
}

function Invoke-Payara {
    param([string[]]$Arguments)
    & $java -jar $cli @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Payara command failed (exit $LASTEXITCODE). Check the output above."
    }
}

switch ($Action) {
    'Version' {
        Invoke-Payara -Arguments @('version', '--local=true')
    }
    'Setup' {
        if (Test-Path -LiteralPath $domainConfig) {
            Write-Host 'The smartcity360 domain already exists; its settings were preserved.'
            break
        }
        # Port base 9000 gives HTTP 9080 and administration 9048.
        Invoke-Payara -Arguments @('create-domain', '--domaindir', $domains,
            '--nopassword=true', '--portbase', '9000', $domainName)

        # This development domain exposes its web/admin listeners only locally.
        [xml]$domain = Get-Content -LiteralPath $domainConfig -Raw
        foreach ($listener in $domain.SelectNodes('//network-listener')) {
            $listener.SetAttribute('address', '127.0.0.1')
        }
        foreach ($connector in $domain.SelectNodes('//jmx-connector')) {
            $connector.SetAttribute('address', '127.0.0.1')
        }
        # Payara's startup parser expects UTF-8 without a byte-order mark.
        $xmlSettings = New-Object System.Xml.XmlWriterSettings
        $xmlSettings.Encoding = New-Object System.Text.UTF8Encoding($false)
        $xmlSettings.Indent = $true
        $xmlWriter = [System.Xml.XmlWriter]::Create($domainConfig, $xmlSettings)
        try {
            $domain.Save($xmlWriter)
        } finally {
            $xmlWriter.Dispose()
        }
        Write-Host 'Created local development domain. HTTP: 9080; administration: 9048.'
    }
    'Start' {
        if (-not (Test-Path -LiteralPath $domainConfig)) {
            throw 'Run this script with -Action Setup first.'
        }
        Invoke-Payara -Arguments @('start-domain', '--domaindir', $domains, $domainName)
    }
    'Stop' {
        Invoke-Payara -Arguments @('stop-domain', '--domaindir', $domains, $domainName)
    }
    'Status' {
        Invoke-Payara -Arguments @('list-domains', '--domaindir', $domains)
    }
    'Deploy' {
        $war = Join-Path $projectRoot 'target\smartcity360.war'
        if (-not (Test-Path -LiteralPath $war)) {
            throw 'Build the application with mvn package before deploying.'
        }
        Invoke-Payara -Arguments @('--host', '127.0.0.1', '--port', '9048',
            'deploy', '--force=true', '--name', 'smartcity360',
            '--contextroot', 'smartcity360', $war)
    }
}
