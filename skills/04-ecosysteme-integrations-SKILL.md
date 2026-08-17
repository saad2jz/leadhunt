---
name: ecosysteme-integrations
description: CRM externe, devis/facturation, multi-utilisateur, inbound (chatbot/WhatsApp/quiz/intake), agents IA autonomes, Zapier/Make, marketplace, formation. Réservé aux plans Business/Entreprise.
---

# Skill — Itération 5 : Écosystème

Prérequis : skills 00 à 03 déjà appliqués. La plupart de ces modules sont réservés aux paliers tarifaires Business/Entreprise (voir modulesActifs dans le skill socle) — vérifier le plan de l'organisation avant d'afficher ces fonctionnalités.

## Fonctionnalité 15 — Intégration CRM externe (synchronisation)

Objectif : permettre à l'outil de rester un excellent moteur de sourcing/scoring/veille tout en poussant (et idéalement en synchronisant) les prospects qualifiés vers le CRM déjà utilisé par l'entreprise (HubSpot, Pipedrive, Salesforce...), plutôt que de tenter de remplacer entièrement le CRM.

### Modèle de données
```prisma
model ConnexionCRM {
  id           String   @id @default(cuid())
  fournisseur  String   // "hubspot", "pipedrive", "salesforce", "webhook_generique"
  apiKey       String?  // stocké chiffré si possible, ou en variable d'environnement pour la V1
  baseUrl      String?  // utile pour le webhook générique
  mappingChamps String  // JSON.stringify du mapping champ local -> champ CRM
  actif        Boolean  @default(true)
  derniereSynchro DateTime?
  createdAt    DateTime @default(now())
}

model SynchroLog {
  id             String   @id @default(cuid())
  connexionId    String
  connexion      ConnexionCRM @relation(fields: [connexionId], references: [id])
  prospectId     String
  prospect       Prospect @relation(fields: [prospectId], references: [id])
  statut         String   // "succès", "échec"
  message        String?
  createdAt      DateTime @default(now())
}
```
Ajoute un champ `idExterneCRM String?` sur `Prospect` pour stocker l'ID renvoyé par le CRM une fois synchronisé (évite les doublons lors des synchros suivantes), et la relation inverse `synchroLogs SynchroLog[]`.

### Page "Intégrations" (paramètres)
- Liste des connexions CRM configurées, avec bouton "+ Ajouter une connexion"
- Formulaire de configuration par fournisseur :
  - **HubSpot** : clé API privée (Private App Token), utilise l'endpoint `POST https://api.hubapi.com/crm/v3/objects/contacts` et `POST .../companies`
  - **Pipedrive** : clé API + domaine de compte, utilise `POST https://{domaine}.pipedrive.com/api/v1/persons` et `.../organizations`
  - **Webhook générique** : simple URL + méthode POST, envoie le prospect en JSON — permet de brancher n'importe quel autre CRM/Zapier/Make sans développement spécifique
- Un écran de "mapping de champs" : tableau à deux colonnes (champ local → champ CRM cible), avec des valeurs par défaut sensées pré-remplies (nom → name, telephone → phone, email → email, ville → city, secteur → industry, etc.) et modifiable par l'utilisateur

### Synchronisation
- **Push manuel** : sur chaque prospect (liste ou fiche détail), un bouton "Envoyer vers [Nom du CRM]" qui pousse ce prospect immédiatement (création si `idExterneCRM` vide, mise à jour sinon)
- **Push en masse** : depuis la liste filtrée de prospects, bouton "Synchroniser la sélection vers le CRM"
- **Règle automatique optionnelle** : case à cocher dans les paramètres de connexion "Synchroniser automatiquement quand un prospect passe à l'étape [X]" (ex: dès qu'un prospect entre dans l'étape "RDV pris" du pipeline, il est poussé automatiquement vers le CRM — évite de pousser les prospects encore en phase de qualification et de polluer le CRM commercial avec du sourcing brut)
- Toutes les tentatives de synchro (succès ou échec) sont loguées dans `SynchroLog`, consultable dans un onglet "Historique de synchro" sur la page Intégrations, avec le message d'erreur brut renvoyé par l'API en cas d'échec pour faciliter le debug

