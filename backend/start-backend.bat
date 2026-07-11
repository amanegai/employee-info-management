@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

call "%~dp0..\find-java.bat"
if errorlevel 1 (
    pause
    exit /b 1
)

set "JAR=target\employee-management-1.0.0.jar"
if not exist "%JAR%" (
    echo JAR 不存在，正在打包...
    call mvnw.cmd -q package -DskipTests
    if errorlevel 1 (
        echo [错误] 打包失败
        pause
        exit /b 1
    )
)

echo Using JAVA_HOME: %JAVA_HOME%
echo Using Java: %JAVA_EXE%
echo Backend starting: http://localhost:8080
echo Press Ctrl+C to stop.
"%JAVA_EXE%" -jar "%JAR%"
