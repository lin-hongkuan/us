@echo off
setlocal enabledelayedexpansion

REM Build Android APK (batch version of build-android.ps1)
REM Usage: build-android.bat [-Release|-Debug]

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."
set "MODE="

if /I "%~1"=="-Release" set "MODE=release"
if /I "%~1"=="-Debug"   set "MODE=debug"

REM Default: if signing.properties exists, build release; else debug
if "%MODE%"=="" (
  if exist "%REPO_ROOT%\signing.properties" (
    set "MODE=release"
  ) else (
    set "MODE=debug"
  )
)

pushd "%REPO_ROOT%"
echo 1^)^ Building web assets with Vite...
npm run build || goto :error

echo.
echo 2^)^ Syncing Capacitor Android project...
npx cap sync android || goto :error

set "TASK=assembleRelease"
if /I "%MODE%"=="debug" set "TASK=assembleDebug"

echo.
echo 3^)^ Running Gradle task: %TASK%
pushd android
call gradlew.bat %TASK% || goto :error
popd

echo.
if /I "%MODE%"=="debug" (
  echo Done. APK: android\app\build\outputs\apk\debug\app-debug.apk
) else (
  if exist "%REPO_ROOT%\signing.properties" (
    echo Done. APK: android\app\build\outputs\apk\release\app-release.apk ^(signed^)
  ) else (
    echo Done. APK: android\app\build\outputs\apk\release\app-release-unsigned.apk ^(not signed^)
  )
)
popd
exit /b 0

:error
popd
echo Build failed with exit code %errorlevel%
exit /b %errorlevel%
