# Plasma Nexus - Frontend

Interface Plasma Nexus (React + TypeScript + Vite). Utilise le backend Plasma pour le profil, le score et les tontines.

## Resume fonctionnel (Plasma Nexus)

### 1. Gestion d'identite & confiance (le coeur)

- Connexion non-custodial via wallet (ou email Privy), sans mot de passe stocke.
- Profil pseudo-anonyme pour proteger l'identite civile (GDPR friendly).
- Score de reputation (ex: 100/100) calcule selon l'historique de paiement.
- Simulation KYC (upload fictif) pour limiter les attaques Sybil.

### 2. Service Tontine (epargne circulaire)

- Configuration flexible: montant, frequence (hebdo/mensuel), participants.
- Stablecoins uniquement (USDC/USDT).
- Nantissement (collateral) obligatoire pour rejoindre un groupe.
- Pattern Pull over Push: le gagnant reclame ses fonds (pas d'envoi automatique).
- Cercle restreint sur invitation privee.

### 3. Service Escrow (paiement securise)

- Verrouillage des fonds: le client depose les USDT avant le travail.
- Liberation sur preuve: lien/fichier valide par le client.
- Gasless (Paymaster): le freelance ne paie pas les frais de gaz.

### 4. Service Assurance (protection communautaire)

- Fonds mutuel alimente par micro-taxe (ex: 1%) sur Tontine/Escrow.
- Declenchement automatise via backend + oracle.
- UI: File Claim -> Claim Processing -> Funds Received.

### 5. Architecture technique hybride

- Off-chain (SQL): pseudos, scores, donnees modifiables (droit a l'oubli).
- On-chain (Blockchain): preuves de transactions et hashs anonymes.
- Miroir d'evenements blockchain en base pour affichage instantane.

## Lancer avec le backend

1. Démarrer la base : `cd plasma_database && docker compose up -d`
2. Démarrer le backend : `cd plasma_backend && npm run dev`
3. Démarrer le frontend : `npm run dev`

En dev, Vite proxy redirige `/api` vers `http://localhost:3000`. Pour une autre URL backend, définir `VITE_API_URL` (ex. `VITE_API_URL=http://localhost:3000/api`).

## Variables front (hybride)

Créer un `.env` a partir de [plasma_frontend/.env.example](plasma_frontend/.env.example) pour les lectures blockchain :

- `VITE_PLASMA_RPC_URL`
- `VITE_PLASMA_CHAIN_ID`
- `VITE_PLASMA_CHAIN_NAME`
- `VITE_PLASMA_EXPLORER_URL`
- `VITE_USDT_ADDRESS`

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
