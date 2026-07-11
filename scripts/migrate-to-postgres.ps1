# SQLite → PostgreSQL 数据迁移
# 用法: .\scripts\migrate-to-postgres.ps1
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot | Split-Path -Parent

Write-Host "== SQLite → PostgreSQL 数据迁移 ==" -ForegroundColor Cyan

$sqlite = Join-Path $Root "backend\data\employees.db"
if (-not (Test-Path $sqlite)) {
    Write-Error "SQLite 数据库不存在: $sqlite"
}

# 停止占用 8080 的应用（避免迁移期间写入）
$pids = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
    if ($procId -gt 0) {
        Write-Host "停止端口 8080 上的进程 PID $procId ..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}
if ($pids) { Start-Sleep -Seconds 2 }

# 检查 PostgreSQL 服务
$pgService = Get-Service -Name "postgresql-x64-16" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -ne "Running") {
    Write-Host "启动 PostgreSQL 服务..."
    Start-Service "postgresql-x64-16"
    Start-Sleep -Seconds 3
}

# 安装 Python 依赖（如未安装）
python -c "import psycopg2" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "安装 psycopg2-binary ..."
    pip install psycopg2-binary -q
}

Write-Host "Dry-run 预览 ..."
python (Join-Path $Root "scripts\migrate-sqlite-to-postgres.py") --sqlite $sqlite --dry-run
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "执行迁移 ..." -ForegroundColor Yellow
python (Join-Path $Root "scripts\migrate-sqlite-to-postgres.py") --sqlite $sqlite
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "迁移完成。可用以下命令启动 PostgreSQL 模式:" -ForegroundColor Green
Write-Host "  .\start-app-postgres.ps1"
