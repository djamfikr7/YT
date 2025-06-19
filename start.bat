@echo off
echo 🚀 Starting Video Utility Suite...
echo.

echo 📡 Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0 && node server.cjs"

echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo 🎨 Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ✅ Both servers are starting...
echo 📡 Backend: http://localhost:9001
echo 🎨 Frontend: http://localhost:3001
echo.
echo 💡 Two command windows will open:
echo    - Backend Server (keep running)
echo    - Frontend Server (keep running)
echo.
echo 🌐 Your application will be available at:
echo    http://localhost:3001
echo.
pause
