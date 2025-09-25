@echo off
echo Starting College RAG Chatbot...
echo.
echo Opening 2 command windows:
echo 1. Backend Server (Port 5000)
echo 2. Frontend Server (Port 3000)
echo.
echo Close both windows to stop the servers.
echo.

start "Backend Server" cmd /k "cd /d C:\Users\Shikha\Desktop\copilot\college-rag-chatbot\backend && node server.js"
timeout /t 3 /nobreak >nul
start "Frontend Server" cmd /k "cd /d C:\Users\Shikha\Desktop\copilot\college-rag-chatbot\frontend && npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause