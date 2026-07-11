@echo off

chcp 65001 >nul

setlocal



cd /d "%~dp0"



echo == 社員情報管理 起動 ==

echo.



cd frontend

if not exist node_modules (

    echo フロントエンドの依存関係をインストールしています...

    call npm install

    if errorlevel 1 goto :error

)

echo フロントエンドをビルドしています...

call npm run build

if errorlevel 1 goto :error



cd ..\backend



call "%~dp0find-java.bat"

if errorlevel 1 goto :error



set "JAR=target\employee-management-1.0.0.jar"

set "NEED_PACKAGE=1"

if exist "%JAR%" (

    for %%F in ("%JAR%") do if %%~zF GTR 10000000 set "NEED_PACKAGE=0"

)



if "%NEED_PACKAGE%"=="1" (

    echo.

    echo バックエンドをパッケージしています...

    echo JAVA_HOME: %JAVA_HOME%

    call mvnw.cmd -q package -DskipTests

    if errorlevel 1 (

        echo.

        echo [エラー] バックエンドのパッケージに失敗しました。

        goto :error

    )

) else (

    echo.

    echo 既存の JAR を使用します（パッケージをスキップ）

)



if not exist "%JAR%" (

    echo.

    echo [エラー] JAR が見つかりません: %JAR%

    goto :error

)



for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo ポート 8080 のプロセス PID %%a を停止しています...
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 /nobreak >nul



echo Java: %JAVA_EXE%

echo 起動中: http://localhost:8080

echo 停止するには Ctrl+C を押してください。

echo.

"%JAVA_EXE%" -jar "%JAR%"

goto :end



:error

echo.

echo 起動に失敗しました。

pause

exit /b 1



:end

pause


