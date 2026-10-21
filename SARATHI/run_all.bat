@echo off
title SARATHI Platform Launcher
echo ========================================================
echo Starting SARATHI Multi-Domain Intelligence Platform...
echo Backend API:  http://localhost:4000
echo Frontend App: http://localhost:5173
echo ========================================================
echo.
echo Launching unified dev server (both backend and frontend)...
node scripts/dev.js
if %errorlevel% neq 0 (
  echo.
  echo [Notice] Unified runner stopped or encountered an issue.
  echo Launching backend and frontend in separate windows...
  start "SARATHI Backend (Port 4000)" cmd /k "node server/src/index.js"
  start "SARATHI Frontend (Port 5173)" cmd /k "node ./node_modules/vite/bin/vite.js"
)
pause
