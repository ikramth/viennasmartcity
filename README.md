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
| `api/` | Fonctions serverless Vercel (`projects`, `announcements`, `upload`, helpers `_atlas`). |
| `cours/` | Les 10 supports de cours PDF du dépôt, générés par `scripts/make-course-pack.mjs`. |
| `supabase/schema.sql` | Schéma SQL pour le stockage Supabase. |
| `scripts/dev.mjs` | Serveur de développement statique sans dépendance. |
| `scripts/make-course-pack.mjs` | Régénère les 10 supports de cours PDF. |

## Fonctions du portail

- **Corpus compact** : vue grille (3–4 cartes par ligne) ou vue index (tableau académique), bascule mémorisée dans le navigateur.
- **Recherche, filtres et pagination** : recherche instantanée, filtres par domaine/module, 9/12/24 travaux par page.
- **Bilingue FR/AR** : couverture, cartes, index, pagination, modales et messages.
- **Suppression par l'auteur** : chaque navigateur reçoit un jeton anonyme (`atlas_owner_token`). Seul le navigateur qui a publié un travail voit « Supprimer » ; le serveur vérifie le hachage SHA-256 du jeton avant de supprimer la fiche et son fichier Blob.
- **Espace enseignant** : accès avec le code enseignant (`TEACHER_CODE`, `PROF-MEDEA-2026` par défaut). Il peut publier ou supprimer des supports de cours, des annonces et des notes sur un travail, et supprimer n'importe quelle fiche.
- **Dépôt protégé** : code de section (`ATLAS_CLASS_CODE`, `M1-MEDEA-2026` par défaut), fichiers limités à PDF, PPTX, PNG, JPG/JPEG (20 Mo) et renommés avec un UUID aléatoire.
- **Stockage optionnel** : local (`localStorage`) ou synchronisé via Vercel Blob / KV / Supabase.
- **Nettoyage des tests** : au premier appel API après déploiement, les fiches de test reconnaissables (titres exacts `test`, `demo`, `essai`, `barcelone`, etc.) et leurs fichiers Blob sont supprimés une seule fois (marqueur `atlas:clean-slate:v1` / `atlas/clean-slate.json`). Les travaux légitimes et les deux études fondatrices ne sont jamais touchés.

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

Variables disponibles : voir `.env.example`. `ATLAS_CLASS_CODE` protège les dépôts et les uploads (valeur par défaut : `M1-MEDEA-2026` ; `off` pour ouvrir le portail). `TEACHER_CODE` (alias `ATLAS_TEACHER_CODE`) ouvre l'espace enseignant (valeur par défaut : `PROF-MEDEA-2026`). En mode local/démo, les mêmes codes sont vérifiés côté navigateur via `LOCAL_CLASS_CODE` et `LOCAL_TEACHER_CODE` dans `portal.js` — il s'agit d'un garde-fou pédagogique, l'application réelle est assurée côté serveur.

## Vérifications

```bash
npm run check        # syntaxe des scripts JS et des fonctions API
npm run build:blob   # régénère portal-blob-client.js (upload direct vers Blob)
node scripts/make-course-pack.mjs   # régénère les 10 supports PDF dans cours/
```

## Licence

Voir `LICENSE`. Crédits médias : `CREDITS.md`.
