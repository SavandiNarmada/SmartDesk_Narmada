# ============================================================
# Smart Desk Assistant — Database Restore Script
# Run this ONCE on a new machine AFTER docker compose up -d
# ============================================================
# Usage: powershell -ExecutionPolicy Bypass -File restore_db.ps1
# ============================================================

Write-Host "Waiting for PostgreSQL to be healthy..." -ForegroundColor Cyan
$retries = 0
do {
    Start-Sleep -Seconds 3
    $health = docker inspect --format='{{.State.Health.Status}}' sda-postgres 2>'$null'
    $retries++
    Write-Host "  Attempt $retries — status: $health"
} while ($health -ne 'healthy' -and $retries -lt 20)

if ($health -ne 'healthy') {
    Write-Host "PostgreSQL did not become healthy. Run: docker compose up -d and try again." -ForegroundColor Red
    exit 1
}

Write-Host "Copying seed data into container..." -ForegroundColor Cyan
docker cp "$PSScriptRoot\database\seed_data.sql" sda-postgres:/tmp/seed_data.sql

Write-Host "Restoring data (this may take 30-60 seconds for large datasets)..." -ForegroundColor Cyan
docker exec sda-postgres psql -U postgres -d smart_desk_assistant --single-transaction -f /tmp/seed_data.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Data restored successfully!" -ForegroundColor Green
    Write-Host "Verifying row counts:" -ForegroundColor Cyan
    docker exec sda-postgres psql -U postgres -d smart_desk_assistant -c "SELECT 'users' as table_name, COUNT(*) as rows FROM users UNION ALL SELECT 'devices', COUNT(*) FROM devices UNION ALL SELECT 'sensor_readings', COUNT(*) FROM sensor_readings UNION ALL SELECT 'insights', COUNT(*) FROM insights;"
    Write-Host ""
    Write-Host "Restart backend to reconnect WebSocket:" -ForegroundColor Yellow
    Write-Host "  docker restart sda-backend"
} else {
    Write-Host "Restore encountered errors. Check output above." -ForegroundColor Red
}
