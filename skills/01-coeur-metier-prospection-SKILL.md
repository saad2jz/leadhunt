---
name: coeur-metier-prospection
description: Moteur de recherche de prospection intelligente, enrichissement waterfall, gestion des prospects/contacts/pipeline. Dépend du skill socle-saas-multitenant (organisationId partout).
---

# Skill — Itération 2 : Cœur métier

Prérequis : skill 00-socle-saas-multitenant déjà appliqué. Toute route créée ici doit être scopée par organisationId (voir règle d'or dans le skill socle).

## Fonctionnalité 1bis — Moteur de recherche de prospection intelligente (remplace/étend la fonctionnalité 1)

Cette fonctionnalité remplace la recherche SIRENE simple par un moteur de recherche de prospection complet : point d'entrée + profil de besoin → écosystème d'entreprises identifié, décideurs extraits, buyer persona généré, double scoring Fit/Timing, plan d'approche recommandé. Conserve toute la logique de la fonctionnalité 1 (recherche SIRENE de base) comme brique technique sous-jacente, mais l'enrichit de bout en bout.

### Parcours utilisateur
```
[Nouvelle recherche de prospection]
   → Étape 1 : Point d'entrée (nom d'entreprise/groupe OU mots-clés sectoriels)
   → Étape 2 : Profil de besoin (formulaire structuré)
   → Étape 3 : Lancement du traitement (asynchrone)
   → Étape 4 : Résultats (4 vues : Entreprises / Décideurs / Buyer Persona / Plan d'approche)
```

### Modèle de données (Prisma) — remplace/étend le modèle Prospect existant
Tous les modèles ci-dessous incluent `organisationId` (voir architecture multi-tenant), sauf `EntrepriseCache` et `UsageAPI` qui sont des collections **globales partagées entre toutes les organisations** (justification : `EntrepriseCache` ne stocke que des données publiques SIRENE/Pappers, aucune fuite possible entre clients ; `UsageAPI` suit les quotas des clés API propres à l'éditeur de la plateforme, partagées par tous les clients tant que chaque organisation n'apporte pas ses propres clés).

```prisma
model RechercheProspection {
  id             String   @id @default(cuid())
  organisationId String
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  utilisateurId  String
  entryType      String   // "entreprise" ou "motscles"
  entryValue     String
  besoin         Json     // solutionType, tailleMin, tailleMax, zonesGeo[], secteurs[], budgetType, signauxAchat[], rolesDecideurs[], maxEntitesIA
  statut         String   @default("en_attente") // en_attente, en_cours, terminee, erreur
  createdAt      DateTime @default(now())
}

model EntrepriseCache {
  id           String   @id @default(cuid())
  siren        String   @unique
  nom          String
  secteur      String?
  effectif     String?
  ville        String?
  signauxBruts Json?
  enrichieLe   DateTime @default(now())
}

model EntrepriseTrouvee {
  id                String   @id @default(cuid())
  rechercheId       String
  recherche         RechercheProspection @relation(fields: [rechercheId], references: [id])
  organisationId    String
  entrepriseCacheId String?
  entrepriseCache   EntrepriseCache? @relation(fields: [entrepriseCacheId], references: [id])
  nom               String
  secteur           String?
  effectif          String?
  ville             String?
  fitScore          Int      @default(0)
  fitDetail         Json?
  timingScore       Int      @default(0)
  timingDetail      Json?
  statutCRM         String   @default("nouveau") // nouveau, deja_en_pipe, exclu
  prospectId        String?  // renseigné une fois importée comme Prospect classique
  createdAt         DateTime @default(now())
}

model DecideurTrouve {
  id                  String   @id @default(cuid())
  entrepriseTrouveeId String
  entrepriseTrouvee   EntrepriseTrouvee @relation(fields: [entrepriseTrouveeId], references: [id])
  nom                 String?
  fonction            String?
  seniorite            String?
  linkedinUrl         String?
  emailTrouve         String?
  emailStatutVerif    String?  // "verifie", "risque", "invalide", "non_teste"
  emailProbabiliteBounce Float?
  telephoneTrouve     String?
  telephoneType       String?  // "mobile", "fixe" (fixe non facturé, voir logique waterfall)
  telephoneActif      Boolean?
  telephoneNomCorrespond Boolean? // vérifie que le titulaire du numéro correspond au nom du décideur
  confiance           String   @default("manuelle") // haute, moyenne, faible, manuelle
  source              String   @default("manuel") // api, manuel
  fournisseursConsultes Json?  // liste des fournisseurs interrogés dans la cascade et leur résultat, pour traçabilité
  verifieLe           DateTime?
  createdAt           DateTime @default(now())
}

model BuyerPersona {
  id             String   @id @default(cuid())
  rechercheId    String
  recherche      RechercheProspection @relation(fields: [rechercheId], references: [id])
  roleTarget     String
  motivations    Json
  objections     Json
  vocabulaire    Json
  kpis           Json
  createdAt      DateTime @default(now())
}

model PlanApproche {
  id                  String   @id @default(cuid())
  entrepriseTrouveeId String   @unique
  entrepriseTrouvee   EntrepriseTrouvee @relation(fields: [entrepriseTrouveeId], references: [id])
  canalRecommande     String
  angleAccroche       String
  etapesSequence      Json
  messageDraft        String
  createdAt           DateTime @default(now())
}

model FeedbackScoring {
  id                String   @id @default(cuid())
  organisationId    String
  utilisateurId     String
  entiteId          String   // id de EntrepriseTrouvee ou DecideurTrouve
  typeEntite         String   // "entreprise" ou "decideur"
  vote              String   // "pertinent" ou "pas_pertinent"
  scoreDetailAuVote  Json
  createdAt         DateTime @default(now())
}

model PoidsScoring {
  id             String   @id @default(cuid())
  utilisateurId  String   @unique
  poidsFit       Json     // pondérations ajustées par recalibrateWeights
  poidsTiming    Json
  updatedAt      DateTime @updatedAt
}

model UsageAPI {
  id             String   @id @default(cuid())
  nomApi         String   @unique // "pappers", "hunter", "apollo"
  limiteMensuelle Int
  compteurActuel Int      @default(0)
  debutPeriode   DateTime @default(now())
  finPeriode     DateTime?
  dernierAppel   DateTime?
  statut         String   @default("ok") // ok, warning, exhausted
}
```

### Étape 1 & 2 — Formulaire
- Point d'entrée : nom d'entreprise/groupe OU mots-clés sectoriels
- Profil de besoin : type de solution vendue, taille cible (min/max effectif), zones géographiques (multi-select), secteurs NAF (multi-select), budget type, signaux d'achat recherchés (tags : levée de fonds, recrutement, refonte site, changement de stack...), rôles décideurs recherchés (tags : CTO, DAF, Head of Sales...)
- Champ `maxEntitesIA` avec estimation du coût/quota IA affichée avant lancement

### Étape 3 — Traitement asynchrone
- Route API `/api/prospection/lancer` qui crée une `RechercheProspection` en statut "en_attente", puis traite en arrière-plan (queue légère via `node-cron`/BullMQ, ou traitement direct si le volume reste raisonnable pour une V1) :
  1. Pour chaque entreprise candidate, vérifie `EntrepriseCache` (réutilise si `enrichieLe` < 30 jours), sinon interroge l'API SIRENE (gratuite, non soumise à quota) et enrichit optionnellement via Pappers (sous contrôle de quota, voir plus bas)
  2. Extrait et enrichit les décideurs via le moteur d'enrichissement waterfall décrit en fonctionnalité 55 ci-dessous (cascade multi-fournisseurs avec triple vérification), stocke uniquement l'URL LinkedIn publique (jamais de scraping direct — même règle que le reste du prompt)
  3. Calcule `fitScore`/`fitDetail` et `timingScore`/`timingDetail` selon la pondération (voir ci-dessous)
  4. Génère le `BuyerPersona` et, pour les `maxEntitesIA` entreprises au fitScore le plus élevé, le `PlanApproche` via l'API Claude (réutilise l'infrastructure IA de la fonctionnalité 22)
  5. Passe `RechercheProspection.statut` à "terminee"
