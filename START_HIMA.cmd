@echo off
cd /d "%~dp0"
title Hima Learning Hub
echo.
echo Starting Hima Learning Hub...
echo Keep this window open while you test the application.
echo.
call npm run dev
echo.
echo Hima has stopped. Press any key to close this window.
pause >nul
