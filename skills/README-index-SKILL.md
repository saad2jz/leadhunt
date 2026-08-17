---
name: index-projet-prospection
description: Vue d'ensemble du projet, ordre d'utilisation des skills, paliers tarifaires. À lire en premier pour comprendre la structure globale avant de charger un skill spécifique.
---

# Index — Outil de prospection B2B multi-tenant

Ce projet est découpé en 7 skills, à charger dans l'ordre suivant avec Google Antigravity (Agent Manager, mode Plan recommandé pour chaque itération) :

1. `00-socle-saas-multitenant` — obligatoire en premier
2. `01-coeur-metier-prospection`
3. `02-productivite-commerciale`
4. `03-differenciation-intelligence`
5. `04-ecosysteme-integrations`
6. `05-app-mobile-expo` — dernier, une fois le reste stable

Ne charge dans le contexte de l'agent QUE le skill correspondant à l'itération en cours, plus le skill 00-socle-saas-multitenant qui reste toujours pertinent (règle d'isolation organisationId). Ne charge pas tous les skills en même temps : c'est tout l'intérêt du découpage — éviter le tool bloat et la confusion que produirait le prompt complet de 1400 lignes en un seul bloc.

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

**Point de vigilance non négociable, valable pour tous les skills** : à chaque nouvelle route API créée, vérifie explicitement qu'elle filtre bien par `organisationId` de la session en cours avant de retourner ou modifier des données. C'est le point le plus critique de tout ce projet.
