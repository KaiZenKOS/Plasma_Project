# Déploiement sur Plasma Testnet

## 1. Déployer les contrats

Tu as besoin d’un wallet avec des XPL (gas) sur le testnet.

```bash
cd plasma_blockchain

# Clé privée du wallet (sans le 0x)
export PRIVATE_KEY=0xbb2744b923b1387dc414e86a23517e3d9a294fde8f04dc72b0ef4199ea595dca

forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testnet-rpc.plasma.to \
  --broadcast \
  --chain-id 9746
```

## 2. Récupérer les adresses déployées

Après un déploiement réussi, Foundry enregistre les adresses dans :

```
plasma_blockchain/broadcast/Deploy.s.sol/9746/run-latest.json
```

- **9746** = chain id du Plasma Testnet.

Dans ce fichier, dans `transactions`, repère les entrées avec `"transactionType":"CREATE"` :

| Contrat         | Champ `contractName`  | Utilisation |
|-----------------|------------------------|-------------|
| MockUSDT        | `MockUSDT`            | Token USDT testnet (optionnel en front) |
| NexusRegistry   | `NexusRegistry`       | `VITE_NEXUS_REGISTRY_ADDRESS` (frontend) |
| **TontineService** | `TontineService`  | **À mettre à la fois en frontend et backend** |
| **EscrowService**  | `EscrowService`   | **EaS on-chain : frontend/backend** |

### Adresse à utiliser partout : TontineService

L’adresse du contrat **TontineService** (champ `contractAddress` de l’entrée `TontineService`) doit être la même en frontend et en backend.

**Frontend** (`plasma_frontend/.env`) :

```env
VITE_TONTINE_CONTRACT_ADDRESS=0x...   # adresse TontineService
VITE_NEXUS_REGISTRY_ADDRESS=0x...     # adresse NexusRegistry
```

**Backend** (`plasma_backend/.env`) :

```env
TONTINE_SERVICE_ADDRESS=0x...         # même adresse que VITE_TONTINE_CONTRACT_ADDRESS
EAS_ESCROW_SERVICE_ADDRESS=0x...      # adresse EscrowService (EaS on-chain)
```

Sans ça, le backfill d’historique (GET /api/history/backfill) ne peut pas interroger le bon contrat et renverra 503.

## 3. Exemple : extraire l’adresse TontineService

Sous Linux/macOS, avec `jq` installé :

```bash
cd plasma_blockchain
jq -r '.transactions[] | select(.contractName=="TontineService") | .contractAddress' \
  broadcast/Deploy.s.sol/9746/run-latest.json
```

Sinon, ouvre `broadcast/Deploy.s.sol/9746/run-latest.json` et cherche `"contractName":"TontineService"` : l’adresse est dans `"contractAddress"` juste au-dessus.

## 4. Déploiement déjà fait (run précédent)

Si tu as déjà déployé (par toi ou un collègue), les adresses sont déjà dans :

- `plasma_blockchain/broadcast/Deploy.s.sol/9746/run-latest.json`

Utilise l’adresse **TontineService** de ce fichier pour `VITE_TONTINE_CONTRACT_ADDRESS` et `TONTINE_SERVICE_ADDRESS`.

**Important :** Les adresses type `0x9fE4...` ou `0xe7f1...` sont des adresses par défaut (Anvil/Hardhat). Sur **Plasma Testnet**, elles ne correspondent à aucun contrat. Si MetaMask affiche *"You're sending call data to an address that isn't a contract"*, c’est que le frontend utilise une mauvaise adresse : remplace-la par celle du fichier broadcast ci-dessus (ex. TontineService = `0x6208d81651d360d22565b692ca015bc0241d6797` pour le run actuel).
