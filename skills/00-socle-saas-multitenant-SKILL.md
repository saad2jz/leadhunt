---
name: socle-saas-multitenant
description: Architecture multi-tenant Next.js/Postgres/Prisma, authentification, conformité RGPD, onboarding client. À charger EN PREMIER, avant tout autre skill de ce projet.
---

# Skill — Itération 1 : Socle SaaS

Ce skill contient tout ce qui doit exister AVANT de construire la moindre fonctionnalité métier : isolation multi-tenant, authentification, conformité. Aucune autre itération ne doit démarrer tant que ce socle n'est pas posé et vérifié.

# Prompt pour Codex — Outil de prospection B2B (France)

> **Note de migration** : ce projet part désormais sur Next.js + Postgres/Prisma pour l'ensemble des fonctionnalités, y compris le moteur de recherche de prospection intelligente (double scoring Fit/Timing, buyer persona, plan d'approche, suivi de quota API) initialement prototypé sur Firebase/Firestore. Voir fonctionnalité 1bis pour la conversion complète du modèle de données Firestore vers Prisma. Si du code Firebase existe déjà, il sert uniquement de référence fonctionnelle — le nouveau code cible exclusivement Next.js/Prisma/Postgres.

Copie tout ce qui suit dans Codex.

---

Construis une application web complète d'outil de prospection commerciale B2B pour la France, en t'appuyant sur l'API publique gratuite du gouvernement français "Recherche d'entreprises" (https://recherche-entreprises.api.gouv.fr/), qui ne nécessite aucune clé API.

## Stack technique
- Frontend : Next.js 14 (App Router) + TypeScript + TailwindCSS
- Backend : API routes Next.js (pas besoin de serveur séparé)
- Base de données : SQLite via Prisma (facile à faire tourner en local, migrable vers Postgres plus tard)
- Pas d'authentification pour la V1 (mono-utilisateur local)

## ⚠️ Architecture — SaaS multi-tenant

Cette application est un **vrai SaaS multi-tenant** : une seule instance déployée, partagée par plusieurs clients (organisations) totalement isolés les uns des autres. C'est l'exigence la plus critique du projet — une erreur d'isolation entre deux clients (un client qui verrait les prospects d'un autre) est une faute grave, pas un simple bug.

