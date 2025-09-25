@echo off
cd /d "C:\Users\Shikha\Desktop\copilot\college-rag-chatbot\backend"
echo Starting Backend Server for Testing...
timeout /t 2 /nobreak >nul
start /b node server.js
timeout /t 8 /nobreak >nul
echo.
echo Triggering manual scraping...
powershell -Command "$body = @{ urls = @('https://eng.rizvi.edu.in/', 'https://eng.rizvi.edu.in/vision-mission/', 'https://eng.rizvi.edu.in/departments/'); maxDepth = 2 } | ConvertTo-Json; try { $result = Invoke-RestMethod -Uri 'http://localhost:5000/api/scrape/start' -Method POST -Body $body -ContentType 'application/json'; Write-Host 'Scraping started:' $result } catch { Write-Host 'Error:' $_.Exception.Message }"
pause