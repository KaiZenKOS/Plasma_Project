# Script PowerShell pour mettre à jour les .env avec les adresses déployées
$broadcastFile = "broadcast/Deploy.s.sol/9746/run-latest.json"

if (-not (Test-Path $broadcastFile)) {
    Write-Host "Erreur: Fichier de déploiement non trouvé: $broadcastFile" -ForegroundColor Red
    exit 1
}

$json = Get-Content $broadcastFile | ConvertFrom-Json

$addresses = @{}
foreach ($tx in $json.transactions) {
    if ($tx.transactionType -eq "CREATE") {
        $addresses[$tx.contractName] = $tx.contractAddress
    }
}

Write-Host "`n=== Adresses déployées sur Plasma Testnet (9746) ===" -ForegroundColor Green
foreach ($name in $addresses.Keys | Sort-Object) {
    Write-Host "$name : $($addresses[$name])" -ForegroundColor Cyan
}

# Mise à jour du .env frontend
$frontendEnv = "../plasma_frontend/.env"
if (Test-Path $frontendEnv) {
    Write-Host "`nMise à jour de $frontendEnv..." -ForegroundColor Yellow
    $content = Get-Content $frontendEnv -Raw
    
    # Mise à jour des adresses
    $lines = $content -split "`n"
    $newLines = @()
    foreach ($line in $lines) {
        if ($line -match "^VITE_USDT_ADDRESS=" -and $addresses["MockUSDT"]) {
            $newLines += "VITE_USDT_ADDRESS=$($addresses['MockUSDT'])"
        }
        elseif ($line -match "^VITE_NEXUS_REGISTRY_ADDRESS=" -and $addresses["NexusRegistry"]) {
            $newLines += "VITE_NEXUS_REGISTRY_ADDRESS=$($addresses['NexusRegistry'])"
        }
        elseif ($line -match "^VITE_TONTINE_CONTRACT_ADDRESS=" -and $addresses["TontineService"]) {
            $newLines += "VITE_TONTINE_CONTRACT_ADDRESS=$($addresses['TontineService'])"
        }
        elseif ($line -match "^VITE_EAS_ESCROW_SERVICE_ADDRESS=" -and $addresses["EscrowService"]) {
            $newLines += "VITE_EAS_ESCROW_SERVICE_ADDRESS=$($addresses['EscrowService'])"
        }
        elseif ($line -match "^VITE_ESCROW_CONTRACT_ADDRESS=" -and $addresses["EscrowService"]) {
            $newLines += "VITE_ESCROW_CONTRACT_ADDRESS=$($addresses['EscrowService'])"
        }
        else {
            $newLines += $line
        }
    }
    $content = $newLines -join "`n"
    
    Set-Content -Path $frontendEnv -Value $content -NoNewline
    Write-Host "✓ Frontend .env mis à jour" -ForegroundColor Green
} else {
    Write-Host "⚠ Fichier $frontendEnv non trouvé" -ForegroundColor Yellow
}

# Mise à jour du .env backend
$backendEnv = "../plasma_backend/.env"
if (Test-Path $backendEnv) {
    Write-Host "`nMise à jour de $backendEnv..." -ForegroundColor Yellow
    $content = Get-Content $backendEnv -Raw
    
    $lines = $content -split "`n"
    $newLines = @()
    foreach ($line in $lines) {
        if ($line -match "^TONTINE_SERVICE_ADDRESS=" -and $addresses["TontineService"]) {
            $newLines += "TONTINE_SERVICE_ADDRESS=$($addresses['TontineService'])"
        }
        elseif ($line -match "^EAS_ESCROW_SERVICE_ADDRESS=" -and $addresses["EscrowService"]) {
            $newLines += "EAS_ESCROW_SERVICE_ADDRESS=$($addresses['EscrowService'])"
        }
        elseif ($line -match "^USDT_ADDRESS=" -and $addresses["MockUSDT"]) {
            $newLines += "USDT_ADDRESS=$($addresses['MockUSDT'])"
        }
        else {
            $newLines += $line
        }
    }
    $content = $newLines -join "`n"
    
    Set-Content -Path $backendEnv -Value $content -NoNewline
    Write-Host "✓ Backend .env mis à jour" -ForegroundColor Green
} else {
    Write-Host "⚠ Fichier $backendEnv non trouvé" -ForegroundColor Yellow
}

Write-Host "`n=== Configuration recommandée ===" -ForegroundColor Green
Write-Host "Frontend (.env):" -ForegroundColor Cyan
Write-Host "  VITE_PLASMA_RPC_URL=https://testnet-rpc.plasma.to"
Write-Host "  VITE_PLASMA_CHAIN_ID=9746"
Write-Host "  VITE_PLASMA_CHAIN_NAME=Plasma Testnet"
Write-Host "  VITE_PLASMA_EXPLORER_URL=https://testnet.plasmascan.to"
Write-Host "  VITE_USDT_ADDRESS=$($addresses['MockUSDT'])"
Write-Host "  VITE_TONTINE_CONTRACT_ADDRESS=$($addresses['TontineService'])"
Write-Host "  VITE_NEXUS_REGISTRY_ADDRESS=$($addresses['NexusRegistry'])"
Write-Host "  VITE_EAS_ESCROW_SERVICE_ADDRESS=$($addresses['EscrowService'])"
Write-Host "  VITE_ESCROW_CONTRACT_ADDRESS=$($addresses['EscrowService'])"
Write-Host "`nBackend (.env):" -ForegroundColor Cyan
Write-Host "  RPC_URL=https://testnet-rpc.plasma.to"
Write-Host "  CHAIN_ID=9746"
Write-Host "  TONTINE_SERVICE_ADDRESS=$($addresses['TontineService'])"
Write-Host "  EAS_ESCROW_SERVICE_ADDRESS=$($addresses['EscrowService'])"
Write-Host "  USDT_ADDRESS=$($addresses['MockUSDT'])"

