@echo off
echo Creating admin in production MongoDB Atlas...
echo.
set NODE_ENV=production
node scripts/createAdmin.js
pause
