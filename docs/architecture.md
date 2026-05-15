# Architecture — vue d'ensemble

Document de référence : stack, environnements, mapping branches/DB/URLs.

## Stack technique

| Couche | Techno |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components) |
| Langage | TypeScript |
| ORM | Prisma (avec adapter `@prisma/adapter-neon`) |
| Base de données | PostgreSQL (Neon — serverless + branching) en région `aws-eu-central-1` |
| Auth | Auth.js / NextAuth (`@auth/prisma-adapter`) |
| Hébergement | Vercel (Fluid Compute, Node.js 24) — Functions pinnées en `fra1` (vercel.json) |
| CI/CD | GitHub Actions |

## Les trois environnements

| Environnement | URL | Branche Git | Branche Neon | Accès |
|---|---|---|---|---|
| **Production** | todo.ptitom.eu | `main` | `main` | Public |
| **QA / Qualification** | qa-todo.ptitom.eu | `qa` | `qa` | Public (pour tests) |
| **Développement** | localhost:3000 | `dev` ou `feature/*` | `dev` (ou `preview/pr-<N>` en CI) | Local uniquement |

### Flux de promotion du code

```
feature/xxx → qa → main
    (PR)    (PR)
```

Chaque transition passe par une Pull Request : branches protégées, push direct interdit.

## Branches Neon — philosophie

La **branche Neon `main`** est la source de vérité des données utilisateurs. Toutes les autres branches Neon sont des **copies à un instant donné** de `main`.

| Branche Neon | Rôle | Réinitialisée quand ? |
|---|---|---|
| `main` | Données prod en live | Jamais (source de vérité) |
| `qa` | Copie de prod pour tests QA | À chaque push sur la branche Git `qa` |
| `dev` | Copie de prod pour dev local | Manuellement au début de chaque feature |
| `preview/pr-<N>` | Copie éphémère par PR | Créée à l'ouverture, supprimée à la fermeture |

Cette approche garantit que **chaque test se fait sur des données réalistes** tout en isolant complètement les environnements.

## Domaines

| Domaine | Pointe vers |
|---|---|
| `todo.ptitom.eu` | Déploiement Vercel de la branche `main` (production target) |
| `qa-todo.ptitom.eu` | Déploiement Vercel de la branche `qa` (preview avec alias custom) |

Le DNS est géré par Vercel. Le certificat TLS est auto-renouvelé.

## Secrets

### Dans GitHub (Actions → Repository secrets)

| Secret | Usage |
|---|---|
| `NEON_API_KEY` | API key scopée à l'org Neon Vercel-managed — authentifie les workflows (reset, create, delete branches) |
| `NEON_PROJECT_ID` | ID du projet Neon `weathered-sea-00511895` |
| `DATABASE_URL_QA` | Connection string pooled de la branche Neon `qa` (pour appliquer migrations Prisma en CI) |

### Dans Vercel (Environment Variables)

Les vars Postgres sont auto-provisionnées par le **Vercel Marketplace Neon integration** sauf override branch-specific :

| Scope | Variable | Valeur pointe vers | Origine |
|---|---|---|---|
| Production, Preview, Development | `DATABASE_URL` | Branche Neon `main` (pooled) | Marketplace (auto) |
| Production, Preview, Development | `DATABASE_URL_UNPOOLED` | Branche Neon `main` (direct) | Marketplace (auto) |
| Preview (branche Git `qa`) | `DATABASE_URL` | Branche Neon `qa` (pooled) | Override manuel — masque le default |
| Preview (branche Git `qa`) | `DATABASE_URL_UNPOOLED` | Branche Neon `qa` (direct) | Override manuel |
| Production, Preview, Development | `POSTGRES_URL`, `PGHOST`, etc. | Aliases vers la branche `main` | Marketplace (auto, compat libs) |
| Production, Preview, Development | `NEON_PROJECT_ID` | `weathered-sea-00511895` | Marketplace (auto) |
| Production | `AUTH_SECRET` | Secret de signature Auth.js | Manuel (rotation périodique) |
| Preview, Development | `AUTH_SECRET` | Secret de signature Auth.js | Manuel (idem) |

> **Local dev** : `.env.local` est généré via `vercel env pull` puis modifié manuellement pour pointer `DATABASE_URL` vers la branche Neon `dev` (la Marketplace pointerait par défaut sur `main`).

## Workflows GitHub Actions

| Workflow | Déclencheur | Rôle |
|---|---|---|
| `qa-db.yml` | Push sur `qa` | Reset Neon `qa` depuis `main` + applique migrations Prisma |
| `neon-pr-branch.yml` | Ouverture / fermeture de PR | Crée/supprime la branche Neon `preview/pr-<N>` et applique migrations |

## Intégrations externes

- **Neon ↔ Vercel** : **Vercel Marketplace integration** (slug `neon`, plan `free_v3`, region `fra1`, Neon-Auth désactivé) — provisionne et synchronise automatiquement `DATABASE_URL`/`DATABASE_URL_UNPOOLED` + aliases (POSTGRES_*, PG*) sur tous les environnements Vercel. Le projet Neon vit dans l'org Neon `Vercel: sberland's projects`, billing Neon-managed.
- **Neon ↔ GitHub Actions** : authentification via `NEON_API_KEY` (clé API scopée à l'org Neon Vercel-managed) — utilisée par `neonctl` et `neondatabase/create-branch-action` pour reset/créer/supprimer des branches.
- **GitHub ↔ Vercel** : intégration native (Vercel for GitHub) — chaque push déclenche un déploiement Vercel (production sur `main`, preview avec alias `qa-todo.ptitom.eu` sur `qa`).

Pour le détail des interactions entre ces systèmes, voir [architecture-detailed.md](./architecture-detailed.md).

## Procédure : rotation des secrets

Voir [rotation-secrets.md](./rotation-secrets.md) pour la procédure complète (rotate `AUTH_SECRET`, rotate les credentials DB via régénération de la branche Neon, etc.).
