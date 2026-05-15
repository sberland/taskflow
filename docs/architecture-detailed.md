# Architecture détaillée — interactions GitHub / Neon / Vercel

Document technique : comment les trois systèmes communiquent entre eux à chaque phase du cycle de vie d'une feature.

## Schéma global

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GitHub (taskflow)                           │
│   Branches : dev, feature/*, qa, main                               │
│   Workflows : qa-db.yml, neon-pr-branch.yml                         │
│   Issues + PRs                                                      │
└────────────┬─────────────────────────────────────┬──────────────────┘
             │                                     │
             │ webhooks push / PR                  │ Actions API
             │                                     │ (NEON_API_KEY)
             ▼                                     ▼
┌──────────────────────────┐          ┌──────────────────────────────┐
│         Vercel           │          │             Neon             │
│                          │          │                              │
│  Project : taskflow      │          │  Project : todo              │
│                          │          │  Branches : main, qa, dev,   │
│  Domaines :              │◄─────────┤             preview/pr-<N>   │
│   - todo.ptitom.eu       │  Neon/   │                              │
│     (branche main)       │  Vercel  │  Annotations :               │
│   - qa-todo.ptitom.eu    │  integ.  │   - main = production        │
│     (branche qa)         │          │                              │
│                          │          │                              │
│  Env vars :              │          │                              │
│   - prod : DATABASE_URL  │          │                              │
│     → ep-fragrant-...    │          │                              │
│   - preview qa :         │          │                              │
│     DATABASE_URL         │          │                              │
│     → ep-rough-...       │          │                              │
└──────────────────────────┘          └──────────────────────────────┘
```

---

## Cycle 1 — Développement d'une feature (local)

### Action : `neonctl branches reset dev --parent`

```
Développeur ──► Neon API
                ├─ Reset branche `dev`
                └─ Parent = `main` (prod data à l'instant T)
```

### Action : `npx prisma migrate deploy`

```
Développeur ──► Neon (branche dev)
                └─ Applique les migrations Prisma en attente
```

### Action : `npm run dev`

```
Next.js local ──► Neon (branche dev)
                  DATABASE_URL = ep-<endpoint-dev>
                  (lu depuis .env.local)
```

**Résultat** : environnement local avec données prod fraîches et schéma à jour.

---

## Cycle 2 — Ouverture d'une Pull Request

### Trigger GitHub : `pull_request: opened`

#### Action 1 : Vercel déploie une preview

```
GitHub ──(webhook)──► Vercel
                      ├─ Build la branche feature
                      ├─ Crée automatiquement une branche Neon `preview/br-<commit-sha>`
                      │  (via l'intégration Neon/Vercel, séparée de notre workflow)
                      └─ Déploie sur <alias>.vercel.app
```

#### Action 2 : Workflow `neon-pr-branch.yml` s'exécute

```
GitHub Actions ──► Neon API (avec NEON_API_KEY)
                   ├─ 1. neondatabase/create-branch-action@v5
                   │     Crée branche `preview/pr-<N>` depuis `main`
                   │
                   ├─ 2. Applique les migrations Prisma sur cette branche
                   │     (via le connection string retourné par l'action)
                   │
                   └─ 3. Commente sur la PR avec les infos de la branche
```

**Note** : Vercel crée sa propre branche Neon par preview deployment. Notre workflow `neon-pr-branch.yml` crée une branche additionnelle **dédiée aux tests de migrations**. Ces deux branches coexistent et ont des usages distincts.

### Trigger GitHub : `pull_request: closed`

```
GitHub Actions ──► Neon API
                   └─ neondatabase/delete-branch-action@v3
                      Supprime `preview/pr-<N>`
```

---

## Cycle 3 — Merge feature → `qa` (déploiement QA)

### Trigger GitHub : `push` sur `qa`

#### Action 1 : Workflow `qa-db.yml` s'exécute

```
GitHub Actions ──► Neon API
                   ├─ 1. neonctl branches reset qa --parent
                   │     Écrase `qa` avec l'état courant de `main`
                   │     (données prod fraîches)
                   │
                   └─ 2. npx prisma migrate deploy (avec DATABASE_URL_QA)
                         Applique les migrations de la feature
                         sur la branche Neon qa fraîchement resettée
```

#### Action 2 : Vercel déploie sur qa-todo.ptitom.eu

```
GitHub ──(webhook)──► Vercel
                      ├─ Build la branche `qa`
                      ├─ DATABASE_URL injecté depuis l'env Preview (scope branche qa)
                      │  → pointe vers branche Neon `qa` (endpoint ep-rough-hall-agvy2ka7)
                      └─ Déploie, attribue l'alias qa-todo.ptitom.eu
                         (mapping domain→branch configuré côté Vercel)
```

**Résultat** : QA disponible sur qa-todo.ptitom.eu avec données prod + migrations de la feature.

### Ordonnancement et race conditions

Vercel et GitHub Actions démarrent en parallèle au même push. Deux scénarios :

- **Cas idéal** : le workflow `qa-db.yml` finit avant que Vercel serve du trafic → la DB qa a le nouveau schéma quand l'app démarre
- **Cas de race** : Vercel sert avant la fin du workflow → requêtes potentiellement contre l'ancien schéma ou pendant un reset

Pour une app faible traffic en QA, ce n'est pas bloquant. Si ça devenait un problème : ajouter un check de version de migration en health check Vercel ou bloquer le déploiement Vercel sur le succès du workflow (via `deployment_status`).

---

## Cycle 4 — Merge `qa` → `main` (déploiement prod)

### Trigger GitHub : `push` sur `main`

```
GitHub ──(webhook)──► Vercel
                      ├─ Build la branche `main`
                      ├─ DATABASE_URL injecté depuis l'env Production
                      │  → pointe vers branche Neon `main` (endpoint ep-fragrant-morning)
                      └─ Déploie en target=production
                         alias todo.ptitom.eu pointé automatiquement sur cette deployment
```

**Aucun workflow GitHub Actions** ne tourne sur push vers `main` : la prod est la source de vérité, on ne touche pas à sa DB.

### Migrations en production

Les migrations Prisma en prod sont appliquées **via Vercel** lors du build. Le script `postinstall` ou la commande de build doit inclure `prisma migrate deploy` (vérifier `package.json`).

⚠️ Point d'attention : si une migration déployée en prod échoue, Vercel tentera de rollback le déploiement, mais la DB aura potentiellement déjà appliqué partiellement la migration. D'où l'intérêt de **valider les migrations sur QA d'abord** (là où la DB est un clone de prod).

---

## Cycle 5 — Protection des branches

### Règles GitHub

| Branche | `enforce_admins` | Required PR | Push direct |
|---|---|---|---|
| `main` | oui | oui | interdit |
| `qa` | oui | oui | interdit |
| `dev`, `feature/*` | non | non | autorisé |

Conséquence : même avec les droits admin, on ne peut pas bypasser le passage par PR sur `main` et `qa`.

### Règles Neon

Aucune branche n'est marquée `protected` côté Neon (on ne bloque pas les resets). La protection se fait au niveau du workflow : seul le workflow `qa-db.yml` (déclenché par push sur `qa`, lui-même derrière une PR) peut resetter `qa`.

---

## Cycle 6 — Cas particuliers

### Rollback d'une release

```
Option A : revert de la PR de merge
  git revert -m 1 <merge-commit-sha>
  → déclenche un nouveau déploiement prod

Option B : Vercel rollback to previous deployment
  Dashboard Vercel → Deployments → cliquer "Promote to production" sur le précédent
  → instantané, pas de rebuild, mais n'inverse pas la migration DB !
```

⚠️ **Si la release contenait une migration destructive** (drop de colonne, etc.), un rollback Vercel seul ne suffit pas : il faut aussi un plan de migration inverse côté DB.

### Hotfix urgent sur la prod

Pour contourner le cycle `dev → qa → main` en urgence :

```
git checkout main
git pull
git checkout -b hotfix/nom
# ... correction ...
gh pr create --base main --head hotfix/nom
```

À utiliser avec parcimonie et uniquement pour des corrections critiques et minimales. Après le hotfix, re-synchroniser `qa` avec `main` pour éviter la divergence.

---

## Pour aller plus loin

- Intégration Neon/GitHub : https://neon.com/docs/guides/neon-github-integration
- Intégration Neon/Vercel : https://neon.com/docs/guides/vercel-overview
- Vercel Git integration : https://vercel.com/docs/git
