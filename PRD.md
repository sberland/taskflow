# PRD — Application de Gestion de Tâches et Projets (SaaS)

## 1. Vue d'ensemble

**Nom du produit :** TaskFlow (nom provisoire)
**Type :** Application web SaaS
**Date :** 2026-03-08
**Statut :** Brouillon v1.0

### Problème

Les équipes et individus peinent à organiser leurs tâches et projets de manière centralisée. Les outils existants sont soit trop complexes, soit trop limités, ce qui entraîne une perte de productivité et un suivi difficile de l'avancement.

### Solution

Une application web SaaS légère et intuitive permettant de gérer des projets et des tâches via des vues Kanban et liste, avec collaboration en temps réel et suivi d'avancement.

---

## 2. Objectifs

- Permettre à un utilisateur ou une équipe de créer et organiser des projets.
- Offrir une interface claire pour gérer des tâches (création, assignation, priorisation, deadlines).
- Fournir une vue d'ensemble de l'avancement via des tableaux de bord.
- Garantir une expérience rapide et fluide sur desktop et mobile web.

---

## 3. Utilisateurs cibles

| Persona | Description |
|---------|-------------|
| **Freelance** | Gère ses projets clients seul, besoin de simplicité |
| **Équipe startup** | 2–20 personnes, collabore sur plusieurs projets simultanément |
| **Chef de projet PME** | Suit l'avancement d'une équipe, besoin de rapports |

---

## 4. Fonctionnalités

### 4.1 Must-have (MVP)

#### Authentification
- Inscription / connexion par email + mot de passe
- Connexion OAuth (Google)
- Gestion de session sécurisée (JWT / session cookie)

#### Gestion des projets
- Créer, renommer, archiver et supprimer un projet
- Inviter des membres par email avec rôles (Admin, Membre, Lecteur)
- Vue liste des projets de l'utilisateur

#### Gestion des tâches
- Créer une tâche dans un projet (titre, description, date d'échéance, priorité, assigné)
- Modifier et supprimer une tâche
- Changer le statut d'une tâche : `À faire` → `En cours` → `Terminé`
- Vue Kanban (colonnes par statut)
- Vue liste (tableau triable et filtrable)

#### Tableau de bord
- Résumé des tâches en cours par projet
- Tâches en retard (deadline dépassée)

### 4.2 Should-have (Post-MVP)

- Commentaires sur les tâches
- Notifications email (assignation, deadline proche)
- Étiquettes / tags sur les tâches
- Recherche globale (projets + tâches)
- Historique des activités par projet

### 4.3 Could-have (Futur)

- Intégration Slack / Teams
- Rapports d'avancement exportables (PDF, CSV)
- Templates de projets
- Automatisations (règles si/alors)
- Mode hors ligne (PWA)

---

## 5. Stack technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | Next.js 14+ (App Router), React, TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Backend / API** | Next.js Server Actions + Route Handlers (tout-en-un) |
| **Base de données** | PostgreSQL via Prisma ORM |
| **Auth** | NextAuth.js (ou Clerk) |
| **Déploiement** | Vercel (app complète) + Supabase (DB managée) |
| **Tests** | Vitest + Playwright (e2e) |

---

## 6. Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Pages login/register
│   ├── (dashboard)/        # Pages protégées
│   │   ├── projects/
│   │   └── tasks/
│   └── api/                # Route Handlers (webhooks, etc.)
├── actions/                # Server Actions (mutations)
│   ├── project.actions.ts
│   └── task.actions.ts
├── components/             # Composants React réutilisables
├── lib/                    # Utilitaires, client Prisma, helpers
├── prisma/                 # Schéma et migrations
└── types/                  # Types TypeScript partagés
```

---

## 7. Modèle de données (simplifié)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  projects  ProjectMember[]
  tasks     Task[]   @relation("AssignedTo")
}

model Project {
  id        String   @id @default(cuid())
  name      String
  members   ProjectMember[]
  tasks     Task[]
  createdAt DateTime @default(now())
}

model ProjectMember {
  userId    String
  projectId String
  role      Role     @default(MEMBER)
  user      User     @relation(fields: [userId], references: [id])
  project   Project  @relation(fields: [projectId], references: [id])
  @@id([userId, projectId])
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  projectId   String
  assigneeId  String?
  project     Project    @relation(fields: [projectId], references: [id])
  assignee    User?      @relation("AssignedTo", fields: [assigneeId], references: [id])
  createdAt   DateTime   @default(now())
}

enum TaskStatus { TODO IN_PROGRESS DONE }
enum Priority  { LOW MEDIUM HIGH URGENT }
enum Role      { ADMIN MEMBER VIEWER }
```

---

## 8. Expérience utilisateur

### Flux principal (happy path)

1. L'utilisateur s'inscrit et arrive sur son tableau de bord (vide).
2. Il crée un premier projet.
3. Il ajoute des tâches dans ce projet via le bouton "+ Tâche".
4. Il déplace les tâches dans le Kanban au fur et à mesure de l'avancement.
5. Il invite un collègue qui reçoit un email d'invitation.
6. Le collègue rejoint et est assigné à certaines tâches.

### Principes UX

- Interactions sans rechargement de page (optimistic updates)
- Drag-and-drop dans la vue Kanban
- Raccourcis clavier pour les actions fréquentes
- Design épuré, responsive (mobile web)

---

## 9. Critères d'acceptation (MVP)

- [ ] Un utilisateur peut créer un compte et se connecter
- [ ] Un utilisateur peut créer un projet et y ajouter des tâches
- [ ] Un utilisateur peut changer le statut d'une tâche par drag-and-drop
- [ ] Un utilisateur peut inviter un autre utilisateur dans un projet
- [ ] Les données sont persistées en base PostgreSQL
- [ ] L'application est déployée et accessible en ligne
- [ ] Les routes protégées redirigent vers login si non authentifié

---

## 10. Métriques de succès

| Métrique | Cible MVP |
|----------|-----------|
| Temps de création d'une tâche | < 10 secondes |
| Score de satisfaction (NPS) | ≥ 40 |
| Taux de rétention J7 | ≥ 30 % |
| Temps de chargement initial (LCP) | < 2,5 s |

---

## 11. Hors périmètre (MVP)

- Facturation / abonnement payant
- Application mobile native
- Intégrations tierces (Slack, GitHub, etc.)
- Rapports avancés

---

## 12. Questions ouvertes

- Quel modèle de pricing envisagé ? (freemium, essai gratuit, etc.)
- Faut-il un mode équipe avec facturation par siège ?
- Priorité : collaboration temps réel (WebSockets) ou async ?