- Le frontend suit la progression en temps réel (polling léger ou websocket simple sur le statut)

### Étape 4 — Résultats (4 vues)
- **Entreprises** : table triable/filtrable par fitScore ET timingScore séparément (deux badges distincts, pas un score fusionné — une entreprise peut être un excellent fit mais pas encore mûre), badge `statutCRM`
- **Décideurs** : regroupés par entreprise, badge de confiance + date de vérification, bouton "Ajouter un contact manuellement" si l'API n'a rien trouvé
- **Buyer Persona** : carte de synthèse (motivations, objections, vocabulaire, KPIs)
- **Plan d'approche** : par entreprise, avec `messageDraft` copiable en un clic
- Bouton "Importer en prospect" sur chaque entreprise trouvée → crée un `Prospect` classique (réutilise tout l'écosystème déjà construit : pipeline, interactions, outreach, CRM externe) et renseigne `prospectId` sur l'`EntrepriseTrouvee`

### Double scoring Fit / Timing
**Score de Fit** (adéquation structurelle, 0-100, pondération par défaut) : secteur 30% / taille effectif 25% / zone géo 20% / présence décideur au rôle recherché 25%
**Score de Timing** (opportunité du moment, 0-100, pondération par défaut) : signal financier 30% / signal RH (relié au module Signaux d'embauche, fonctionnalité 29) 30% / signal technique 25% / fraîcheur du dernier signal 15%
Les pondérations sont ajustables par sliders utilisateur et stockées dans `PoidsScoring`.

### Boucle de feedback (apprentissage des poids)
- Boutons "Pertinent"/"Pas pertinent" sur chaque carte entreprise/décideur → crée un `FeedbackScoring`
- Tâche planifiée hebdomadaire `recalibrerPoids` : calcule par utilisateur la corrélation simple entre chaque critère de score et les votes positifs, ajuste `PoidsScoring` en conséquence (régression simple, pas de ML complexe pour cette V1)

### Suivi de quota API (`UsageAPI`)
- Avant tout appel Pappers/Hunter/Apollo, une fonction utilitaire serveur `verifierQuotaAPI(nomApi)` lit/incrémente atomiquement `UsageAPI.compteurActuel` (transaction Prisma) et retourne si l'appel est autorisé — jamais d'appel externe sans ce contrôle préalable, pour basculer vers le fallback suivant *avant* de recevoir une erreur 429 plutôt qu'en réaction
- Si non autorisé : Pappers → continue avec Sirene seul ; Hunter → tente Apollo ; Apollo aussi épuisé → décideurs vides, ajout manuel proposé
- Quotas par défaut : Pappers 100/mois, Hunter 50/mois, Apollo 75/mois, et les autres fournisseurs de la cascade waterfall (fonctionnalité 55) configurés au cas par cas selon les forfaits souscrits par l'éditeur (Wiza, Snov, ContactOut, Anymailfinder, Clearbit) — tous suivis dans le même système `UsageAPI`
- Tâche planifiée mensuelle `reinitialiserQuotaAPI` qui remet chaque `compteurActuel` à 0
- Widget "Usage API" (paramètres ou header) affichant une barre de progression par API (verte <70%, orange 70-90%, rouge >90%) et les jours avant réinitialisation, alimenté par une route `/api/quota/resume`

### Historique & export
- Page "Mes recherches" listant les `RechercheProspection` de l'utilisateur/organisation
- Export CSV des résultats d'une recherche, en plus de l'export CSV déjà prévu sur la liste des prospects classiques (fonctionnalité 3)


## Fonctionnalité 57 — Découverte automatique de l'ICP depuis un simple domaine

Alternative automatisée au formulaire "profil de besoin" de la fonctionnalité 1bis : plutôt que l'utilisateur remplisse manuellement ses critères de ciblage, l'IA les déduit elle-même à partir de son site web.

### Modèle de données
```prisma
model ICPDecouvert {
  id             String   @id @default(cuid())
  organisationId String
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  domaineAnalyse String
  resumeActivite String
  concurrentsIdentifies Json  // liste de domaines concurrents trouvés
  segmentsProposes Json       // liste de {segment, fitScoreEstime} ex: [{"nom": "Cabinets d'expertise comptable", "score": 87}]
  besoinGenere   Json         // même structure que le champ `besoin` de RechercheProspection, pré-rempli
  createdAt      DateTime @default(now())
}
```

### Implémentation
- Écran d'accueil du module de prospection : champ unique "Ton site web" en alternative au formulaire complet
- Route serveur `/api/icp/decouvrir` : récupère le contenu du site (via `web_fetch`-like côté serveur), l'envoie à l'API Claude avec une consigne d'analyse (activité, positionnement, clients probables), cherche 5-6 concurrents plausibles via une recherche web côté serveur, puis en déduit une liste de segments cibles classés par pertinence estimée
- Résultat affiché comme un pré-remplissage éditable du formulaire "profil de besoin" existant (fonctionnalité 1bis, étape 2) — l'utilisateur peut ajuster avant de lancer la recherche réelle, jamais lancé automatiquement sans validation
- Alimente aussi le module Buyer Persona déjà existant : le `resumeActivite` peut servir de contexte supplémentaire à `generatePersona`


## Fonctionnalité 55 — Moteur d'enrichissement waterfall (emails & téléphones)

Remplace l'enrichissement simple Hunter→Apollo par une vraie cascade multi-fournisseurs façon FullEnrich, avec triple vérification, pour maximiser le taux de trouvaille de contacts fiables plutôt que de dépendre d'un seul fournisseur.

### Modèle de données
```prisma
model FournisseurEnrichissement {
  id             String   @id @default(cuid())
  nom            String   @unique // "hunter", "apollo", "wiza", "snov", "contactout", "anymailfinder", "clearbit"
  typeDonnee     String   // "email", "telephone", "les_deux"
  ordrePriorite  Int      // ordre dans la cascade par défaut
  zonesGeoFortes Json?    // ex: {"US": 0.87, "EMEA": 0.71, "APAC": 0.65} — taux de succès indicatif par zone, pour réordonner la cascade selon le pays du prospect
  actif          Boolean  @default(true)
}

model VerificationEmail {
  id           String   @id @default(cuid())
  decideurId   String
  decideur     DecideurTrouve @relation(fields: [decideurId], references: [id])
  moteur       String   // nom du moteur de vérification utilisé
  resultat     String   // "valide", "risque", "invalide"
  createdAt    DateTime @default(now())
}
```

### Logique de cascade (waterfall)
- Route serveur `enrichirDecideur(nom, entreprise, paysProbable)` :
  1. Détermine l'ordre des fournisseurs à interroger : ordre par défaut (`ordrePriorite`) réordonné selon `zonesGeoFortes` si le pays de l'entreprise est connu (privilégie le fournisseur le plus performant sur cette zone)
  2. Pour chaque fournisseur dans l'ordre, appelle `verifierQuotaAPI(nomFournisseur)` (réutilise le système de quota déjà en place, fonctionnalité 55 s'appuie sur le même `UsageAPI`/`verifierQuotaAPI` que la fonctionnalité 1bis) avant tout appel
  3. S'arrête dès qu'un résultat exploitable (email ET/OU téléphone) est trouvé — pas besoin d'interroger tous les fournisseurs si le premier suffit, pour économiser le quota
  4. Enregistre dans `fournisseursConsultes` (JSON) la liste des fournisseurs réellement interrogés et leur résultat, pour traçabilité et debug

### Triple vérification email
- Un email n'est marqué `emailStatutVerif: "verifie"` que si au moins 3 moteurs de vérification indépendants (ex: vérification syntaxique + vérification MX/domaine + vérification SMTP réelle) sont d'accord — sinon `"risque"` ou `"invalide"`
- Résolution des domaines "catch-all" (qui acceptent tous les emails sans erreur) : au lieu de simplement flaguer "risque" et abandonner, tente une résolution plus poussée (heuristique de format d'email le plus probable de l'entreprise, croisée avec les patterns déjà connus dans `EntrepriseCache` pour ce domaine)
- Chaque `VerificationEmail` est stockée pour traçabilité ; `emailProbabiliteBounce` est calculé à partir du consensus des moteurs (0% si triple validation, plus élevé si accord partiel)

### Téléphones — mobile-first avec vérification du titulaire
- Ne conserve et ne facture (au sens du quota `UsageAPI`) que les numéros de type `"mobile"` — les fixes trouvés restent affichés gratuitement mais ne comptent pas dans le quota consommé
- `telephoneActif` : vérifié via une requête réseau opérateur si le fournisseur le propose (évite de stocker des lignes mortes)
- `telephoneNomCorrespond` : compare le nom associé au numéro (si fourni par le fournisseur) au nom du décideur recherché — un numéro trouvé mais associé à un nom différent est affiché avec un avertissement plutôt que présenté comme fiable

### Entrées d'enrichissement multiples
En complément du flux "depuis une recherche de prospection" (fonctionnalité 1bis), ajoute trois autres points d'entrée cohérents avec le reste de la plateforme :
- **Manuel** : déjà existant (ajout un par un depuis la fiche prospect)
- **Depuis un CSV** : réutilise l'import CSV existant (fonctionnalité 4bis) en ajoutant une option "Enrichir automatiquement après import" qui déclenche `enrichirDecideur` pour chaque ligne important un nom/entreprise sans email/téléphone déjà renseigné
- **Depuis le CRM externe déjà connecté** (fonctionnalité 15) : bouton "Enrichir les contacts incomplets depuis mon CRM" qui synchronise dans l'autre sens — lit les contacts du CRM sans email/téléphone, les enrichit, puis repousse la donnée enrichie vers le CRM

### Widget "Gain de pipeline"
- Sur la page Intégrations ou dans le tableau de bord, affiche une estimation simple du gain apporté par la cascade multi-fournisseurs par rapport à un seul fournisseur : pourcentage de contacts réellement joignables (email vérifié OU mobile actif) sur le total enrichi ce mois-ci, comparé à ce qu'aurait donné le premier fournisseur seul (calculable a posteriori à partir de `fournisseursConsultes` : combien de contacts n'ont été trouvés qu'au 2e/3e fournisseur de la cascade)
- Message simple type "Ce mois-ci, la cascade a trouvé 38% de contacts en plus que si vous n'aviez utilisé que [fournisseur principal]"


## Fonctionnalité 2 — Liste des prospects (page principale)
Un tableau avec les colonnes :
- Établissement (nom)
- Ville
- Secteur (dérivé du code NAF, catégorisé en grandes familles : Restauration & Cafés, Commerce de détail, Artisans & BTP, Hébergement & Tourisme, Services & Divers, etc.)
- Catégorie (libellé NAF précis)
- Téléphone (vide si non renseigné — l'API SIRENE ne fournit pas toujours ce champ, prévoir un champ éditable manuellement)
- Statut (menu déroulant : "À appeler", "Appelé", "Injoignable", "RDV pris", "Pas intéressé", "Client")
- Assigné (texte libre, nom du commercial)
- Note (1 à 5 étoiles, cliquable)

Au-dessus du tableau :
- Compteur total de prospects
- Barre de recherche libre (nom, ville, adresse, email, téléphone)
- Filtres : Ville, Département, Secteur, Statut, Email vérifié (checkbox), Téléphone vérifié (checkbox), Site vérifié (checkbox), Note (étoiles min)
- Boutons : "Export CSV", "Autres formats" (Excel), "+ Ajouter un prospect" (formulaire manuel), "Rechercher une entreprise" (ouvre la modale), "Importer CSV"

## Fonctionnalité 3 — Fiche décideur & prise de contact (spécifique commerciaux/ingénieurs d'affaires)

L'API SIRENE fournit un "représentant légal" (souvent le gérant/PDG déclaré), mais ce n'est pas toujours le bon interlocuteur commercial (ex: le décideur achat, le DAF, le responsable technique). Ajoute donc une fiche décideur enrichie sur chaque prospect :

- Champs éditables : Nom du décideur, Fonction (Dirigeant / Responsable achats / DAF / Directeur technique / Autre), Téléphone direct, Email direct, Notes
- Possibilité d'ajouter plusieurs contacts par entreprise (table `Contact` liée au `Prospect`, un prospect peut avoir N contacts)
- Un bouton "🔗 Chercher sur LinkedIn" à côté de chaque contact qui génère et ouvre dans un nouvel onglet une URL de recherche LinkedIn pré-remplie :
  `https://www.linkedin.com/search/results/people/?keywords={nom encodé}%20{entreprise encodée}`
  → Important : on ne scrape JAMAIS LinkedIn automatiquement (c'est interdit par leurs CGU, risque de bannissement de compte et de poursuites judiciaires). On se contente d'ouvrir un lien de recherche que l'utilisateur consulte lui-même manuellement.
- Un bouton "🔗 Chercher l'entreprise sur LinkedIn" (même logique, avec juste le nom de l'entreprise)
- Champ libre "URL LinkedIn du contact" que le commercial remplit une fois qu'il a trouvé le bon profil manuellement — ce lien s'affiche ensuite comme bouton cliquable direct sur la fiche

### Import Sales Navigator (légal)
Un bouton "Importer depuis LinkedIn Sales Navigator" qui accepte un export CSV que l'utilisateur télécharge lui-même depuis son compte Sales Navigator (fonctionnalité native de LinkedIn), et mappe les colonnes (nom, poste, entreprise, lien profil) vers la table `Contact`. On ne se connecte jamais directement à LinkedIn — tout passe par un export/import manuel fait par l'utilisateur, ce qui reste dans les clous de leurs CGU.

### Argumentaire de vente contextualisé
Un champ "Pitch suggéré" par secteur (mapping simple secteur → accroche commerciale type, éditable par l'utilisateur dans un fichier de config `lib/pitch-templates.ts`), affiché sur la fiche prospect pour préparer l'appel rapidement.

### Historique de contact (mini-CRM)
Table `Interaction` liée au `Prospect` : date, type (Appel / Email / LinkedIn / RDV), résultat, notes libres. Affiché en timeline sur la fiche détaillée du prospect (clic sur une ligne du tableau → page détail avec tous les contacts + tout l'historique).

## Modèle de données complémentaire (Prisma)
```prisma
model Contact {
  id          String   @id @default(cuid())
  prospectId  String
  prospect    Prospect @relation(fields: [prospectId], references: [id])
  nom         String
  fonction    String?
  telephone   String?
  email       String?
  linkedinUrl String?
  notes       String?
  createdAt   DateTime @default(now())
}

model Interaction {
  id         String   @id @default(cuid())
  prospectId String
  prospect   Prospect @relation(fields: [prospectId], references: [id])
  date       DateTime @default(now())
  type       String   // Appel, Email, LinkedIn, RDV
  resultat   String?
  notes      String?
}
```
(Ajoute les relations inverses `contacts Contact[]` et `interactions Interaction[]` sur le modèle `Prospect`.)


## Fonctionnalité 4 — Import/Export CSV
- Export : génère un CSV de tous les prospects filtrés actuellement affichés
- Import : upload d'un CSV avec mapping des colonnes vers les champs de la base

## Fonctionnalité 5 — Campagnes & Pipeline (vue kanban)

Ajoute un module "Campagnes" qui permet de gérer des séquences de prospection structurées, façon pipeline commercial visuel.

### Modèle de données
```prisma
model Campagne {
  id          String   @id @default(cuid())
  nom         String
  description String?
  etapes      Etape[]
  createdAt   DateTime @default(now())
}

model Etape {
  id          String   @id @default(cuid())
  campagneId  String
  campagne    Campagne @relation(fields: [campagneId], references: [id])
  nom         String   // ex: Qualification, Premier contact, Relance, RDV pris, Closing, Perdu
  ordre       Int      // position dans le pipeline (0, 1, 2...)
  couleur     String?  // couleur de la colonne kanban
  prospects   ProspectCampagne[]
}

model ProspectCampagne {
  id          String   @id @default(cuid())
  prospectId  String
  prospect    Prospect @relation(fields: [prospectId], references: [id])
  campagneId  String
  campagne    Campagne @relation(fields: [campagneId], references: [id])
  etapeId     String
  etape       Etape    @relation(fields: [etapeId], references: [id])
  dateEntreeEtape DateTime @default(now())
  relanceProgrammee DateTime?
  notes       String?
}
```
(Ajoute la relation inverse `campagnes ProspectCampagne[]` sur `Prospect`.)

### Page "Campagnes" (liste)
- Liste des campagnes créées, avec bouton "+ Nouvelle campagne"
- À la création : nom, description, et étapes du pipeline (5 étapes par défaut proposées : Qualification, Premier contact, Relance, RDV pris, Closing/Gagné — plus une colonne "Perdu" toujours présente et non supprimable), chaque étape personnalisable/renommable/réordonnable (drag & drop) et supprimable (sauf "Perdu")
- Compteur de prospects par campagne

### Vue Kanban (page détail d'une campagne)
- Une colonne par étape, avec le nom de l'étape et le nombre de prospects dedans
- Chaque prospect affiché comme une carte : nom entreprise, ville, secteur, contact décideur principal (nom + fonction), date d'entrée dans l'étape, badge si une relance est programmée et en retard (rouge) ou à venir (orange)
- Drag & drop d'une carte vers une autre colonne = change l'étape du prospect (met à jour `etapeId` et `dateEntreeEtape`)
- Clic sur une carte → ouvre un panneau latéral (drawer) avec les détails du prospect, ses contacts, son historique d'interactions, et un champ pour programmer la prochaine relance (date + notes)
- Bouton "+ Ajouter des prospects à cette campagne" qui ouvre une modale de sélection multiple depuis la liste globale des prospects (avec les mêmes filtres que la page Prospects)

### Statistiques de conversion
En haut de la vue kanban, une barre affichant le taux de passage d'une étape à l'autre (ex: "42 en Qualification → 18 en Premier contact (43%) → 7 en RDV pris (39%) → 3 Closing (43%)"), calculée simplement à partir du nombre de prospects actuellement dans chaque étape (pas besoin d'historique complexe pour la V1).

### Relances programmées
- Page "Mes relances du jour" accessible depuis le menu principal, qui liste tous les `ProspectCampagne` dont `relanceProgrammee` est aujourd'hui ou en retard, tous pipelines confondus, triés par urgence
- Chaque ligne permet de logger rapidement l'interaction (via le modèle `Interaction` déjà défini) et de reprogrammer ou clore la relance


## Fonctionnalité 31 — Anti-doublon territorial entre commerciaux

Évite que deux commerciaux de la même organisation contactent le même prospect sans le savoir.

### Implémentation
- Sur la fiche prospect (déjà rattachée à un `assigneAId`), affiche un bandeau d'avertissement si un autre utilisateur que celui actuellement connecté consulte un prospect déjà assigné à quelqu'un d'autre : "⚠️ Ce prospect est assigné à [Nom]. Dernière interaction le [date]."
- Lorsqu'un utilisateur tente de logger une nouvelle `Interaction` (appel, email) sur un prospect assigné à un autre utilisateur, affiche une confirmation explicite avant de continuer ("Ce prospect est suivi par [Nom], voulez-vous vraiment continuer ?") plutôt qu'un blocage total (un manager ou un remplaçant temporaire doit pouvoir agir si besoin)
- Alerte proactive pour les managers : ajoute une règle au widget "Fuites détectées" (fonctionnalité 26) — "2 prospects ont reçu une interaction de plusieurs commerciaux différents cette semaine" — pour repérer les chevauchements a posteriori sans bloquer le travail au quotidien
- Optionnel et configurable par organisation : règle de "verrouillage territorial" stricte (empêche complètement qu'un prospect assigné à quelqu'un soit modifié par un autre utilisateur non-manager) activable dans les paramètres pour les organisations qui en ont besoin, désactivée par défaut pour ne pas freiner les petites équipes


## Fonctionnalité 53 — Ajout manuel
Formulaire simple pour ajouter un prospect à la main (nom, ville, secteur, téléphone, email, notes), avec possibilité d'ajouter directement un ou plusieurs contacts décideurs dans la foulée.


## Fonctionnalité 56 — Page détail prospect
Clic sur une ligne du tableau → page dédiée affichant :
- Toutes les infos de l'entreprise (fiche SIRENE complète)
- La liste des contacts/décideurs avec boutons LinkedIn et coordonnées
- L'historique complet des interactions (timeline)
- Le pitch suggéré
- Un formulaire rapide "Logger une interaction" (appel passé, résultat, notes)
- Les campagnes/pipelines dans lesquels ce prospect figure actuellement, avec son étape en cours et bouton pour l'ajouter à une nouvelle campagne
- Le statut de synchronisation CRM (idExterneCRM présent ou non, date de dernière synchro, bouton pour synchroniser/re-synchroniser manuellement)

## Modèle de données (Prisma schema)
Rappel : chaque modèle ci-dessous doit inclure `organisationId String` + relation vers `Organisation` (voir section Architecture en haut de ce prompt), même si ce n'est pas systématiquement réécrit dans chaque bloc de code de ce prompt pour rester lisible.

```prisma
model Prospect {
  id            String   @id @default(cuid())
  organisationId String
  organisation  Organisation @relation(fields: [organisationId], references: [id])
  nom           String
  siren         String?
  formeJuridique String?
  adresse       String?
  ville         String?
  departement   String?
  codeNaf       String?
  secteur       String?
  categorie     String?
  dirigeant     String?
  effectif      String?
  telephone     String?
  telephoneVerifie Boolean @default(false)
  email         String?
  emailVerifie  Boolean @default(false)
  siteWeb       String?
  siteVerifie   Boolean @default(false)
  statut        String   @default("À appeler")
  assigneAId    String?
  assigneA      Utilisateur? @relation(fields: [assigneAId], references: [id])
  note          Int      @default(0)
  score         Int      @default(0)
  latitude      Float?
  longitude     Float?
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

