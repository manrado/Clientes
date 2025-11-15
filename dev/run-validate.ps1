# Run validation in PowerShell
# Usage: .\dev\run-validate.ps1

$venvActivate = Join-Path -Path $PSScriptRoot -ChildPath "..\.venv\Scripts\Activate.ps1" | Resolve-Path -ErrorAction SilentlyContinue
if ($venvActivate) {
    . $venvActivate
} else {
    Write-Host ".venv not found. Continuing without activation" -ForegroundColor Yellow
}

if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Running Python validation..." -ForegroundColor Green
    python tools/validate_performance.py
} else {
    Write-Host "Python not found in PATH; trying WSL bash script if available..." -ForegroundColor Yellow
    if (Get-Command wsl -ErrorAction SilentlyContinue) {
        wsl bash validate-performance.sh
    } else {
        Write-Host "Neither Python nor WSL are available. Install Python or WSL/Git Bash to run validations." -ForegroundColor Red
    }
}
