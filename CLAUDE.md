# Taskflow — Instructions pour Claude

## Documentation de référence

- [docs/workflow.md](./docs/workflow.md) — parcours détaillé de l'idée à la prod
- [docs/architecture.md](./docs/architecture.md) — stack, environnements, mapping branches/DB/URLs
- [docs/architecture-detailed.md](./docs/architecture-detailed.md) — interactions GitHub/Neon/Vercel, cas particuliers

## Architecture des environnements

| Environnement | URL | Branche GitHub | Branche Neon |
|---|---|---|---|
| Production | todo.ptitom.eu | `main` | `main` |
| QA / Qualification | qa-todo.ptitom.eu | `qa` | `qa` |
| Dev | localhost | `dev` | `dev` |

---

## Workflow des features

### 1. Entrée des demandes

Les features peuvent arriver de deux façons :
- **Via le chat** : demande directe dans la conversation
- **Via `/todo/*.md`** : fichiers déposés de manière asynchrone

**En début de chaque session**, vérifier si des fichiers sont présents dans `/todo/` (hors `_example.md`). Si oui, proposer de les convertir en GitHub Issues avant de commencer le dev. Utiliser `gh issue create` avec labels et milestone appropriés, puis déplacer le fichier dans `/todo/done/`.

### 2. Démarrage d'une feature

1. Se positionner sur la branche `dev`
2. Resetterla branche Neon `dev` depuis `main` pour avoir les données prod fraîches :
   ```bash
   neon branch reset dev --parent main
   ```
3. Appliquer les migrations Prisma en attente :
   ```bash
   npx prisma migrate deploy
   ```

### 3. Validation locale

On travaille sur `dev`. Quand le dev est terminé, attendre la validation explicite :
> **"OK"** ou **"c'est bon"** → passer à l'étape suivante

Ne jamais merger sans ce signal.

### 4. Livraison en QA

1. Resetter la branche Neon `qa` depuis `main` (données fraîches) :
   ```bash
   neon branch reset qa --parent main
   ```
2. Appliquer les migrations :
   ```bash
   npx prisma migrate deploy
   ```
3. Merger `dev` → `qa` et pusher → déploiement automatique sur qa-todo.ptitom.eu

### 5. Livraison en production

Attendre la validation explicite sur la QA :
> **"QA OK"** ou **"OK en prod"** → merger `qa` → `main` → déploiement automatique sur todo.ptitom.eu

---

## Règles strictes

- **Jamais** de merge vers `main` sans signal de validation QA explicite
- **Jamais** de merge vers `qa` sans signal de validation locale explicite
- Toujours resetter la branche Neon cible avant de livrer (données fraîches)
- Les migrations Prisma s'appliquent **après** le reset Neon, pas avant

---

## GitHub Issues — workflow

- **Issues** = une feature ou un bug
- **Labels** : `feature`, `bug`, `enhancement`, `chore`
- **Milestones** = Epics (regroupement de features liées)
- Référencer l'issue dans les commits et PRs : `Fixes #42`, `Closes #42`
- Fermer l'issue automatiquement au merge sur `main`

---

## Dossier `/todo`

- `/todo/*.md` : inbox de features (template dans `_example.md`)
- `/todo/done/` : archivage après conversion en GitHub Issue
- En début de session : vérifier, proposer la conversion, ne pas la faire silencieusement
