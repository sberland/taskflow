# Architecture — vue d'ensemble

Document de référence : stack, environnements, mapping branches/DB/URLs.

## Stack technique

| Couche | Techno |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components) |
| Langage | TypeScript |
| ORM | Prisma |
| Base de données | PostgreSQL (Neon — serverless + branching) |
| Auth | Better Auth |
| Hébergement | Vercel (Fluid Compute, Node.js 24) |
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
| `NEON_API_KEY` | Authentifie neonctl dans les workflows (reset, create, delete branches) |
| `NEON_PROJECT_ID` | ID du projet Neon `bitter-fire-12170611` |
| `DATABASE_URL_QA` | Connection string de la branche Neon `qa` (pour appliquer migrations Prisma en CI) |

### Dans Vercel (Environment Variables)

| Scope | Variable | Valeur pointe vers |
|---|---|---|
| Production | `DATABASE_URL` | Branche Neon `main` |
| Production | `DATABASE_URL_UNPOOLED` | Branche Neon `main` (connexion directe sans pooling) |
| Preview (branche `qa`) | `DATABASE_URL` | Branche Neon `qa` |
| Preview (autres branches) | `DATABASE_URL` | Auto-provisionnée par l'intégration Neon/Vercel |
| Toutes | `AUTH_SECRET` | Secret de signature Better Auth |
| Toutes | `DATABASE_PROVIDER` | `postgresql` |

## Workflows GitHub Actions

| Workflow | Déclencheur | Rôle |
|---|---|---|
| `qa-db.yml` | Push sur `qa` | Reset Neon `qa` depuis `main` + applique migrations Prisma |
| `neon-pr-branch.yml` | Ouverture / fermeture de PR | Crée/supprime la branche Neon `preview/pr-<N>` et applique migrations |

## Intégrations externes

- **Neon ↔ GitHub** : intégration native (GitHub App installée sur le repo) — permet aux actions d'accéder à l'API Neon via `NEON_API_KEY`
- **Neon ↔ Vercel** : intégration native — crée automatiquement une branche Neon par preview deployment Vercel et injecte le `DATABASE_URL` approprié
- **GitHub ↔ Vercel** : intégration native — chaque push déclenche un déploiement Vercel (production ou preview selon la branche)

Pour le détail des interactions entre ces systèmes, voir [architecture-detailed.md](./architecture-detailed.md).
