---
name: productivite-commerciale
description: Envoi/tracking d'emails, domain warming, séquences de relance, téléphonie clic-to-call, tableau de bord KPIs. Dépend des skills socle et coeur-metier.
---

# Skill — Itération 3 : Productivité commerciale

Prérequis : skills 00-socle-saas-multitenant et 01-coeur-metier-prospection déjà appliqués.

## Fonctionnalité 16 — Envoi et tracking d'emails réels

Remplace le simple lien `mailto:` par un vrai envoi transactionnel avec tracking.

### Fournisseur
Utilise **Resend** (API simple, bon niveau gratuit, conçu pour les développeurs) plutôt que de gérer un serveur SMTP soi-même. Alternative équivalente : Postmark ou SendGrid — laisse le choix du fournisseur configurable via variable d'environnement `EMAIL_PROVIDER`.

### Modèle de données
```prisma
model EmailEnvoye {
  id            String   @id @default(cuid())
  organisationId String
  organisation  Organisation @relation(fields: [organisationId], references: [id])
  prospectId    String
  prospect      Prospect @relation(fields: [prospectId], references: [id])
  contactId     String?
  templateId    String?
  objet         String
  corps         String
  statut        String   @default("envoyé") // envoyé, ouvert, cliqué, bounced, échec
  dateEnvoi     DateTime @default(now())
  dateOuverture DateTime?
  dateClic      DateTime?
  idProviderExterne String? // ID renvoyé par Resend pour faire le lien avec les webhooks
}
```

### Implémentation
- Route API `/api/emails/envoyer` : appelle l'API Resend côté serveur (jamais depuis le client), crée l'entrée `EmailEnvoye`, et crée automatiquement une `Interaction` de type "Email"
- Route API `/api/webhooks/resend` : reçoit les événements de tracking (email.opened, email.clicked, email.bounced) envoyés par Resend et met à jour le statut de l'`EmailEnvoye` correspondant
- Pixel de tracking et wrapping des liens géré nativement par Resend (pas besoin de le coder soi-même)
- Sur la fiche prospect, affiche l'historique des emails envoyés avec badge de statut (✅ Ouvert, 🖱️ Cliqué, ❌ Bounced)
- Rappel important dans le README : respecter le RGPD (mention de désabonnement obligatoire dans chaque email, lien de désinscription fonctionnel) — Resend fournit un helper pour gérer les suppressions


## Fonctionnalité 58 — Infrastructure de délivrabilité (domain warming)

Pour l'envoi d'emails à froid (outreach massif, séquences fonctionnalité 17) à grande échelle, un simple envoi via Resend sur le domaine principal de l'organisation risque de finir en spam. Ajoute une gestion dédiée du chauffage de domaines/boîtes mail.

### Modèle de données
```prisma
model BoiteMailOutreach {
  id             String   @id @default(cuid())
  organisationId String
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  adresseEmail   String   @unique
  domaine        String
  statutChauffage String  @default("en_chauffe") // en_chauffe, pret, en_pause
  scoreReputation Int?    // indicateur simple 0-100, recalculé périodiquement
  dateDebutChauffage DateTime @default(now())
  volumeJournalierActuel Int @default(0)
  volumeJournalierMax    Int @default(5) // augmente progressivement pendant la période de chauffe
}
```

