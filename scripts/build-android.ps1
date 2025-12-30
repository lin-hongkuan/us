Param(
  [switch]$Release,
  [switch]$Debug
)

$ErrorActionPreference = 'Stop'

# Repo root = script directory/..
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$signProps = Join-Path $repoRoot "signing.properties"
$hasSigning = Test-Path $signProps

# Default: if signing present, build release; otherwise debug
if (-not $Release -and -not $Debug) {
  if ($hasSigning) { $Release = $true } else { $Debug = $true }
}

if ($Debug) {
  $task = 'assembleDebug'
} else {
  $task = 'assembleRelease'
}

Write-Host "1) Building web assets with Vite..."
npm run build

Write-Host "`n2) Syncing Capacitor Android project..."
npx cap sync android

Write-Host "`n3) Running Gradle task: $task"
Push-Location "$repoRoot/android"
./gradlew.bat $task
$exitCode = $LASTEXITCODE
Pop-Location

if ($exitCode -ne 0) {
  throw "Gradle failed with exit code $exitCode"
}

Write-Host "`nDone. APK location:"
if ($Debug) {
  Write-Host "  android/app/build/outputs/apk/debug/app-debug.apk"
} else {
  if ($hasSigning) {
    Write-Host "  android/app/build/outputs/apk/release/app-release.apk (signed, zipaligned)"
  } else {
    Write-Host "  android/app/build/outputs/apk/release/app-release-unsigned.apk (no signing.properties found)"
  }
}
