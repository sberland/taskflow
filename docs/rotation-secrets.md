# Rotation des secrets

Procédures de rotation pour les secrets critiques du projet.

## Vue d'ensemble

| Secret | Stocké dans | Cadence recommandée | Impact rotation |
|---|---|---|---|
| `DATABASE_URL` (toutes branches) | Vercel + GitHub Secret `DATABASE_URL_QA` | À la demande (compromission) ou tous les 6 mois | Aucun si fait via Marketplace (auto-rotation transparente) |
| `AUTH_SECRET` | Vercel (Prod + Preview + Dev) | Tous les 3-6 mois | **Invalide toutes les sessions actives** — les utilisateurs doivent se reconnecter |
| `NEON_API_KEY` | GitHub Secret | Tous les 6 mois | Aucun visible utilisateur ; CI tombe en erreur si non rotée |
| Vercel API token (auth CLI locale) | `~/Library/Application Support/com.vercel.cli/auth.json` | À la révocation | Niveau machine, pas critique |

## Rotation `AUTH_SECRET`

```bash
# 1. Générer un nouveau secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Supprimer l'ancien (sur tous les environnements)
vercel env rm AUTH_SECRET production --yes
# Note : preview/development sont liés, supprimés par cascade

# 3. Réinjecter
echo "$NEW_SECRET" | vercel env add AUTH_SECRET production --sensitive --yes

# Pour preview/development, le CLI a un bug avec "all branches" en non-interactif.
# Utiliser l'API Vercel directement (voir scripts/) ou ajouter via le dashboard.

# 4. Redeploy
vercel redeploy <url-of-latest-prod-deploy> --target production
```

**⚠️ Effet** : toutes les sessions Auth.js sont invalidées (cookie signé avec l'ancien secret = invalide). Annoncer aux utilisateurs si app multi-utilisateur.

## Rotation credentials Neon (DATABASE_URL)

### Méthode recommandée — via Marketplace integration

Le **Vercel Marketplace Neon integration** gère le password du rôle `neondb_owner` automatiquement. Pour forcer une rotation :

```bash
# Reset password via Neon API
NEON_TOKEN=$(cat ~/.config/neonctl/credentials.json | jq -r '.access_token')

curl -X POST \
  "https://console.neon.tech/api/v2/projects/weathered-sea-00511895/branches/<branch-id>/roles/neondb_owner/reset_password" \
  -H "Authorization: Bearer $NEON_TOKEN"
```

Le Marketplace détecte le changement et met à jour `DATABASE_URL` sur Vercel automatiquement. Re-pull `.env.local` pour le local : `vercel env pull .env.local --yes`.

### Pour les branch-specific overrides

Pour `DATABASE_URL` scopé sur Preview (branche qa) — c'est un **override manuel**, le Marketplace ne le touche pas. À rotater à la main :

```bash
# Récupérer le nouveau connection string
NEW_URL=$(neon connection-string qa --project-id weathered-sea-00511895 --pooled)

# Remplacer côté Vercel (delete + add)
vercel env rm DATABASE_URL preview qa --yes
vercel env add DATABASE_URL preview qa --value "$NEW_URL" --sensitive --yes

# Update aussi le GitHub secret DATABASE_URL_QA
echo -n "$NEW_URL" | gh secret set DATABASE_URL_QA
```

## Rotation `NEON_API_KEY`

```bash
# 1. Générer un nouveau key
NEON_TOKEN=$(cat ~/.config/neonctl/credentials.json | jq -r '.access_token')

NEW_KEY=$(curl -sS -X POST \
  "https://console.neon.tech/api/v2/organizations/org-hidden-mountain-33467876/api_keys" \
  -H "Authorization: Bearer $NEON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key_name":"github-actions-taskflow-'"$(date +%Y%m)"'"}' \
  | jq -r '.key')

# 2. Mettre à jour le GitHub Secret
echo -n "$NEW_KEY" | gh secret set NEON_API_KEY

# 3. Révoquer l'ancien (lister puis DELETE par ID)
curl -sS "https://console.neon.tech/api/v2/organizations/org-hidden-mountain-33467876/api_keys" \
  -H "Authorization: Bearer $NEON_TOKEN"
# Identifier l'id de l'ancien et :
# curl -X DELETE ".../api_keys/<old-id>" -H "Authorization: Bearer $NEON_TOKEN"
```

## Audit annuel

Une fois par an :
1. Lister tous les API keys actifs (Neon, Vercel) et révoquer ceux non utilisés depuis 6+ mois
2. Vérifier le scope des secrets GitHub (seulement les workflows nécessaires)
3. Rotater `AUTH_SECRET`