### Implémentation
- Page "Domaines d'envoi" dans les paramètres : ajout d'une boîte mail dédiée à l'outreach (distincte de la boîte principale de l'organisation), avec vérification DNS (SPF/DKIM/DMARC) guidée pas à pas
- Tâche planifiée quotidienne `progresserChauffage` : augmente automatiquement `volumeJournalierMax` de façon progressive sur 2-4 semaines (ex: +2 emails/jour), en envoyant/recevant des emails de test entre boîtes du réseau de chauffage mutualisé de la plateforme (mécanisme classique de warm-up), jusqu'à atteindre un palier stable
- Les séquences d'emails (fonctionnalité 17) et l'envoi individuel (fonctionnalité 16) utilisent en priorité une `BoiteMailOutreach` au statut "pret" plutôt que le domaine principal de l'organisation, dès qu'une campagne dépasse un volume configurable (ex: >20 emails/jour)
- `scoreReputation` recalculé à partir du taux de bounce/plainte observé sur `EmailEnvoye` (fonctionnalité 16) — une boîte qui se dégrade repasse automatiquement en "en_pause" et alerte l'utilisateur
- Réservé aux paliers Pro et supérieurs (coût d'infrastructure non négligeable, cohérent avec la logique de paliers déjà posée)


## Fonctionnalité 17 — Séquences d'emails automatiques (relances multi-étapes)

### Modèle de données
```prisma
model SequenceEmail {
  id            String   @id @default(cuid())
  organisationId String
  organisation  Organisation @relation(fields: [organisationId], references: [id])
  nom           String
  etapes        EtapeSequence[]
  actif         Boolean  @default(true)
}

model EtapeSequence {
  id            String   @id @default(cuid())
  sequenceId    String
  sequence      SequenceEmail @relation(fields: [sequenceId], references: [id])
  ordre         Int
  delaiJours    Int      // ex: 0 (immédiat), 3, 7
  templateId    String
  template      TemplateEmail @relation(fields: [templateId], references: [id])
  condition     String   @default("toujours") // "toujours" ou "si_pas_de_reponse"
}

model ProspectSequence {
  id            String   @id @default(cuid())
  prospectId    String
  prospect      Prospect @relation(fields: [prospectId], references: [id])
  sequenceId    String
  sequence      SequenceEmail @relation(fields: [sequenceId], references: [id])
  etapeActuelle Int      @default(0)
  dateDebut     DateTime @default(now())
  statut        String   @default("en cours") // en cours, terminée, arrêtée (réponse reçue)
  prochainEnvoi DateTime?
}
```

### Implémentation
- Page "Séquences" pour créer une séquence : nom + liste d'étapes (template + délai en jours après l'étape précédente, ou après l'inscription)
- Depuis la fiche prospect ou en masse depuis la liste, bouton "Inscrire dans une séquence"
- Tâche planifiée (même mécanisme `node-cron` que la veille commerciale) qui tourne quotidiennement : pour chaque `ProspectSequence` "en cours" dont `prochainEnvoi` est aujourd'hui ou passé, envoie l'email de l'étape courante (via la fonctionnalité 16), avance `etapeActuelle`, recalcule `prochainEnvoi`
- **Arrêt automatique intelligent** : si une étape a la condition "si_pas_de_reponse" et qu'un `EmailEnvoye` précédent de ce prospect a un statut "cliqué" (signal de réponse probable) ou qu'une `Interaction` manuelle de type "Email" avec résultat "Répondu" a été loggée entre-temps, la séquence passe automatiquement en statut "arrêtée" pour cette étape — évite de relancer quelqu'un qui a déjà répondu
- Affichage sur la fiche prospect de la progression dans sa séquence active (étape actuelle / total, prochaine date d'envoi)

## Fonctionnalité 18 — Téléphonie intégrée (clic-to-call)

### Fournisseur
Utilise **Twilio** (Voice API) ou **Aircall** (plus orienté équipes commerciales, avec app desktop/mobile native déjà fournie par Aircall lui-même — souvent plus simple à intégrer qu'à reconstruire). Laisse le choix configurable, mais commence l'implémentation avec Twilio car son API est plus simple à intégrer directement dans une app custom.

### Modèle de données
```prisma
model Appel {
  id            String   @id @default(cuid())
  organisationId String
  organisation  Organisation @relation(fields: [organisationId], references: [id])
  prospectId    String
  prospect      Prospect @relation(fields: [prospectId], references: [id])
  utilisateurId String
  utilisateur   Utilisateur @relation(fields: [utilisateurId], references: [id])
  numeroAppele  String
  dureeSecondes Int?
  statut        String   // "en cours", "terminé", "manqué", "occupé"
  enregistrementUrl String?
  dateAppel     DateTime @default(now())
  idProviderExterne String?
}
```

### Implémentation
- Bouton "📞 Appeler" sur chaque contact/prospect qui déclenche un appel via l'API Twilio Voice (connecte le téléphone de l'utilisateur puis compose le numéro du prospect — pas d'appel direct depuis le navigateur en V1 pour rester simple, utilise le flow "click-to-call" classique de Twilio qui appelle d'abord l'utilisateur)
- Route API `/api/telephonie/webhook` qui reçoit les événements Twilio (appel terminé, durée, statut) et crée automatiquement l'entrée `Appel` + une `Interaction` de type "Appel" correspondante
- Si Twilio Recording est activé, stocke l'URL de l'enregistrement (attention RGPD : informer et obtenir le consentement pour l'enregistrement d'appel, mention obligatoire en France type "cet appel est susceptible d'être enregistré")
- Affiche la durée totale d'appels du jour/semaine sur le tableau de bord (déjà prévu en fonctionnalité 8, relie-le à cette nouvelle donnée réelle plutôt qu'aux `Interaction` saisies manuellement)


## Fonctionnalité 8 — Tableau de bord (KPIs)

Page "Tableau de bord" accessible depuis le menu principal, affichant :
- Nombre d'appels effectués aujourd'hui / cette semaine (calculé à partir des `Interaction` de type "Appel")
- Taux de conversion global (prospects "À appeler" → "RDV pris" → "Client")
- Taux de conversion par campagne (repris du module Pipeline)
- Graphique simple (barres) du nombre d'interactions par jour sur les 14 derniers jours
- Objectifs configurables : un champ "Objectif hebdo d'appels" et "Objectif hebdo de RDV" par utilisateur, avec une barre de progression comparant le réalisé à l'objectif
- Si mode multi-utilisateur activé : filtre par commercial, et vue globale équipe pour les managers


## Fonctionnalité 26 — Widget "Fuites détectées" (alertes actionnables sur le dashboard)

Ajoute sur le tableau de bord (fonctionnalité 8) un bloc "⚠️ Points d'attention" listant des alertes concrètes calculées en temps réel à partir des vraies données de l'organisation, plutôt que de simples chiffres bruts.

### Règles d'alerte (calculées côté serveur, `lib/alertes-dashboard.ts`)
- **Prospects sans relance** : prospects en étape "RDV pris" ou équivalent dans un pipeline depuis plus de X jours (seuil configurable, 10 jours par défaut) sans nouvelle `Interaction`
- **Fiches incomplètes** : nombre de prospects sans email vérifié ni téléphone vérifié ni contact décideur renseigné (donc difficilement exploitables)
- **Comptes dormants** : prospects sans aucune `Interaction` depuis plus de 21 jours alors qu'ils ne sont ni "Client" ni "Pas intéressé"
- **Séquences bloquées** : `ProspectSequence` en statut "en cours" dont le `prochainEnvoi` est dépassé de plus de 2 jours (signale un souci technique d'envoi, ex: clé API Resend invalide)
- **Relances en retard** : rappel direct du nombre de `ProspectCampagne` avec `relanceProgrammee` dépassée (déjà présent en fonctionnalité 5, mais remonté ici comme alerte visible en un coup d'œil)

### Affichage
- Chaque alerte affichée comme une carte avec : le nombre concerné, une phrase claire ("3 prospects en RDV pris depuis plus de 10 jours sans relance"), et un bouton d'action direct ("Voir la liste" → ouvre la vue Prospects déjà filtrée sur ces éléments précis, réutilise le système de `VueSauvegardee`/filtres existant)
- Alertes triées par urgence (nombre d'éléments concernés, ou ancienneté du problème)
- Si aucune alerte : message positif simple ("Rien à signaler, tout est à jour 👍") plutôt qu'un bloc vide

