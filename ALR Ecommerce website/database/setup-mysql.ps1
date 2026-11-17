$ErrorActionPreference = "Stop"

$mysql = "C:\wamp64\bin\mysql\mysql8.4.7\bin\mysql.exe"
if (-not (Test-Path $mysql)) {
    $mysqlCommand = Get-Command mysql.exe -ErrorAction SilentlyContinue
    if (-not $mysqlCommand) {
        throw "MySQL client not found. Install mysql.exe or update the path in database\setup-mysql.ps1."
    }
    $mysql = $mysqlCommand.Source
}

function Read-SecretText([string]$Prompt) {
    $secure = Read-Host $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

if ([string]::IsNullOrWhiteSpace($env:MYSQL_PWD)) {
    $env:MYSQL_PWD = Read-SecretText "MySQL root password"
}
if ([string]::IsNullOrWhiteSpace($env:MYSQL_PWD)) {
    throw "A MySQL root password is required to provision the application account."
}

$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$random.GetBytes($bytes)
$appPassword = [System.BitConverter]::ToString($bytes).Replace("-", "")
$random.Dispose()

$sql = @"
CREATE DATABASE IF NOT EXISTS alr_store CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'alr_app'@'127.0.0.1' IDENTIFIED BY '$appPassword';
ALTER USER 'alr_app'@'127.0.0.1' IDENTIFIED BY '$appPassword';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON alr_store.* TO 'alr_app'@'127.0.0.1';
"@
$sql | & $mysql --protocol=TCP --host=127.0.0.1 --port=3306 --user=root --batch
if ($LASTEXITCODE -ne 0) {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    throw "MySQL database setup failed with exit code $LASTEXITCODE."
}
Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue

$credentialDirectory = Join-Path $env:LOCALAPPDATA "ALR Store"
New-Item -ItemType Directory -Path $credentialDirectory -Force | Out-Null
$credentialPath = Join-Path $credentialDirectory "mysql-app-password.xml"
ConvertTo-SecureString $appPassword -AsPlainText -Force | Export-Clixml -Path $credentialPath
$appPassword = $null
$bytes = $null

Write-Output "Database alr_store and restricted user alr_app are ready."
Write-Output "The app password is encrypted for this Windows account at $credentialPath."
Write-Output "Run .\run.ps1 from the project folder to start the storefront."
