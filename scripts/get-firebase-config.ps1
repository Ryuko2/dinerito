# Script para obtener la configuración de Firebase y actualizar .env.local
# Ejecutar en PowerShell: .\scripts\get-firebase-config.ps1

$projectId = "sheriff-de-gastos"
$envPath = Join-Path $PSScriptRoot "..\\.env.local"

Write-Host "`n=== Configuracion Firebase - Sheriff de Gastos ===" -ForegroundColor Cyan
Write-Host ""

# Verificar login
Write-Host "Verificando autenticacion..." -ForegroundColor Yellow
$projects = firebase projects:list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No estas logueado en Firebase." -ForegroundColor Red
    Write-Host "Ejecuta en una terminal: firebase login" -ForegroundColor Yellow
    Write-Host "Luego ejecuta este script de nuevo." -ForegroundColor Yellow
    exit 1
}

Write-Host "Obteniendo SDK config..." -ForegroundColor Yellow
$configOutput = firebase apps:sdkconfig WEB --project $projectId 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No se pudo obtener la config. Verifica que existe una app WEB en el proyecto." -ForegroundColor Red
    Write-Host "Puedes crear una con: firebase apps:create WEB 'Sheriff de Gastos' --project $projectId" -ForegroundColor Yellow
    exit 1
}

# Intentar parsear JSON (puede venir envuelto en result o sdkConfig)
try {
    $json = $configOutput | ConvertFrom-Json
    $config = if ($json.result) { $json.result } elseif ($json.sdkConfig) { $json.sdkConfig } else { $json }
    $apiKey = $config.apiKey
    $authDomain = $config.authDomain
    $storageBucket = $config.storageBucket
    $messagingSenderId = $config.messagingSenderId
    $appId = $config.appId
    if (-not $authDomain) { $authDomain = "$projectId.firebaseapp.com" }
    if (-not $storageBucket) { $storageBucket = "$projectId.appspot.com" }
    
    if ($apiKey -and $appId) {
        $envContent = @"
# Configuracion Firebase - Sheriff de Gastos (generado automaticamente)
VITE_FIREBASE_API_KEY=$apiKey
VITE_FIREBASE_AUTH_DOMAIN=$authDomain
VITE_FIREBASE_PROJECT_ID=$projectId
VITE_FIREBASE_STORAGE_BUCKET=$storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=$messagingSenderId
VITE_FIREBASE_APP_ID=$appId
"@
        Set-Content -Path $envPath -Value $envContent -Encoding UTF8
        Write-Host "`n.env.local actualizado correctamente!" -ForegroundColor Green
        Write-Host "Puedes ejecutar: npm run dev" -ForegroundColor Cyan
    } else {
        throw "Config incompleta"
    }
} catch {
    Write-Host "`nConfig obtenida (formato no parseable automaticamente):" -ForegroundColor Yellow
    Write-Host $configOutput
    Write-Host "`nCopia manualmente los valores a .env.local:" -ForegroundColor Cyan
    Write-Host "  apiKey -> VITE_FIREBASE_API_KEY"
    Write-Host "  authDomain -> VITE_FIREBASE_AUTH_DOMAIN"
    Write-Host "  projectId -> VITE_FIREBASE_PROJECT_ID"
    Write-Host "  storageBucket -> VITE_FIREBASE_STORAGE_BUCKET"
    Write-Host "  messagingSenderId -> VITE_FIREBASE_MESSAGING_SENDER_ID"
    Write-Host "  appId -> VITE_FIREBASE_APP_ID"
}
