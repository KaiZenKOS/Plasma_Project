# Plasma Backend

Backend orchestrateur modulaire : routes Plug & Play, scoring déterministe (sans IA), indexer blockchain (Viem), worker assurance paramétrique (mock OpenWeatherMap).

## Base de données (Docker)

À la racine du projet, lancer PostgreSQL :

```bash
docker compose up -d postgres
```

Puis créer un `.env` avec (valeurs par défaut pour Docker) :

```bash
cp .env.example .env
# DATABASE_URL=postgresql://plasma:plasma@localhost:5432/plasma déjà indiqué
```

## Setup local

```bash
npm install
cp .env.example .env
# Renseigner RPC_URL, TONTINE_SERVICE_ADDRESS si besoin
```

## Lancer tout avec Docker (Postgres + Backend)

À la racine du projet :

```bash
docker compose up -d
```

Le backend écoute sur http://localhost:3000 et utilise la base `postgres` du réseau Docker.

## Scripts

- `npm run dev` — API en mode watch
- `npm run start` — API (après build)
- `npm run worker` — Indexer blockchain (ContributionPaid, CollateralSlashed)
- `npm run worker:insurance` — CRON assurance météo (mock)

## Routes

- `GET /api/core/user/:address` — Profil utilisateur
- `GET /api/core/user/:address/score` — Score calculé (déterministe)
- `PUT /api/core/user/:address` — Upsert utilisateur
- `GET /api/tontine/groups` — Liste groupes tontine
- `GET /api/tontine/groups/:id` — Détail groupe + membres
- `GET /api/tontine/events` — Cache événements blockchain

## Ajouter un service (ex: Prêt)

1. Déployer `LoanService.sol`, l’enregistrer dans NexusRegistry.
2. Ajouter table `loans` en BDD.
3. Ajouter route `/api/loan` et fichier `routes/loan.ts`.
4. Le cœur (users, score, wallet) reste inchangé.
