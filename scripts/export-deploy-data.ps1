# 本机 PostgreSQL + 附件目录导出，供服务器 Docker 部署迁移
# 用法（项目根目录）: .\scripts\export-deploy-data.ps1
# 需要本机 psql/pg_dump 在 PATH，且库 employee_mgmt 可连接

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$OutDir = Join-Path $Root "deploy-export"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ExportRoot = Join-Path $OutDir $Stamp

New-Item -ItemType Directory -Force -Path $ExportRoot | Out-Null

$DumpFile = Join-Path $ExportRoot "employee_mgmt_backup.sql"
Write-Host "导出数据库 -> $DumpFile" -ForegroundColor Cyan
& pg_dump -U employee_app -h localhost -d employee_mgmt -f $DumpFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "pg_dump 失败。请确认 PostgreSQL 已启动且用户 employee_app 可访问。" -ForegroundColor Red
    exit 1
}

$FilesCandidates = @(
    (Join-Path $Root "backend\data\files"),
    (Join-Path $Root "data\files")
)
$FilesSrc = $FilesCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($FilesSrc) {
    $FilesDest = Join-Path $ExportRoot "files"
    Write-Host "复制附件 $FilesSrc -> $FilesDest" -ForegroundColor Cyan
    Copy-Item -Path $FilesSrc -Destination $FilesDest -Recurse -Force
} else {
    Write-Host "未找到附件目录（backend\data\files 或 data\files），已跳过。" -ForegroundColor Yellow
}

$Readme = @"
部署迁移包（$Stamp）
==================
1. 将整个文件夹拷到服务器部署目录
2. 先 docker compose up -d
3. 导入 SQL:
   Get-Content .\employee_mgmt_backup.sql | docker compose exec -T postgres psql -U employee_app -d employee_mgmt
4. 若有 files 目录:
   docker compose cp .\files\. app:/app/data/files/

详见 docs/deploy-docker.md
"@
Set-Content -Path (Join-Path $ExportRoot "README.txt") -Value $Readme -Encoding UTF8

Write-Host "完成: $ExportRoot" -ForegroundColor Green
