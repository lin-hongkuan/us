Param(
  [string]$KeystorePath = "android/keystore/us-release.keystore",
  [string]$Alias = "usapp",
  [string]$StorePassword,
  [string]$KeyPassword,
  [string]$DName = "CN=Us Shared Memory,O=Us Team,L=City,ST=State,C=CN"
)

$ErrorActionPreference = "Stop"

if (-not $StorePassword) { $StorePassword = Read-Host "Enter store password" }
if (-not $KeyPassword) { $KeyPassword = Read-Host "Enter key password" }

$keystoreFullPath = Resolve-Path -Path (Join-Path (Get-Location) $KeystorePath) -ErrorAction SilentlyContinue
if (-not $keystoreFullPath) {
  $keystoreDir = Split-Path -Parent $KeystorePath
  if ($keystoreDir) { New-Item -ItemType Directory -Force -Path $keystoreDir | Out-Null }
  $keystoreFullPath = Resolve-Path -Path (Join-Path (Get-Location) $KeystorePath)
}

Write-Host "Generating keystore at $keystoreFullPath ..."
& keytool -genkeypair -v `
  -keystore $keystoreFullPath `
  -alias $Alias `
  -keyalg RSA `
  -keysize 2048 `
  -validity 36500 `
  -storepass $StorePassword `
  -keypass $KeyPassword `
  -dname $DName

$signProps = @(
  "storeFile=$KeystorePath",
  "storePassword=$StorePassword",
  "keyAlias=$Alias",
  "keyPassword=$KeyPassword"
)
Set-Content -Path "signing.properties" -Value $signProps

Write-Host "`nDone. Keystore and signing.properties ready."