### Sécurité
- Les clés API ne doivent jamais être exposées côté client : tous les appels vers les CRM externes passent par une route API Next.js serveur (`/api/crm/sync`), jamais directement depuis le navigateur
- Prévoir un fichier `.env.local.example` documentant les variables d'environnement possibles si l'utilisateur préfère stocker les clés en variables d'environnement plutôt qu'en base


## Fonctionnalité 21 — Devis et facturation liés aux deals

### Modèle de données
```prisma
model Devis {
  id            String   @id @default(cuid())
  organisationId String
  organisation  Organisation @relation(fields: [organisationId], references: [id])
  prospectId    String
  prospect      Prospect @relation(fields: [prospectId], references: [id])
  numero        String   // ex: DEV-2026-001, généré automatiquement
  statut        String   @default("brouillon") // brouillon, envoyé, accepté, refusé, expiré
  lignes        LigneDevis[]
  montantHT     Float
  montantTTC    Float
  tauxTVA       Float    @default(20)
  dateCreation  DateTime @default(now())
  dateValidite  DateTime?
  pdfUrl        String?
}

model LigneDevis {
  id          String @id @default(cuid())
  devisId     String
  devis       Devis  @relation(fields: [devisId], references: [id])
  description String
  quantite    Float
  prixUnitaire Float
  ordre       Int
}
```

