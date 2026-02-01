@echo off
setlocal enabledelayedexpansion

for %%I in ("%~dp0..\..") do set "CLAWD_ROOT=%%~fI"
for %%I in ("%~dp0.") do set "OPENCLAW_ROOT=%%~fI"
set "COMPILER_RELEASE=%CLAWD_ROOT%\tsc-rust\target\release\tsc-rust.exe"
set "COMPILER_DEBUG=%CLAWD_ROOT%\tsc-rust\target\debug\tsc-rust.exe"
if exist "%COMPILER_RELEASE%" (set "COMPILER=%COMPILER_RELEASE%") else (set "COMPILER=%COMPILER_DEBUG%")
set "SRC_DIR=%OPENCLAW_ROOT%\src"
set COUNT=0
set SUCCESS=0
set FAILURE=0
set "ERRFILE=%TEMP%\tsc_errors.txt"
>"%ERRFILE%" echo.

echo Starting compilation test on 50 TypeScript files...
echo.

pushd "%CLAWD_ROOT%"
for /r "%SRC_DIR%" %%f in (*.ts) do (
    if !COUNT! lss 50 (
        set /a COUNT+=1
        echo Testing [!COUNT!/50]: %%f
        "%COMPILER%" "%%f" >nul 2>&1
        if !errorlevel! equ 0 (
            echo   SUCCESS
            set /a SUCCESS+=1
        ) else (
            echo   FAILED
            set /a FAILURE+=1
            "%COMPILER%" "%%f" 2>&1 >>"%ERRFILE%"
            echo --- >>"%ERRFILE%"
        )
    )
)
popd

echo.
echo =========================================
echo COMPILATION STATISTICS
echo =========================================
echo Total files tested: %COUNT%
echo Successes: %SUCCESS%
echo Failures: %FAILURE%
set /a RATE=%SUCCESS%*100/%COUNT%
echo Success rate: %RATE%%%
echo.
echo =========================================
echo Error log saved to: %ERRFILE%
echo =========================================

endlocal
