# Plasma Backend — Scripts de test

Scripts pour tester les endpoints du backend Plasma (sans framework de test).

## Prérequis

- Backend lancé : `cd plasma_backend && npm run dev`
- Base PostgreSQL (ex. `cd plasma_database && docker compose up -d`)

## Utilisation

```bash
# Variable d'environnement optionnelle (défaut : http://localhost:3000)
export BASE_URL=http://localhost:3000

# Lancer tous les tests
./run_all.sh

# Ou exécuter un script individuel
./health.sh
./core_user.sh
./tontine.sh
```

## Scripts

| Script          | Description                                      |
|-----------------|--------------------------------------------------|
| `health.sh`    | GET /health                                      |
| `core_user.sh` | PUT/GET user, GET score (core API)                |
| `tontine.sh`   | GET groups, GET group/:id, GET events             |
| `run_all.sh`   | Exécute tous les scripts et affiche le résumé    |

## Adresse de test

Les scripts utilisent l’adresse wallet de test : `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