### Implémentation
- Page "Devis" accessible depuis la fiche prospect : créer un devis avec des lignes (description, quantité, prix unitaire), calcul automatique HT/TTC
- Génération PDF du devis (utilise `@react-pdf/renderer` ou `puppeteer` pour un rendu HTML→PDF avec le logo/en-tête de l'organisation cliente)
- Envoi du devis par email au contact décideur (réutilise la fonctionnalité 16)
- Suivi du statut (brouillon/envoyé/accepté/refusé), avec passage automatique du prospect à l'étape "Closing" du pipeline quand un devis passe en "accepté"
- **Facturation** : pour la V1, ne développe pas un module de facturation comptable complet (c'est un métier à part entière avec des obligations légales strictes en France — numérotation légale, mentions obligatoires, télétransmission à terme avec la réforme de facturation électronique). Prévoir à la place une intégration avec un outil de facturation existant (ex: génère le devis dans l'outil, puis bouton "Transformer en facture sur [Qonto/Pennylane/Facture.net]" via leur API si disponible, ou export des données du devis accepté vers ces outils). Documente ce choix clairement dans le README pour que l'utilisateur comprenne pourquoi la facturation n'est pas native.


## Fonctionnalité 11 — Multi-utilisateur / équipe

- Ajoute un modèle `Utilisateur` basique (nom, email, rôle : "Commercial" ou "Manager")
```prisma
model Utilisateur {
  id    String @id @default(cuid())
  nom   String
  email String @unique
  role  String @default("Commercial")
  createdAt DateTime @default(now())
}
```
- Ajoute un champ `assigneAId String?` sur `Prospect` (relation vers `Utilisateur`, remplace le champ texte libre `assigne` précédent)
- Authentification simple V1 : pas de mot de passe complexe, juste un système de sélection d'utilisateur au démarrage (stocké en session/cookie) — prévoir néanmoins la structure pour ajouter NextAuth.js plus tard si besoin de vraie authentification
- Un "Commercial" ne voit par défaut que ses prospects assignés (filtre appliqué automatiquement), un "Manager" voit tout et peut réassigner des prospects entre commerciaux (glisser-déposer ou menu déroulant "Assigné à" sur chaque fiche)
- Le tableau de bord affiche une vue par utilisateur pour les managers (comparatif des performances de l'équipe)


## Fonctionnalité 34 — Chatbot IA sur le site public de l'organisation

- Widget de chat intégrable sur le site web du client final (script embed, comme Intercom/Crisp), basé sur l'API Claude
- Répond aux questions des visiteurs à partir d'une base de connaissances éditable (FAQ, description de l'offre) définie par l'organisation
- Chaque conversation qualifiante (visiteur laisse email/téléphone) crée automatiquement un `Prospect` avec la source "Chatbot site web"
```prisma
model ChatbotConfig {
  id             String   @id @default(cuid())
  organisationId String
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  baseConnaissances String
  messageAccueil String
  actif          Boolean  @default(true)
}
model ConversationChatbot {
  id             String   @id @default(cuid())
  organisationId String
  prospectId     String?
  messages       String   // JSON.stringify de l'historique
  createdAt      DateTime @default(now())
}
```

## Fonctionnalité 35 — Intégration WhatsApp Business

- Canal d'outreach supplémentaire via l'API WhatsApp Business (Twilio ou Meta Cloud API directement)
- Envoi de messages template (validés WhatsApp) depuis la fiche prospect, même logique que les emails (fonctionnalité 16) : tracking de statut (envoyé/livré/lu), création automatique d'`Interaction` de type "WhatsApp"
```prisma
model MessageWhatsApp {
  id             String   @id @default(cuid())
  organisationId String
  prospectId     String
  contenu        String
  statut         String   @default("envoyé")
  dateEnvoi      DateTime @default(now())
  idProviderExterne String?
}
```
- Respecte le même contrôle bloquant de la `ListeNoirContact` (fonctionnalité 30) avant tout envoi

## Fonctionnalité 36 — Gamification d'équipe

- Page "Classement" affichant un leaderboard hebdomadaire/mensuel par commercial (appels passés, RDV pris, deals gagnés), calculé à partir des données déjà existantes (`Interaction`, `ProspectCampagne`)
- Badges automatiques (ex: "🔥 10 appels en un jour", "🎯 5 RDV cette semaine") stockés sur `Utilisateur`
- Activable/désactivable par organisation dans les paramètres (certaines équipes n'aiment pas ce type de compétition)
```prisma
model Badge {
  id            String @id @default(cuid())
  utilisateurId String
  nom           String
  dateObtention DateTime @default(now())
}
```

## Fonctionnalité 37 — Marketplace de templates

- Bibliothèque partagée (non liée à une organisation, gérée par le SuperAdmin) de templates prêts à l'emploi : séquences email par secteur, pitchs de vente, structures de pipeline type
- Bouton "Utiliser ce template" qui duplique le contenu dans l'organisation courante (templates email, séquences, étapes de campagne)
```prisma
model TemplateMarketplace {
  id       String @id @default(cuid())
  type     String // "sequence_email", "pitch", "pipeline"
  secteur  String?
  contenu  String
  auteur   String @default("Pulsia")
}
```

## Fonctionnalité 38 — Module de formation intégrée

- Page "Formation" avec des modules courts (texte + vidéo embarquée) sur les bonnes pratiques de prospection, accessible depuis le menu
- Suivi de progression par utilisateur (`FormationProgression`), visible par les managers
- Contenu gérable par le SuperAdmin, réutilisable pour tous les clients

## Fonctionnalité 39 — Bibliothèque de tactiques de vente + agent IA recommandeur

- Bibliothèque de fiches tactiques (inbound/outbound/allbound), gérée par le SuperAdmin, réutilisable pour toutes les organisations, catégorisée (prospection, qualification, négociation, closing, fidélisation) et filtrable par délai de mise en œuvre, coût, scalabilité
```prisma
model TactiqueVente {
  id           String @id @default(cuid())
  titre        String
  categorie    String
  type         String // "inbound", "outbound", "allbound"
  delai        String // "immédiat", "court terme", "long terme"
  cout         String // "gratuit", "faible", "élevé"
  scalabilite  String // "faible", "moyenne", "forte"
  definition   String
  methodePasAPas String
  exempleAvantApres String?
  erreursAEviter String?
}
```
- Page "Tactiques" avec filtres (comme décrit ci-dessus) et bouton "Copier la fiche"
- Chaque fiche peut être directement transformée en `TemplateEmail` ou en étape de `SequenceEmail` en un clic ("Utiliser comme template")
- Agent IA recommandeur : champ de texte libre ("Décris ta situation") sur la page Tactiques, envoyé à l'API Claude avec le contenu des fiches en contexte, qui retourne les 3-5 tactiques les plus pertinentes classées par pertinence — réutilise l'infrastructure IA déjà prévue en fonctionnalité 22 (route serveur uniquement, quota par plan)
- Lien naturel avec la Marketplace de templates (fonctionnalité 37) : les tactiques peuvent référencer un template associé

## Fonctionnalité 42 — Intake & routage des leads entrants (inbound)

Complète le volet outbound existant (sourcing SIRENE) par la gestion structurée des leads entrants (formulaire site, pub, chatbot fonctionnalité 34), selon une logique en 4 étapes : Intake → Qualification → Routage → Booking.

### Modèle de données
```prisma
model LeadEntrant {
  id             String   @id @default(cuid())
  organisationId String
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  prospectId     String?  // lié une fois transformé en Prospect
  source         String   // "formulaire_site", "pub_meta", "chatbot", "whatsapp", "autre"
  nom            String?
  email          String?
  telephone      String?
  entreprise     String?
  reponsesFormulaire String? // JSON.stringify des champs de qualification soumis
  scoreQualification Int    @default(0)
  statutIntake   String   @default("nouveau") // nouveau, qualifié, disqualifié, routé, rdv_pris
  assigneAId     String?
  assigneA       Utilisateur? @relation(fields: [assigneAId], references: [id])
  createdAt      DateTime @default(now())
}

model RegleRoutage {
  id             String   @id @default(cuid())
  organisationId String
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  nom            String
  condition      String   // JSON.stringify, ex: {"secteur": "SaaS", "scoreMin": 50}
  assigneAId     String
  ordre          Int
  actif          Boolean  @default(true)
}
```

### Étape 1 — Intake
- Endpoint public `/api/leads/capturer` (protégé par clé publique par organisation) que le client peut appeler depuis son formulaire de site web, pub Meta (via webhook Lead Ads), ou le chatbot (fonctionnalité 34)
- Chaque soumission crée un `LeadEntrant` en statut "nouveau"
- Page "Leads entrants" listant les nouvelles arrivées en temps réel (rafraîchissement automatique ou notification)

### Étape 2 — Qualification
- Formulaire de qualification configurable par organisation (questions personnalisées : budget, taille d'entreprise, urgence, etc.) affiché au lead ou rempli par le commercial après un premier contact
- Score de qualification calculé automatiquement (même logique que le scoring des fonctionnalité 12, formule adaptée aux critères d'intake configurés)
- Passage automatique en "qualifié" ou "disqualifié" selon un seuil configurable ; les leads disqualifiés restent visibles mais filtrés par défaut de la vue principale

### Étape 3 — Routage automatique
- Moteur de règles simple (`RegleRoutage`) évalué dans l'ordre : dès qu'une condition correspond (secteur, score minimum, taille d'entreprise, zone géographique), le lead est automatiquement assigné (`assigneAId`) au bon commercial — équivalent d'une distribution round-robin ou par spécialité
- Page "Règles de routage" dans les paramètres pour créer/réordonner ces règles (glisser-déposer, la première règle qui matche s'applique)
- Le lead qualifié et routé est automatiquement transformé en `Prospect` classique (avec toutes les fonctionnalités déjà prévues : pipeline, interactions, outreach) et son `prospectId` est renseigné sur le `LeadEntrant`

### Étape 4 — Booking (prise de RDV automatisée)
- Intégration d'un système de prise de rendez-vous type Cal.com (open-source, self-hostable, ou API Cal.com hébergée) plutôt que de reconstruire un calendrier de zéro
- Chaque commercial connecte son calendrier de disponibilités ; un lien de booking personnalisé est envoyé automatiquement au lead qualifié et routé (par email via fonctionnalité 16), lui permettant de choisir un créneau qui tombe directement dans l'agenda du bon commercial
- RDV confirmé = création automatique d'une `Interaction` de type "RDV" et passage du prospect à l'étape "RDV pris" dans son pipeline actif

### Feedback Loop (boucle d'amélioration)
- Une fois un `Prospect` issu d'un `LeadEntrant` marqué "Client" ou "Perdu" dans le pipeline, une tâche de fond compare rétrospectivement son score de qualification initial au résultat final
- Page "Analyse qualification" (visible des managers) montrant si les leads à score élevé se convertissent réellement mieux — permet d'ajuster manuellement les critères de qualification/règles de routage au fil du temps si l'écart est significatif (pas d'auto-ajustement automatique en V1, juste la donnée pour décider)

## Fonctionnalité 45 — Builder de quiz de qualification embeddable (lead magnet)

Extension du module Intake (fonctionnalité 42) : permet à chaque organisation de créer son propre quiz de diagnostic/qualification à poser sur son site, avec un rapport personnalisé délivré en échange des coordonnées — un lead magnet complet plutôt qu'un simple formulaire.

### Modèle de données
```prisma
model QuizQualification {
  id             String   @id @default(cuid())
  organisationId String
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  nom            String
  slug           String   @unique // pour l'URL publique et le script embed
  questions      QuestionQuiz[]
  messageIntro   String?
  actif          Boolean  @default(true)
  createdAt      DateTime @default(now())
}

model QuestionQuiz {
  id         String @id @default(cuid())
  quizId     String
  quiz       QuizQualification @relation(fields: [quizId], references: [id])
  ordre      Int
  intitule   String
  type       String // "choix_unique", "choix_multiple", "echelle", "texte_libre"
  options    String? // JSON.stringify des choix possibles
  poids      String? // JSON.stringify du barème de points par réponse, pour calculer le score final
}

model ReponseQuiz {
  id             String   @id @default(cuid())
  quizId         String
  quiz           QuizQualification @relation(fields: [quizId], references: [id])
  leadEntrantId  String?  // lié au LeadEntrant créé (fonctionnalité 42)
  reponses       String   // JSON.stringify des réponses données
  scoreFinal     Int
  profilResultat String?  // libellé du profil/segment obtenu (ex: "Prêt à passer à l'action")
  createdAt      DateTime @default(now())
}
```

### Implémentation
- Page "Quiz" (paramètres) : éditeur de quiz drag & drop pour construire les questions, définir un barème de points par réponse, et configurer des tranches de score → profil de résultat (ex: 0-30 pts = "Débutant", 31-70 = "En structuration", 71+ = "Prêt à accélérer"), chaque tranche avec son propre texte de rapport personnalisé
- Le champ de capture des coordonnées (nom, email, téléphone, entreprise) est positionné juste avant l'affichage du résultat final (pattern classique lead magnet : "Entrez votre email pour voir votre résultat personnalisé")
- Page publique auto-générée à `https://[domaine-app]/quiz/{slug}` accessible sans connexion, plus un script d'embed (`<script>` + `<div>`) pour l'intégrer directement sur le site du client comme un widget
- Chaque soumission complète crée un `ReponseQuiz` et, via les coordonnées capturées, un `LeadEntrant` (fonctionnalité 42) avec `source: "quiz_diagnostic"`, ce qui déclenche automatiquement le flow Qualification → Routage → Booking déjà en place
- Rapport de résultat affiché à l'écran ET envoyé par email (réutilise fonctionnalité 16), généré simplement à partir du texte configuré pour la tranche de score obtenue (pas besoin d'IA pour la V1 — texte statique configuré par organisation suffit, l'IA pourra être ajoutée en V2 pour personnaliser davantage si besoin)
- Statistiques par quiz (taux de complétion, répartition des profils obtenus, taux de conversion en RDV) visibles dans une page "Résultats" liée au quiz

## Fonctionnalité 48 — Agent IA conversationnel "chef d'orchestre" (pilotage en langage naturel)

Permet de piloter l'ensemble de la plateforme par instruction en langage naturel, via un chat intégré à l'app et/ou WhatsApp, plutôt que de naviguer dans les menus.

### Modèle de données
```prisma
model ConversationAgent {
  id             String   @id @default(cuid())
  organisationId String
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  utilisateurId  String
  canal          String   // "app", "whatsapp"
  messages       String   // JSON.stringify de l'historique (rôle + contenu)
  createdAt      DateTime @default(now())
}

model ActionAgent {
  id             String   @id @default(cuid())
  conversationId String
  conversation   ConversationAgent @relation(fields: [conversationId], references: [id])
  typeAction     String   // "recherche_entreprise", "creer_sequence", "relancer_prospects", "envoyer_email", etc.
  parametres     String   // JSON.stringify
  statut         String   @default("proposée") // proposée, validée, exécutée, refusée
  resultat       String?
  createdAt      DateTime @default(now())
}
```

### Implémentation
- Utilise l'API Claude avec **tool use / function calling** : chaque fonctionnalité clé de la plateforme (recherche SIRENE, import de prospects, création de séquence, envoi d'email, inscription à une campagne, relance en masse...) est exposée comme un "outil" que l'agent peut appeler, avec les mêmes routes API serveur déjà construites pour ces fonctionnalités (pas de nouvelle logique métier à dupliquer, juste une couche d'orchestration par-dessus l'existant)
- Toute action ayant un effet réel (envoi d'email, appel, modification de données) passe par le statut "proposée" avec un résumé clair affiché à l'utilisateur, qui doit valider explicitement avant exécution ("Je vais lancer une recherche 'restaurant' à Toulouse et importer les résultats. Confirmer ?") — jamais d'exécution automatique silencieuse sur des actions à impact, cohérent avec la règle déjà posée pour l'IA de qualification (fonctionnalité 22)
- Les actions purement en lecture (ex: "combien de prospects j'ai en RDV pris cette semaine ?") peuvent répondre directement sans validation
- Canal WhatsApp : intégration via l'API WhatsApp Business déjà prévue en fonctionnalité 35, où les messages entrants de l'utilisateur (identifié par son numéro) sont routés vers cet agent plutôt que vers un prospect
- Interface "app" : widget de chat flottant accessible depuis n'importe quelle page de l'application

## Fonctionnalité 49 — Agent vocal IA pour les appels entrants (standard téléphonique automatisé)

Complète la téléphonie sortante (fonctionnalité 18) par un agent vocal qui répond aux appels entrants 24/7, qualifie l'appelant et prend RDV automatiquement.

### Fournisseur
Utilise l'infrastructure Twilio déjà en place (fonctionnalité 18) combinée à un service de voix IA temps réel (ex: Twilio ConversationRelay ou équivalent connecté à l'API Claude pour la logique conversationnelle).

### Modèle de données
```prisma
model AppelEntrantIA {
  id             String   @id @default(cuid())
  organisationId String
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  numeroAppelant String
  transcription  String?
  resume         String?
  qualifie       Boolean  @default(false)
  rdvPrisId      String?  // lien vers l'événement de booking créé (fonctionnalité 42)
  statut         String   @default("en cours") // en cours, terminé, transféré à un humain
  dureeSecondes  Int?
  createdAt      DateTime @default(now())
}
```

### Implémentation
- Numéro Twilio dédié par organisation, configuré dans les paramètres, avec un script/prompt de qualification personnalisable par le client ("Bonjour, vous êtes bien chez [Nom entreprise]...")
- L'agent qualifie l'appelant selon les mêmes critères que le module Intake (fonctionnalité 42), crée un `LeadEntrant` avec `source: "appel_entrant_ia"`, et propose un créneau de RDV via l'intégration Cal.com déjà prévue
- Option de transfert vers un commercial humain si l'appelant le demande explicitement ou si la qualification IA détecte un cas complexe non couvert par le script
- Transcription et résumé automatique de l'appel (réutilise la logique de la fonctionnalité 22) consultables sur la fiche `LeadEntrant`/`Prospect` correspondante
- Rappel RGPD/légal : mention obligatoire en début d'appel informant que l'appelant échange avec un système automatisé et que l'appel est susceptible d'être enregistré/transcrit

