Write-Host "🚀 Starting Rizvi College Website Scraping..."
Write-Host "URLs to scrape:"
Write-Host "  - https://eng.rizvi.edu.in/"
Write-Host "  - https://eng.rizvi.edu.in/vision-mission/"
Write-Host "  - https://eng.rizvi.edu.in/departments/"
Write-Host "  - https://eng.rizvi.edu.in/admission/"
Write-Host "  - https://eng.rizvi.edu.in/placement/"
Write-Host "  - https://eng.rizvi.edu.in/events-activities/"
Write-Host "  - https://eng.rizvi.edu.in/iqac/"
Write-Host ""

$requestBody = Get-Content -Path "scrape-request.json" -Raw

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/scrape/start" -Method POST -Body $requestBody -ContentType "application/json"
    Write-Host "✅ SUCCESS: Scraping started successfully!"
    Write-Host ($response | ConvertTo-Json -Depth 3)
    
    Write-Host ""
    Write-Host "Checking scraping status..."
    Start-Sleep -Seconds 2
    
    $status = Invoke-RestMethod -Uri "http://localhost:5000/api/scrape/status" -Method GET
    Write-Host "📊 Scraping Status:"
    Write-Host ($status | ConvertTo-Json -Depth 3)
    
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response | Out-String)"
}

Write-Host ""
Write-Host "Script completed. Check the backend server logs for scraping progress."