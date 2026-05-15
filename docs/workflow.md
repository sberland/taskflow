# Workflow — de l'idée à la prod

Document pratique : comment travailler pour faire évoluer le produit, étape par étape.

## Vue d'ensemble

```
idée → Issue GitHub → branche dev → QA → prod
```

Chaque étape a un déclencheur explicite : rien ne passe d'une phase à la suivante tant qu'on n'a pas validé la précédente.

---

## 1. Capture de l'idée

Deux canaux possibles :

### Canal A — chat avec Claude
Tu décris la feature directement en conversation.

### Canal B — fichier dans `/todo/` (inbox asynchrone)
Tu crées un fichier Markdown dans `/todo/` en suivant le template `_example.md`. Utile quand une idée te vient hors session (note à 2h du matin, pendant un autre projet, etc.).

En début de session, Claude vérifie `/todo/` et propose de convertir les fichiers en GitHub Issues.

---

## 2. Conversion en Issue GitHub

Toute feature démarre par une Issue. C'est la source de vérité pour :
- Le scope (description + critères d'acceptance)
- Le suivi (labels, milestone, statut)
- Le lien avec les PRs (fermeture auto via `Fixes #N`)

**Labels** à utiliser :
- `feature` — nouvelle fonctionnalité
- `bug` — correction
- `enhancement` — amélioration d'existant
- `chore` — technique / maintenance

**Milestones** = Epics : regroupement de plusieurs issues liées à un même objectif.

Une fois l'Issue créée, le fichier `/todo/*.md` d'origine est déplacé dans `/todo/done/`.

---

## 3. Démarrage du développement

### 3.1. Créer une branche depuis `main`

```bash
git checkout main
git pull
git checkout -b feature/nom-court-descriptif
```

Convention de nommage : `feature/`, `fix/`, `chore/`, `docs/` + slug court.

### 3.2. Préparer la DB de dev

Au démarrage de la feature, on repart de **données prod fraîches** :

```bash
neonctl branches reset dev --parent --project-id bitter-fire-12170611
npx prisma migrate deploy
```

Ça écrase ta branche Neon `dev` avec l'état courant de `main` (prod), puis applique les migrations Prisma en attente.

### 3.3. Coder

Développement local avec `npm run dev`. Ta DB pointe sur la branche Neon `dev` (snapshot prod).

---

## 4. Validation locale

Quand la feature est prête :
- Tests manuels en local (golden path + cas limites)
- `npx tsc --noEmit` pour le type check
- `npm run build` pour valider le build

Tu dis à Claude **"OK"** → on peut passer à la QA.

---

## 5. Livraison en QA

### 5.1. Ouvrir la PR vers `qa`

```bash
git push -u origin feature/nom
gh pr create --base qa --head feature/nom --title "..." --body "Closes #N"
```

### 5.2. Vérifier la branche Neon éphémère de la PR

Le workflow `neon-pr-branch.yml` crée automatiquement :
- Une branche Neon `preview/pr-<N>` copiée depuis `main`
- Les migrations Prisma appliquées dessus
- Un commentaire sur la PR avec la connection string

C'est sur cette branche éphémère que Vercel déploie la preview de la PR → tu peux tester les migrations sur des données prod sans risque.

### 5.3. Merger la PR → déploiement QA

**Stratégie de merge** : `Squash and merge` (nettoie les commits WIP).

Le merge sur `qa` déclenche automatiquement :
1. Workflow `qa-db.yml` : reset Neon `qa` depuis `main` + applique migrations
2. Déploiement Vercel sur **qa-todo.ptitom.eu**
3. La branche Neon `preview/pr-<N>` est supprimée (hook de fermeture de PR)

### 5.4. Valider sur qa-todo.ptitom.eu

- Login avec tes credentials **prod** (pas en créer de nouveaux)
- Tester le golden path et les cas limites
- Vérifier qu'il n'y a pas de régression ailleurs

Tu dis à Claude **"QA OK"** → on peut passer en prod.

---

## 6. Livraison en production

### 6.1. Ouvrir la PR `qa` → `main`

```bash
gh pr create --base main --head qa --title "Release: ..."
```

Le titre doit indiquer "Release" pour la traçabilité.

### 6.2. Merger la PR

**Stratégie de merge** : `Create a merge commit` (matérialise la release, facilite les reverts).

Le merge sur `main` déclenche :
- Déploiement Vercel production sur **todo.ptitom.eu**
- Aucun reset DB (la prod est la source de vérité, on n'y touche jamais)

### 6.3. Vérifier la prod

- todo.ptitom.eu est up et fonctionnel
- L'issue GitHub est fermée automatiquement si la PR contenait `Fixes #N`

---

## Stratégies de merge — résumé

| Transition | Stratégie | Pourquoi |
|---|---|---|
| feature → `qa` | `Squash and merge` | Écrase les commits WIP en un seul commit propre |
| `qa` → `main` | `Create a merge commit` | Matérialise la release, revert facile |

---

## Règles d'or

1. **Jamais** de merge vers `main` sans signal explicite **"QA OK"**
2. **Jamais** de merge vers `qa` sans signal explicite **"OK"** (validation locale)
3. **Jamais** de push direct sur `main` ou `qa` (branches protégées, interdit techniquement)
4. Avant chaque nouveau cycle (dev ou QA), **resetter la branche Neon** depuis `main` pour avoir des données fraîches
5. Les migrations Prisma s'appliquent **après** le reset Neon, pas avant
