# Script simple pour mettre à jour les .env avec les nouvelles adresses
$broadcastFile = "broadcast/Deploy.s.sol/9746/run-latest.json"

if (-not (Test-Path $broadcastFile)) {
    Write-Host "Erreur: Fichier de déploiement non trouvé" -ForegroundColor Red
    exit 1
}

$json = Get-Content $broadcastFile -Raw | ConvertFrom-Json

$addresses = @{}
foreach ($tx in $json.transactions) {
    if ($tx.transactionType -eq "CREATE") {
        $addresses[$tx.contractName] = $tx.contractAddress
    }
}

Write-Host "`n=== Nouvelles adresses déployées ===" -ForegroundColor Green
foreach ($name in $addresses.Keys | Sort-Object) {
    Write-Host "$name : $($addresses[$name])" -ForegroundColor Cyan
}

# Frontend .env
$frontendEnv = "../plasma_frontend/.env"
if (Test-Path $frontendEnv) {
    $lines = Get-Content $frontendEnv
    $newLines = @()
    foreach ($line in $lines) {
        if ($line -match "^VITE_USDT_ADDRESS=") {
            $newLines += "VITE_USDT_ADDRESS=$($addresses['MockUSDT'])"
        }
        elseif ($line -match "^VITE_NEXUS_REGISTRY_ADDRESS=") {
            $newLines += "VITE_NEXUS_REGISTRY_ADDRESS=$($addresses['NexusRegistry'])"
        }
        elseif ($line -match "^VITE_TONTINE_CONTRACT_ADDRESS=") {
            $newLines += "VITE_TONTINE_CONTRACT_ADDRESS=$($addresses['TontineService'])"
        }
        elseif ($line -match "^VITE_EAS_ESCROW_SERVICE_ADDRESS=") {
            $newLines += "VITE_EAS_ESCROW_SERVICE_ADDRESS=$($addresses['EscrowService'])"
        }
        elseif ($line -match "^VITE_ESCROW_CONTRACT_ADDRESS=") {
            $newLines += "VITE_ESCROW_CONTRACT_ADDRESS=$($addresses['EscrowService'])"
        }
        else {
            $newLines += $line
        }
    }
    Set-Content -Path $frontendEnv -Value ($newLines -join "`n")
    Write-Host "`n✓ Frontend .env mis à jour" -ForegroundColor Green
}

# Backend .env
$backendEnv = "../plasma_backend/.env"
if (Test-Path $backendEnv) {
    $lines = Get-Content $backendEnv
    $newLines = @()
    foreach ($line in $lines) {
        if ($line -match "^TONTINE_SERVICE_ADDRESS=") {
            $newLines += "TONTINE_SERVICE_ADDRESS=$($addresses['TontineService'])"
        }
        elseif ($line -match "^EAS_ESCROW_SERVICE_ADDRESS=") {
            $newLines += "EAS_ESCROW_SERVICE_ADDRESS=$($addresses['EscrowService'])"
        }
        elseif ($line -match "^USDT_ADDRESS=") {
            $newLines += "USDT_ADDRESS=$($addresses['MockUSDT'])"
        }
        else {
            $newLines += $line
        }
    }
    Set-Content -Path $backendEnv -Value ($newLines -join "`n")
    Write-Host "✓ Backend .env mis à jour" -ForegroundColor Green
}

Write-Host "`n=== Configuration mise à jour ===" -ForegroundColor Green

