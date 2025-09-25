@echo off
echo 🚀 Starting Rizvi College RAG Frontend Server...
echo.
cd /d "C:\Users\Shikha\Desktop\copilot\college-rag-chatbot\frontend"
echo Current directory: %CD%
echo.
echo 📦 Starting React Development Server...
echo 🌐 Frontend will be available at: http://localhost:3000
echo.
npm start
if errorlevel 1 (
    echo.
    echo ❌ Error starting frontend server
    pause
) else (
    echo.
    echo ✅ Frontend server started successfully
)