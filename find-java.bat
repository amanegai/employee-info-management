@echo off
rem 查找 Java，设置 JAVA_EXE 与 JAVA_HOME（供 mvnw / java -jar 使用）
set "JAVA_EXE="
set "JAVA_HOME="

if defined JAVA_HOME (
    if exist "%JAVA_HOME%\bin\java.exe" (
        set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
        exit /b 0
    )
    set "JAVA_HOME="
)

where java >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%I in ('where java 2^>nul') do (
        if exist "%%~fI" (
            set "JAVA_EXE=%%~fI"
            for %%H in ("%%~fI\..\..") do set "JAVA_HOME=%%~fH"
            exit /b 0
        )
    )
)

for /d %%J in ("C:\Program Files\Eclipse Adoptium\jdk-*") do (
    if exist "%%~J\bin\java.exe" (
        set "JAVA_EXE=%%~J\bin\java.exe"
        set "JAVA_HOME=%%~J"
        exit /b 0
    )
)

for /d %%J in ("C:\Program Files\Java\jdk-*") do (
    if exist "%%~J\bin\java.exe" (
        set "JAVA_EXE=%%~J\bin\java.exe"
        set "JAVA_HOME=%%~J"
        exit /b 0
    )
)

for /d %%J in ("C:\Program Files\Microsoft\jdk-*") do (
    if exist "%%~J\bin\java.exe" (
        set "JAVA_EXE=%%~J\bin\java.exe"
        set "JAVA_HOME=%%~J"
        exit /b 0
    )
)

echo [错误] 找不到 Java（JDK 21）。
echo 请安装 Eclipse Temurin JDK 21，或设置 JAVA_HOME 环境变量。
exit /b 1
