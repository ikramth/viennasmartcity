# Atlas & Observatoire des Villes Intelligentes

Portail académique collaboratif du **Master 1 — Ingénierie des Villes Intelligentes (Smart Cities Engineering)**, Faculté de Technologie, Université Yahia Farès de Médéa. Sous la direction du Dr. Khoukhi.

Le site est un ensemble de pages statiques (HTML/CSS/JS) avec des fonctions serverless Vercel optionnelles pour la synchronisation cloud.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `index.html` | Portail principal : couverture éditoriale, corpus de la promotion, formulaire de publication, guide de stockage. |
| `portal.css` / `portal.js` | Styles et logique du portail (bilingue FR/AR, filtres, dépôt local ou cloud). |
| `vienna.html` | Étude de cas — Vienne (page autonome, `style.css` + `app.js`). |
| `keb/index.html` | Étude de cas — Ksar El Boukhari × Ville nouvelle de Boughezoul. |
| `assets/`, `smart_*_pics/` | Médias des études de cas. |
| `api/` | Fonctions serverless Vercel (`projects`, `upload`). |
| `supabase/schema.sql` | Schéma SQL pour le stockage Supabase. |
| `scripts/dev.mjs` | Serveur de développement statique sans dépendance. |

## Fonctions du portail

- **Corpus compact** : vue grille (3–4 cartes par ligne) ou vue index (tableau académique), bascule mémorisée dans le navigateur.
- **Recherche, filtres et pagination** : recherche instantanée, filtres par domaine/module, 9/12/24 travaux par page.
- **Bilingue FR/AR** : couverture, cartes, index, pagination, modales et messages.
- **Dépôt protégé** : code de cohorte (`ATLAS_CLASS_CODE`, `M1-MEDEA-2026` par défaut), fichiers limités à PDF, PPTX, PNG, JPG/JPEG (20 Mo) et renommés avec un UUID aléatoire.
- **Stockage optionnel** : local (`localStorage`) ou synchronisé via Vercel Blob / KV / Supabase.

## Démarrage local

```bash
npm install
npm run dev
```

→ <http://localhost:4173>

Le portail démarre en **mode local** : les recherches publiées sont enregistrées dans le `localStorage` du navigateur. Les deux études fondatrices (Vienne, Ksar El Boukhari × Boughezoul) sont toujours présentes. Dans ce mode, un fichier joint est limité à **1,6 Mo** (quota du navigateur) ; au-delà, utilisez un lien externe. La limite de 20 Mo s’applique au stockage cloud.

Pour tester les fonctions API et le stockage cloud, utilisez Vercel CLI :

```bash
npm install -g vercel
vercel link
vercel env pull .env.local
npm run dev:vercel
```

## Activer le corpus partagé (optionnel)

1. **Fichiers** — Vercel → Storage → Create → Blob (accès public) → Connect to project, en cochant « Add a read-write token env var ».
2. **Base de données** — au choix :
   - Upstash Redis / Vercel KV (recommandé) → variables `KV_REST_API_URL` + `KV_REST_API_TOKEN` ;
   - ou Supabase → exécuter `supabase/schema.sql`, puis renseigner `SUPABASE_URL` + `SUPABASE_ANON_KEY`.
3. Redéployer. Le portail détecte automatiquement le stockage via `GET /api/projects` et bascule du mode local au mode synchronisé.

Variables disponibles : voir `.env.example`. `ATLAS_CLASS_CODE` protège les dépôts et les uploads (valeur par défaut : `M1-MEDEA-2026` ; `off` pour ouvrir le portail). En mode local/démo, le même code est vérifié côté navigateur via `LOCAL_CLASS_CODE` dans `portal.js` — il s'agit d'un garde-fou pédagogique, l'application réelle est assurée côté serveur.

## Vérifications

```bash
npm run check        # syntaxe des scripts JS
npm run build:blob   # régénère portal-blob-client.js (upload direct vers Blob)
```

## Licence

Voir `LICENSE`. Crédits médias : `CREDITS.md`.
