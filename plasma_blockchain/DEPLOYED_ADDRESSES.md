# Adresses déployées sur Plasma Testnet (Chain ID: 9746)

**Dernier déploiement:** `broadcast/Deploy.s.sol/9746/run-latest.json`

## ✅ Contrats déployés (Nouveau déploiement)

| Contrat | Adresse | Usage |
|---------|---------|-------|
| **MockUSDT** | `0xD11e32154f40a24ccA99124A3b51b4cBCECd047F` | Token USDT pour le testnet |
| **NexusRegistry** | `0x14220536ACABfC65543E6129b3d48d2272809CF0` | Registry des services |
| **TontineService** | `0x1666b10Fc2B8b9119fdAeA7D949FBDaA7061bdf5` | Service Tontine principal |
| **EscrowService** | `0x0ca8d8dC6435EEA00CBfFC2f1F0683B2878BD44E` | Service Escrow (EaS) |

## Configuration Frontend (.env)

```env
# --- BLOCKCHAIN (Plasma Testnet) ---
VITE_PLASMA_RPC_URL=https://testnet-rpc.plasma.to
VITE_PLASMA_CHAIN_ID=9746
VITE_PLASMA_CHAIN_NAME=Plasma Testnet
VITE_PLASMA_EXPLORER_URL=https://testnet.plasmascan.to

# --- SMART CONTRACTS (Plasma Testnet) ---
VITE_USDT_ADDRESS=0xD11e32154f40a24ccA99124A3b51b4cBCECd047F
VITE_TONTINE_CONTRACT_ADDRESS=0x1666b10Fc2B8b9119fdAeA7D949FBDaA7061bdf5
VITE_NEXUS_REGISTRY_ADDRESS=0x14220536ACABfC65543E6129b3d48d2272809CF0
VITE_EAS_ESCROW_SERVICE_ADDRESS=0x0ca8d8dC6435EEA00CBfFC2f1F0683B2878BD44E
VITE_ESCROW_CONTRACT_ADDRESS=0x0ca8d8dC6435EEA00CBfFC2f1F0683B2878BD44E
```

## Configuration Backend (.env)

```env
# --- BLOCKCHAIN (Plasma Testnet) ---
RPC_URL=https://testnet-rpc.plasma.to
CHAIN_ID=9746
TONTINE_SERVICE_ADDRESS=0x1666b10Fc2B8b9119fdAeA7D949FBDaA7061bdf5
EAS_ESCROW_SERVICE_ADDRESS=0x0ca8d8dC6435EEA00CBfFC2f1F0683B2878BD44E
USDT_ADDRESS=0xD11e32154f40a24ccA99124A3b51b4cBCECd047F
FROM_BLOCK=0
```

## ✅ Corrections apportées aux contrats

1. **TontineService.sol** : Supprimé `onlyOwner` de `createTontine()` pour permettre aux utilisateurs de créer des tontines
2. **TontineEscrow.sol** : Supprimé `onlyOwner` de `createTontine()` pour permettre aux utilisateurs de créer des tontines avec escrow

## Vérification des contrats

Les contrats sont adaptés au testnet Plasma :
- ✅ Utilisation de l'RPC `https://testnet-rpc.plasma.to`
- ✅ Chain ID: 9746
- ✅ Explorer: `https://testnet.plasmascan.to`
- ✅ Tous les services enregistrés dans NexusRegistry

## Notes

- Les contrats ne peuvent pas être vérifiés sur Sourcify car le Plasma Testnet (Chain ID 9746) n'est pas supporté
- Les adresses sont en minuscules dans les fichiers .env pour la cohérence
- Le script `update-env.ps1` met automatiquement à jour les fichiers .env après chaque déploiement
