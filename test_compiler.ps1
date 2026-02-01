$clawdRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$compilerRelease = Join-Path $clawdRoot "tsc-rust\\target\\release\\tsc-rust.exe"
$compilerDebug = Join-Path $clawdRoot "tsc-rust\\target\\debug\\tsc-rust.exe"
$compiler = if (Test-Path $compilerRelease) { $compilerRelease } else { $compilerDebug }
$srcDir = Join-Path $PSScriptRoot "src"
$files = Get-ChildItem -Path $srcDir -Recurse -Filter '*.ts' | Select-Object -First 50
$success = 0
$failure = 0
$errors = @()
$total = $files.Count

Write-Host "Starting compilation test on $total TypeScript files..." -ForegroundColor Cyan
Write-Host ""

for ($i = 0; $i -lt $total; $i++) {
    $file = $files[$i].FullName
    $num = $i + 1
    Write-Host "Testing [$num/$total]: $file" -NoNewline
    
    Push-Location $clawdRoot
    try {
        $output = & $compiler $file 2>&1
    } finally {
        Pop-Location
    }
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host " - SUCCESS" -ForegroundColor Green
        $success++
    } else {
        Write-Host " - FAILED" -ForegroundColor Red
        $failure++
        if ($output) {
            $errorMsg = $output -join '; '
            $errors += $errorMsg
        }
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "COMPILATION STATISTICS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Total files tested: $total"
Write-Host "Successes: $success" -ForegroundColor Green
Write-Host "Failures: $failure" -ForegroundColor Red
$rate = [math]::Round($success / $total * 100, 2)
Write-Host "Success rate: $rate%" -ForegroundColor Cyan

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Yellow
    Write-Host "ERROR FREQUENCY (Top 10)" -ForegroundColor Yellow
    Write-Host "=========================================" -ForegroundColor Yellow
    $errorGroups = $errors | Group-Object | Sort-Object Count -Descending | Select-Object -First 10
    foreach ($err in $errorGroups) {
        Write-Host "$($err.Count)x: $($err.Name.Substring(0, [Math]::Min(100, $err.Name.Length)))" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Green
