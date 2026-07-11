# フロントエンドをビルドし、java -jar で 8080 ポート起動（Maven グローバル不要）
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Resolve-JavaExe {
    if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
        return "$env:JAVA_HOME\bin\java.exe"
    }

    $cmd = Get-Command java -ErrorAction SilentlyContinue
    if ($cmd) {
        $javaExe = $cmd.Source
        $env:JAVA_HOME = (Resolve-Path (Join-Path (Split-Path $javaExe -Parent) "..")).Path
        return $javaExe
    }

    $patterns = @(
        "C:\Program Files\Eclipse Adoptium\jdk-*",
        "C:\Program Files\Java\jdk-*",
        "C:\Program Files\Microsoft\jdk-*"
    )
    foreach ($pattern in $patterns) {
        $home = Get-ChildItem $pattern -ErrorAction SilentlyContinue |
            Sort-Object { $_.FullName } -Descending |
            Select-Object -First 1
        if ($home -and (Test-Path "$($home.FullName)\bin\java.exe")) {
            $env:JAVA_HOME = $home.FullName
            return "$($home.FullName)\bin\java.exe"
        }
    }

    throw "Java（JDK 21）が見つかりません。Eclipse Temurin JDK 21 をインストールするか、JAVA_HOME を設定してください。"
}

function Stop-ExistingServerOnPort {
    param([int]$Port = 8080)

    $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($procId in $pids) {
        if (-not $procId -or $procId -le 0) { continue }
        Write-Host "ポート $Port を使用中のプロセス (PID $procId) を停止しています..." -ForegroundColor Yellow
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }

    if ($pids) {
        Start-Sleep -Seconds 2
    }
}

Write-Host "== 社員情報管理 起動 ==" -ForegroundColor Cyan

Set-Location "$Root\frontend"
if (-not (Test-Path node_modules)) {
    Write-Host "フロントエンドの依存関係をインストールしています..."
    npm install
}
Write-Host "フロントエンドをビルドしています..."
npm run build

Set-Location "$Root\backend"
$jar = Join-Path (Get-Location) "target\employee-management-1.0.0.jar"
$javaExe = Resolve-JavaExe
$srcMarker = Get-ChildItem -Path "src\main\java", "src\main\resources" -Recurse -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
$jarNeedsRebuild = -not (Test-Path $jar) -or (Get-Item $jar).Length -lt 10MB
if (-not $jarNeedsRebuild -and $srcMarker -and $srcMarker.LastWriteTime -gt (Get-Item $jar).LastWriteTime) {
    $jarNeedsRebuild = $true
}

Stop-ExistingServerOnPort -Port 8080

if ($jarNeedsRebuild) {
    Write-Host ""
    Write-Host "バックエンドをパッケージしています..." -ForegroundColor Cyan
    Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Gray
    & .\mvnw.cmd -q package -DskipTests
    if ($LASTEXITCODE -ne 0) {
        Write-Host "バックエンドのパッケージに失敗しました。" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "既存の JAR を使用します（パッケージをスキップ）" -ForegroundColor Gray
}

if (-not (Test-Path $jar)) {
    Write-Host "JAR が見つかりません: $jar" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Java: $javaExe" -ForegroundColor Gray
Stop-ExistingServerOnPort -Port 8080
Write-Host "起動中: http://localhost:8080  (DB: PostgreSQL employee_mgmt)" -ForegroundColor Green
Write-Host "停止するには Ctrl+C を押してください。"
& $javaExe -jar $jar
