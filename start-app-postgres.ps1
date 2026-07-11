# PostgreSQL プロファイルで起動（Flyway + employee_mgmt）
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Resolve-JavaExe {
    if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
        return "$env:JAVA_HOME\bin\java.exe"
    }
    $cmd = Get-Command java -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw "Java（JDK 21）が見つかりません。"
}

function Stop-ExistingServerOnPort {
    param([int]$Port = 8080)
    $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        if (-not $procId -or $procId -le 0) { continue }
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    if ($pids) { Start-Sleep -Seconds 2 }
}

Write-Host "== 社員情報管理 起動 (PostgreSQL) ==" -ForegroundColor Cyan
Write-Host "※ start-app.ps1 と同等です。PostgreSQL がデフォルトです。" -ForegroundColor Gray

Set-Location "$Root\frontend"
if (-not (Test-Path node_modules)) { npm install }
Write-Host "フロントエンドをビルドしています..."
npm run build

Set-Location "$Root\backend"
$jar = Join-Path (Get-Location) "target\employee-management-1.0.0.jar"
$javaExe = Resolve-JavaExe

Stop-ExistingServerOnPort -Port 8080

$srcMarker = Get-ChildItem -Path "src\main\java", "src\main\resources" -Recurse -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
$jarNeedsRebuild = -not (Test-Path $jar) -or (Get-Item $jar).Length -lt 10MB
if (-not $jarNeedsRebuild -and $srcMarker -and $srcMarker.LastWriteTime -gt (Get-Item $jar).LastWriteTime) {
    $jarNeedsRebuild = $true
}

if ($jarNeedsRebuild) {
    Write-Host "バックエンドをパッケージしています..." -ForegroundColor Cyan
    & .\mvnw.cmd -q package -DskipTests
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

Stop-ExistingServerOnPort -Port 8080
Write-Host "起動中: http://localhost:8080  (DB: PostgreSQL employee_mgmt)" -ForegroundColor Green
Write-Host "停止するには Ctrl+C を押してください。"
& $javaExe -jar $jar
