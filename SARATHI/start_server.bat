@echo off
title SARATHI Backend Server (Port 4000)
echo ========================================================
echo Starting SARATHI Backend Server on http://localhost:4000
echo ========================================================
node server/src/index.js
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Server terminated with error code %errorlevel%.
  pause
)
