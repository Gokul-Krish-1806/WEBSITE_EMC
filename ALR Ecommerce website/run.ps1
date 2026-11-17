$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

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

$credentialPath = Join-Path $env:LOCALAPPDATA "ALR Store\mysql-app-password.xml"
if (-not (Test-Path $credentialPath)) {
    throw "MySQL application credentials are not set up. Run .\database\setup-mysql.ps1 first."
}
$secureDbPassword = Import-Clixml -Path $credentialPath
$dbPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureDbPassword)
try {
    $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($dbPointer)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($dbPointer)
}

if ([string]::IsNullOrWhiteSpace($env:DB_URL)) {
    $env:DB_URL = Read-Host "MySQL JDBC URL (press Enter for jdbc:mysql://127.0.0.1:3306/alr_store)"
}
if ([string]::IsNullOrWhiteSpace($env:DB_URL)) {
    $env:DB_URL = "jdbc:mysql://127.0.0.1:3306/alr_store?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
}
$env:DB_USERNAME = "alr_app"
if ([string]::IsNullOrWhiteSpace($env:ALR_ADMIN_EMAIL)) {
    $env:ALR_ADMIN_EMAIL = Read-Host "Initial ALR administrator email (existing admin: admin@alr.local)"
}
if ([string]::IsNullOrWhiteSpace($env:ALR_ADMIN_EMAIL)) {
    throw "Enter the initial administrator email."
}
if ([string]::IsNullOrWhiteSpace($env:ALR_ADMIN_PASSWORD)) {
    $env:ALR_ADMIN_PASSWORD = Read-SecretText "Initial admin password (minimum 12 characters)"
}
if ($env:ALR_ADMIN_PASSWORD.Length -lt 12) {
    throw "The administrator password must contain at least 12 characters."
}

$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$random.GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$random.Dispose()

Push-Location (Join-Path $root "backend")
try {
    & mvn spring-boot:run
    if ($LASTEXITCODE -ne 0) {
        throw "Spring Boot stopped with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
    Remove-Item Env:DB_URL, Env:DB_USERNAME, Env:DB_PASSWORD, Env:ALR_ADMIN_EMAIL, Env:ALR_ADMIN_PASSWORD, Env:JWT_SECRET -ErrorAction SilentlyContinue
}
