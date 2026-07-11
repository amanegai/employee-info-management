# 公司服务器初期化（空库 + 必须主数据，不迁移本机 PostgreSQL）
# 用法（项目根目录）: .\scripts\init-company-docker.ps1
# 可选: -SkipDemoRemoval  若需保留 Flyway 演示社员（仅测试环境）

param(
    [switch]$SkipDemoRemoval,
    [switch]$ReplaceDepartments
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

if (-not (Test-Path .env)) {
    Write-Host "请先 copy deploy.env.example .env 并设置 DB_PASSWORD" -ForegroundColor Red
    exit 1
}

Write-Host "== 1/3 启动 Docker Compose（Flyway 自动建表）==" -ForegroundColor Cyan
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "等待 postgres 与应用就绪..." -ForegroundColor Gray
Start-Sleep -Seconds 15

if (-not $SkipDemoRemoval) {
    Write-Host "== 2/3 删除演示社员数据 ==" -ForegroundColor Cyan
    Get-Content (Join-Path $PSScriptRoot "remove-demo-data.sql") -Raw |
        docker compose exec -T postgres psql -U employee_app -d employee_mgmt -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "== 2/3 跳过删除演示社员 (-SkipDemoRemoval) ==" -ForegroundColor Yellow
}

if ($ReplaceDepartments) {
    Write-Host "== 3/3 按 seed-company-master.sql 替换部门 ==" -ForegroundColor Cyan
    Get-Content (Join-Path $PSScriptRoot "seed-company-master.sql") -Raw |
        docker compose exec -T postgres psql -U employee_app -d employee_mgmt -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "== 3/3 保留 Flyway 默认部门（无需替换）==" -ForegroundColor Gray
}

Write-Host ""
Write-Host "完成。请浏览器打开 http://<服务器>:8080" -ForegroundColor Green
Write-Host "首次登录: admin / admin123（上线后立即改密）" -ForegroundColor Yellow
Write-Host "然后在「用户管理」创建公司真实账号，在画面登记真实社员。" -ForegroundColor Yellow
