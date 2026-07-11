# Vite 热更新开发模式（若进程异常退出，请改用 start-app.ps1）
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

Set-Location "$Root\frontend"
if (-not (Test-Path node_modules)) {
    npm install
}

$env:CHOKIDAR_USEPOLLING = "true"
Write-Host "Frontend dev: http://127.0.0.1:5173 (API proxy -> http://127.0.0.1:8080)" -ForegroundColor Cyan
Write-Host "请先另开终端启动后端: cd backend; mvn spring-boot:run"
npm run dev
