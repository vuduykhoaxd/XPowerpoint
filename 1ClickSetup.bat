@echo off
REM ============================================================
REM XPowerpoint v1.0.0 - One-Click Setup (Windows)
REM ============================================================
title XPowerpoint Setup

echo ==============================
echo  XPowerpoint Setup v1.0.0
echo ==============================
echo.

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo [1/5] Kiem tra Node.js...
node --version
if errorlevel 1 (
  echo Node.js khong tim thay. Cai tai: https://nodejs.org
  pause
  exit /b 1
)

echo.
echo [2/5] Cai ung dung MCP...
cd /d "%ROOT%mcp"
if not exist node_modules (
  npm install
)
if errorlevel 1 (
  echo npm install that bai.
  pause
  exit /b 1
)
echo Dang build server...
npm run build
if errorlevel 1 (
  echo Build that bai. Kiem tra xem loi do.
  pause
  exit /b 1
)

echo.
echo [3/5] Cai ung dung Python bridge...
cd /d "%ROOT%python"
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo Cai Python cai that bai.
  pause
  exit /b 1
)

echo.
echo [4/5] Chay smoke test...
cd /d "%ROOT%mcp"
npm test
if errorlevel 1 (
  echo Smoke test that bai. Kiem tra lai thu nghiem truoc khi tiep tuc.
  pause
  exit /b 1
)

echo.
echo ==============================
echo  SETUP HOAN TAT!
echo  Chay server: node mcp/bin/server.mjs
echo ==============================
echo.
pause