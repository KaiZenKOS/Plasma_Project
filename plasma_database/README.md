# Plasma Database

Schéma PostgreSQL hybride RGPD : cœur (users) + tables modulaires (services) + cache blockchain.

## Avec Docker (recommandé)

Depuis le dossier **plasma_database** :

```bash
cd plasma_database
docker compose up -d
```

- **postgres** : port **5432**. Le script `init.sql` est exécuté au premier démarrage.
- **pgAdmin** : port **5050** (interface web).

**1. Connexion à l’interface pgAdmin :**
- URL : http://localhost:5050
- Email : `admin@example.com`
- Mot de passe : **`admin`**

**2. Fenêtre « Connect to Server » (connexion au serveur PostgreSQL) :**  
Cette fenêtre demande le mot de passe de l’**utilisateur base de données** `plasma`, pas celui de pgAdmin.
- **À saisir dans le champ mot de passe : `plasma`** (et non pas `admin`).
- Cocher « Save Password » pour ne pas le redemander.
- Puis cliquer sur OK.

Si l’authentification échoue avec `plasma`, la base a peut‑être été créée avec un autre mot de passe. Dans ce cas : `docker compose down -v` puis `docker compose up -d` (recrée les volumes avec le mot de passe du `docker-compose.yml`).

Le backend en local se connecte à Postgres avec : `postgresql://plasma:plasma@localhost:5432/plasma`.

## Sans Docker

Créer la base puis exécuter le script :

```bash
createdb plasma
psql -d plasma -f init.sql
```

## Tables

- **users** — Cœur identité (wallet_address PK, pseudo, reputation_score, kyc_validated).
- **services_registry** — Liste des services (nom, type, adresse contrat).
- **tontine_groups** — Configuration des tontines (fréquence, montant, nantissement).
- **tontine_members** — Lien user–tontine (turn_position, collateral_status).
- **blockchain_events** — Cache des tx (hash, block, method, from, to) pour affichage rapide.

Pour ajouter un service (ex: Prêt) : ajouter une table dédiée (ex: `loans`) et l’enregistrer dans `services_registry` ; le cœur `users` ne change pas.