### Stack mise à jour
- Base de données : **PostgreSQL** (pas SQLite — SQLite n'est pas adapté à un SaaS multi-tenant en production)
- Authentification : **NextAuth.js** (email/mot de passe pour la V1, avec structure prête pour ajouter Google/Microsoft SSO plus tard)
- ORM : Prisma (inchangé)

### Modèle `Organisation` (tenant)
```prisma
model Organisation {
  id          String   @id @default(cuid())
  nom         String
  plan        String   @default("starter") // "starter", "pro", "entreprise"
  modulesActifs String  // JSON.stringify des modules activés selon le plan, ex: ["prospection","pipeline","dashboard"]
  createdAt   DateTime @default(now())
  utilisateurs Utilisateur[]
  prospects   Prospect[]
  campagnes   Campagne[]
  // ... relation vers TOUS les autres modèles métier
}
```

### Règle d'or à appliquer partout
**Chaque modèle métier du schéma (Prospect, Contact, Interaction, Campagne, Etape, ProspectCampagne, AlerteVeille, VueSauvegardee, TemplateEmail, ConnexionCRM, SynchroLog, etc.) doit avoir un champ `organisationId String` obligatoire avec sa relation vers `Organisation`.**

Le modèle `Utilisateur` doit aussi avoir `organisationId`, et un rôle étendu : `"Commercial"`, `"Manager"`, ou `"SuperAdmin"` (le SuperAdmin est réservé à toi/l'éditeur de l'outil, pas aux clients — il gère les organisations elles-mêmes, pas leurs données).

### Scoping obligatoire des requêtes
- Toute route API doit récupérer l'organisation de l'utilisateur connecté depuis la session NextAuth, puis **filtrer systématiquement toutes les requêtes Prisma par `organisationId`** (`where: { organisationId: session.user.organisationId, ... }`)
- Crée un helper `lib/auth-scope.ts` avec une fonction `getScopedPrisma(session)` ou un middleware centralisé, pour éviter qu'un développeur oublie le filtre dans une route et crée une fuite de données — idéalement, centralise cette logique plutôt que de la répéter dans chaque route
- Ajoute un test simple (ou au moins un commentaire d'avertissement en tête de chaque route API) rappelant cette règle

### Modules par plan (feature flags) — définition complète des 4 paliers

Le champ `modulesActifs` sur `Organisation` détermine quelles fonctionnalités sont visibles/actives pour ce client. Les paliers sont définis selon le **coût réel d'API/infrastructure** de chaque fonctionnalité, pas seulement selon leur "valeur perçue" — les fonctionnalités qui consomment des appels payants (Pappers, Hunter/Wiza/Snov/etc., Twilio, Anthropic) sont réservées aux paliers dont la tarification les couvre.

```prisma
model PlanTarifaire {
  id             String   @id @default(cuid())
  nom            String   @unique // "starter", "pro", "business", "entreprise"
  modulesInclus  Json     // liste des identifiants de modules activés par défaut pour ce plan
  quotaEnrichissementMensuel Int? // nb d'enrichissements waterfall inclus, null = illimité/sur-mesure
  clesAPIPersonnelles Boolean @default(false) // "entreprise" : le client peut apporter ses propres clés API
  prixMensuel    Float?
}
```

**🟢 Starter** — coût API quasi nul (SIRENE gratuite uniquement)
Recherche SIRENE de base (fonctionnalité 1), fiche prospect + ajout de contact manuel, pipeline kanban simple, dashboard KPI basique, export/import CSV, registre "Ne plus contacter", onboarding guidé

**🔵 Pro** — coût API modéré (Pappers + enrichissement simple, 1 fournisseur)
Tout Starter + moteur de recherche de prospection intelligente avec scoring Fit/Timing et buyer persona (fonctionnalité 1bis), découverte automatique d'ICP depuis un domaine (fonctionnalité 57), enrichissement simple sans cascade complète, veille commerciale, séquences email + tracking d'ouverture/clic, intégration CRM externe, quiz de qualification embeddable, vues sauvegardées, carte géographique, scoring automatique des prospects

**🟣 Business** — coût API élevé (cascade waterfall + téléphonie + IA)
Tout Pro + enrichissement waterfall multi-fournisseurs complet (fonctionnalité 55), infrastructure de délivrabilité/domain warming (fonctionnalité 58), téléphonie clic-to-call, IA de qualification (résumés d'appel, suggestions), signaux d'embauche, chatbot IA sur site public, intégration WhatsApp Business, module Intake/Qualification/Routage/Booking pour leads entrants, devis, auto-optimisation des campagnes par coût/lead (fonctionnalité 59, hors mode réponse autonome)

**⚫ Entreprise** — sur-mesure, quota API dédié possible
Tout Business + agent IA conversationnel "chef d'orchestre", agent de réponse et de booking entièrement autonome (fonctionnalité 59, activable explicitement), agent vocal IA pour appels entrants, multi-utilisateur avancé avec rôles fins et verrouillage territorial, SSO (Google/Microsoft), marketplace de templates, module de formation, app mobile, connecteur Zapier/Make, option `clesAPIPersonnelles` pour brancher ses propres comptes Hunter/Twilio/etc. et ne pas consommer le quota mutualisé de la plateforme

### Implémentation
- Crée un hook `useModulesActifs()` côté frontend qui lit les modules actifs de l'organisation courante (dérivés de son `PlanTarifaire`) et masque/affiche les entrées de menu en conséquence — une fonctionnalité non incluse dans le plan n'apparaît pas du tout dans l'interface plutôt que d'être visible mais bloquée (évite la frustration et les questions support)
- Une page "Mon abonnement" côté client affichant le plan actuel, les modules inclus, et un bouton "Changer de plan" (redirige vers une demande de contact commercial en V1, avant l'intégration Stripe prévue en itération future)
- Une page "Administration" réservée au rôle `SuperAdmin` pour créer/gérer les organisations clientes, changer leur `PlanTarifaire`, et pour le plan Entreprise, activer `clesAPIPersonnelles` et saisir les clés propres du client (stockées chiffrées, jamais en clair)
- Le suivi de quota (`UsageAPI`, fonctionnalités 1bis/55) doit distinguer consommation mutualisée (plans Starter à Business, quota partagé de la plateforme) et consommation dédiée (plan Entreprise avec clés propres) — ajoute un champ `organisationId String?` optionnel sur `UsageAPI` pour les compteurs propres à une organisation cliente, en plus des compteurs globaux existants

### Onboarding d'un nouveau client
- Une page d'inscription qui crée une nouvelle `Organisation` + son premier `Utilisateur` (rôle Manager) au moment de la création de compte
- L'étape "Stratégie" de l'onboarding guidé (fonctionnalité 25) recommande désormais explicitement un `PlanTarifaire` parmi les 4 définis ci-dessus, à partir des réponses au diagnostic (taille équipe, volume visé, besoin CRM/téléphonie/IA), plutôt qu'une simple liste de modules à la carte
- Isolation garantie dès la création : aucune donnée par défaut partagée entre organisations

### Facturation (à prévoir, pas à développer en V1)
- Laisse un commentaire dans le code et dans le README indiquant que l'intégration Stripe (abonnements récurrents liés au `plan` de l'`Organisation`) sera à ajouter dans une itération suivante — ne pas la développer maintenant pour ne pas alourdir cette première version, mais structurer le modèle `Organisation` de façon à ce qu'ajouter `stripeCustomerId` et `stripeSubscriptionId` plus tard soit trivial

---


Une modale "Rechercher une entreprise" avec :
- Un champ texte : nom, enseigne, dirigeant ou SIREN
- Un champ département (2 chiffres)
- Un bouton "Rechercher" qui appelle l'API `GET https://recherche-entreprises.api.gouv.fr/search?q={query}&departement={dept}`
- Affiche pour chaque résultat : nom de l'entreprise, forme juridique (SAS, SARL...), adresse complète, SIREN, code NAF + libellé du secteur, nom du dirigeant + son rôle, tranche d'effectif
- Une checkbox par résultat pour sélectionner les entreprises à importer
- Un bouton "Importer en prospects" qui insère les entreprises cochées dans la base de données locale (table `Prospect`)
- Mémorise les 5 dernières recherches (recherches récentes cliquables)
- Pagination des résultats (l'API retourne des résultats paginés)


## Fonctionnalité 19 — Authentification sécurisée réelle + SSO

Remplace la mention "V1 simplifiée" évoquée plus haut par une vraie implémentation dès le départ, vu l'enjeu multi-tenant.

- **NextAuth.js** avec :
  - Provider Credentials (email + mot de passe, hashé avec `bcrypt`, jamais en clair)
  - Provider Google OAuth
  - Provider Microsoft (Azure AD / Entra ID) — pertinent pour un contexte B2B où beaucoup d'entreprises utilisent déjà Microsoft 365
- Vérification d'email obligatoire à l'inscription (lien de confirmation envoyé via Resend)
- Réinitialisation de mot de passe (lien à durée de vie limitée, envoyé par email)
- Sessions JWT avec `organisationId` et `role` inclus dans le token pour éviter une requête DB supplémentaire à chaque appel
- Page "Sécurité" dans les paramètres utilisateur : changer son mot de passe, voir les sessions actives, activer la 2FA (TOTP via `otplib`, en V2 si le temps manque — mais prévoir le champ `twoFactorSecret` sur `Utilisateur` dès maintenant pour ne pas avoir à migrer plus tard)


## Fonctionnalité 30 — Registre "Ne plus contacter" (conformité RGPD & démarchage)

Fonctionnalité de conformité, à considérer comme prioritaire malgré son numéro tardif dans ce prompt — expose l'organisation cliente à un risque légal si absente (RGPD + encadrement du démarchage téléphonique en France, loi Naegelen).

### Modèle de données
```prisma
model ListeNoirContact {
  id            String   @id @default(cuid())
  organisationId String
  organisation  Organisation @relation(fields: [organisationId], references: [id])
  email         String?
  telephone     String?
  siren         String?  // pour bloquer toute l'entreprise si besoin
  motif         String?  // "Demande RGPD", "Opposition démarchage", "Autre"
  dateAjout     DateTime @default(now())
  ajoutePar     String?  // utilisateurId
}
```

### Implémentation
- Bouton "🚫 Ne plus contacter" visible sur chaque fiche contact/prospect, qui ajoute l'email/téléphone/SIREN concerné à la `ListeNoirContact` de l'organisation et fait passer automatiquement le prospect au statut "Ne plus contacter" (nouveau statut à ajouter à la liste des statuts existants)
- **Contrôle bloquant systématique** avant tout envoi (email via fonctionnalité 16, inscription en séquence via fonctionnalité 17, appel logué via fonctionnalité 18) : vérifie si l'email/téléphone/SIREN cible figure dans `ListeNoirContact` de l'organisation ; si oui, bloque l'action et affiche un message clair ("Ce contact a demandé à ne plus être contacté")
- Centralise cette vérification dans un helper unique `lib/verifier-liste-noire.ts` appelé par toutes les routes d'outreach, pour éviter qu'un développeur oublie le contrôle dans une nouvelle fonctionnalité future
- Page "Conformité" dans les paramètres : liste consultable et exportable de la liste noire de l'organisation, avec possibilité de retrait manuel (si la personne redonne son accord explicitement, avec horodatage de ce changement conservé pour preuve)
- Import possible d'une liste noire externe (CSV) si le client a déjà des oppositions enregistrées ailleurs


## Fonctionnalité 25 — Onboarding guidé en 5 étapes (nouveau client)

Après la création de compte (`Organisation` + premier `Utilisateur`), lance un parcours guidé en 5 étapes avant de rediriger vers le tableau de bord standard, plutôt qu'un formulaire d'inscription classique suivi d'une app vide.

### Modèle de données
```prisma
model OnboardingOrganisation {
  id             String   @id @default(cuid())
  organisationId String   @unique
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  etapeActuelle  Int      @default(1) // 1 à 5
  reponsesDiagnostic String? // JSON.stringify des réponses au questionnaire
  planRecommande String?
  termine        Boolean  @default(false)
  createdAt      DateTime @default(now())
}
```

### Étape 1 — Diagnostic
Questionnaire court (5-6 questions, via le composant `ask_user_input`-like déjà utilisé ailleurs dans l'app, ou simples boutons de sélection) :
- Taille de l'équipe commerciale (Seul / 2-5 / 6+)
- CRM déjà utilisé aujourd'hui (Aucun / HubSpot / Pipedrive / Autre)
- Mode de prospection principal (À distance / Terrain / Les deux)
- Volume de prospects visé par mois (approximatif)
- Secteur(s) cible(s) principaux

Réponses stockées dans `reponsesDiagnostic`.

### Étape 2 — Stratégie (recommandation automatique)
À partir des réponses, calcule et affiche un plan recommandé (`planRecommande`) et la liste des modules qui seraient activés (`modulesActifs` sur `Organisation`) — logique simple en `lib/onboarding-recommandation.ts`, ex : équipe 6+ → active Multi-utilisateur ; CRM existant renseigné → propose de préconfigurer l'intégration CRM ; mode Terrain → met en avant la Carte géographique et l'app mobile. Le client peut ajuster manuellement avant de valider (rien n'est imposé).

### Étape 3 — Mise en place (checklist interactive)
Checklist affichée avec des actions concrètes à cocher, chacune redirigeant vers l'écran correspondant :
- ☐ Faire sa première recherche d'entreprises (SIRENE)
- ☐ Importer au moins 5 prospects
- ☐ Ajouter un contact décideur sur au moins un prospect
- ☐ Créer son premier pipeline de campagne
Chaque action cochée automatiquement dès que l'action réelle correspondante est détectée en base (pas besoin que l'utilisateur coche manuellement, l'app vérifie l'état réel).

### Étape 4 — Automatisation
Propositions activables en un clic :
- Activer une séquence email de relance type (template pré-rempli en français, éditable ensuite)
- Connecter le CRM externe si mentionné à l'étape 1 (redirige vers la page Intégrations avec le fournisseur pré-sélectionné)

### Étape 5 — Optimisation
Explique que le tableau de bord affichera désormais des suggestions d'amélioration en continu (relié à la fonctionnalité 26 ci-dessous), puis marque `termine: true` et redirige vers le tableau de bord réel.

### Implémentation
- Barre de progression visible en haut de chaque étape (1/5 à 5/5), navigation possible en arrière, possibilité de "Passer cette étape" sans bloquer (`etapeActuelle` avance quand même)
- Un `Manager` peut relancer l'onboarding plus tard depuis les paramètres si besoin de reconfigurer

