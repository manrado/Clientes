# Dev helper: Start a local static server and ensure venv is activated
# Run with: .\dev\start-server.ps1
param(
    [int]$Port = 8000
)

# If running on PowerShell, activate venv if present
$venvPath = Join-Path -Path $PSScriptRoot -ChildPath "..\.venv\Scripts\Activate.ps1" | Resolve-Path -ErrorAction SilentlyContinue
if ($venvPath) {
    Write-Host "Activando entorno virtual..." -ForegroundColor Green
    . $venvPath
} else {
    Write-Host ".venv no encontrado. Sáltando activación" -ForegroundColor Yellow
}

Write-Host "Iniciando servidor en http://localhost:$Port" -ForegroundColor Cyan
python -m http.server $Port
