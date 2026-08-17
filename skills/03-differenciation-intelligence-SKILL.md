---
name: differenciation-intelligence
description: Veille commerciale, carte géographique, scoring automatique, IA de qualification, signaux d'embauche, auto-optimisation des campagnes. Dépend des skills précédents.
---

# Skill — Itération 4 : Différenciation & intelligence

Prérequis : skills 00, 01, 02 déjà appliqués.

## Fonctionnalité 9 — Veille commerciale (nouvelles entreprises créées)

L'API `recherche-entreprises.api.gouv.fr` permet de filtrer par date de création. Ajoute :
- Un modèle `AlerteVeille` : nom, critères (secteur/NAF, département, forme juridique), fréquence (quotidienne/hebdo)
```prisma
model AlerteVeille {
  id           String   @id @default(cuid())
  nom          String
  codeNaf      String?
  departement  String?
  formeJuridique String?
  frequence    String   @default("quotidienne")
  derniereExecution DateTime?
  actif        Boolean  @default(true)
  createdAt    DateTime @default(now())
}
```
- Une page "Veille" listant les alertes configurées et les nouvelles entreprises détectées à chaque exécution (table `NouvelleEntreprise` liée à l'alerte, avec statut "Nouvelle" / "Vue" / "Importée en prospect")
- Un bouton "Importer en prospect" directement depuis cette liste
- Une tâche planifiée (cron via `node-cron` ou route API appelée manuellement pour la V1, en attendant un vrai scheduler en prod) qui interroge l'API avec le paramètre de date de création (les 7 derniers jours) pour chaque alerte active et insère les nouveaux résultats non déjà connus (dédoublonnage par SIREN)
- Badge "🆕 Nouvelle création" sur la fiche entreprise si elle a moins de 6 mois d'existence (info disponible dans la réponse de l'API SIRENE)

## Fonctionnalité 10 — Vues sauvegardées & carte géographique

### Vues sauvegardées
- Un modèle `VueSauvegardee` : nom, filtres (JSON stringifié reprenant tous les filtres de la page Prospects : ville, département, secteur, statut, email/tél/site vérifié, note min)
```prisma
model VueSauvegardee {
  id      String @id @default(cuid())
  nom     String
  filtres String // JSON.stringify des filtres actifs
  createdAt DateTime @default(now())
}
```
- Sur la page Prospects, un menu déroulant "Vues" listant les vues enregistrées (clic = applique tous les filtres d'un coup), avec un bouton "Enregistrer la vue actuelle" qui ouvre une modale pour nommer et sauvegarder la combinaison de filtres en cours

### Carte géographique
- Page "Carte" affichant tous les prospects filtrés (mêmes filtres que la page Prospects) sous forme de marqueurs sur une carte de France
- Utilise `react-leaflet` + OpenStreetMap (gratuit, pas de clé API contrairement à Google Maps)
- Géocodage : au moment de l'import d'un prospect, si l'adresse est connue, géocoder via l'API gratuite `https://api-adresse.data.gouv.fr/search/` (Base Adresse Nationale, publique et gratuite, pas de clé) et stocker `latitude`/`longitude` sur le `Prospect`
- Clic sur un marqueur → popup avec nom, ville, statut, et lien vers la fiche détail
- Bouton "Optimiser une tournée" (V1 simple : trie les marqueurs sélectionnés par proximité géographique via une fonction de tri glouton par distance, pas besoin d'un vrai algorithme de VRP pour commencer)

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

## Fonctionnalité 12 — Templates d'email & scoring automatique

### Templates d'email (mail merge)
- Modèle `TemplateEmail` : nom, objet, corps (avec variables `{prenom}`, `{nom}`, `{entreprise}`, `{secteur}`, `{ville}`, `{fonction}`)
```prisma
model TemplateEmail {
  id     String @id @default(cuid())
  nom    String
  objet  String
  corps  String
  createdAt DateTime @default(now())
}
```
- Page "Templates" pour créer/éditer ces modèles
- Sur la fiche contact d'un prospect, un bouton "Envoyer un email" qui ouvre une modale : sélection d'un template, aperçu avec les variables déjà remplacées automatiquement à partir des données du contact/prospect, puis bouton "Ouvrir dans mon client mail" qui génère un lien `mailto:` pré-rempli (objet + corps encodés en URL) — pas d'envoi automatique depuis l'outil en V1 pour rester simple et éviter la gestion SMTP/anti-spam
- Chaque envoi via ce bouton crée automatiquement une `Interaction` de type "Email" dans l'historique

### Scoring automatique des prospects
- Ajoute un champ `score Int @default(0)` sur `Prospect`, recalculé automatiquement selon une formule simple et configurable dans `lib/scoring.ts`, par exemple :
  - +20 points si email vérifié présent
  - +20 points si téléphone vérifié présent
  - +15 points si un contact décideur est renseigné
  - +15 points si effectif ≥ 10 salariés
  - +10 points si l'entreprise a moins de 2 ans (signal de dynamisme/besoin d'équipement)
  - +20 points si au moins une interaction positive a déjà eu lieu (RDV pris)
- Affiche le score sous forme de badge coloré (🔴 <30, 🟠 30-60, 🟢 >60) dans le tableau de la liste des prospects, avec possibilité de trier/filtrer par score
- Recalcul du score déclenché automatiquement à chaque mise à jour du prospect (via un hook Prisma middleware ou simplement recalculé côté API à chaque `update`)


## Fonctionnalité 22 — IA de qualification automatique

### Fournisseur
Utilise l'**API Anthropic (Claude)** via le SDK officiel — cohérent puisque ce prompt est destiné à être exécuté par un outil Claude/Codex, et Claude est bien adapté aux tâches de résumé et classification en français.

### Cas d'usage
1. **Résumé automatique d'appel** : si un enregistrement d'appel existe (fonctionnalité 18) ou si l'utilisateur saisit des notes libres après un appel, un bouton "✨ Résumer avec l'IA" envoie le texte à l'API Claude avec un prompt du type "Résume cet appel commercial en 3 points clés : besoin exprimé, objections, prochaine étape" et affiche le résumé, éditable par l'utilisateur avant sauvegarde dans l'`Interaction`
2. **Détection d'intention/score qualitatif** : après chaque interaction significative (appel avec notes, réponse à un email), un appel API Claude classifie l'intention perçue ("Chaud / Tiède / Froid") à partir des notes, et suggère une action ("Programmer un RDV", "Relancer dans 2 semaines", "Marquer comme perdu") — affiché comme suggestion non-bloquante que le commercial valide ou ignore, jamais appliqué automatiquement sans validation humaine
3. **Aide à la rédaction d'email de relance** : bouton "✨ Suggérer une relance" sur la fiche prospect qui génère un brouillon d'email personnalisé à partir de l'historique d'interactions, que l'utilisateur peut éditer avant envoi

### Modèle de données
```prisma
model AnalyseIA {
  id            String   @id @default(cuid())
  interactionId String
  interaction   Interaction @relation(fields: [interactionId], references: [id])
  resume        String?
  intentionDetectee String? // "Chaud", "Tiède", "Froid"
  actionSuggeree String?
  createdAt     DateTime @default(now())
}
```

### Implémentation
- Toutes les requêtes vers l'API Claude passent par une route serveur (`/api/ia/analyser`), jamais depuis le client, pour ne pas exposer la clé API
- Prévoir une limite d'usage par organisation selon son plan (ex: le plan "starter" a un quota mensuel d'analyses IA, consultable dans les paramètres) pour maîtriser les coûts d'API à l'échelle du SaaS
- Toujours garder un humain dans la boucle : aucune action (changement de statut, envoi d'email) n'est déclenchée automatiquement par l'IA sans validation explicite du commercial


## Fonctionnalité 29 — Signaux d'embauche (détection de croissance via offres d'emploi)

Une entreprise qui recrute activement est souvent en croissance et plus réceptive à un nouveau service/outil — c'est un signal d'achat que les CRM classiques n'exploitent pas nativement.

### Modèle de données
```prisma
model SignalEmbauche {
  id            String   @id @default(cuid())
  prospectId    String
  prospect      Prospect @relation(fields: [prospectId], references: [id])
  titrePoste    String
  urlOffre      String?
  dateDetection DateTime @default(now())
  actif         Boolean  @default(true)
}
```

### Implémentation
- Route API `/api/signaux/verifier` qui, pour chaque prospect (ou à la demande depuis la fiche prospect via un bouton "🔍 Vérifier les offres d'emploi"), recherche les offres actives de cette entreprise
- Intègre cette recherche via le connecteur Indeed (recherche d'offres par nom d'entreprise) — même logique d'appel que les autres intégrations tierces du projet : route serveur uniquement, jamais côté client
- Badge "📈 Recrute actuellement (X offres)" affiché sur la fiche prospect et dans le tableau de liste si des `SignalEmbauche` actifs existent
- Option de filtre dans la liste des prospects : "Entreprises qui recrutent" — utile pour prioriser une session d'appels
- Peut aussi alimenter le scoring automatique (fonctionnalité 12) : +10 points si signal d'embauche actif détecté récemment (moins de 30 jours)
- Cette vérification n'est pas automatique en tâche de fond pour tous les prospects (trop coûteux en appels), mais peut être incluse dans le processus de veille commerciale (fonctionnalité 9) comme option activable par alerte de veille


## Fonctionnalité 59 — Agent de réponse autonome & auto-optimisation des campagnes

Étend l'agent conversationnel (fonctionnalité 48) et les séquences email (fonctionnalité 17) avec un mode entièrement autonome optionnel, désactivé par défaut, qui va à l'encontre de la règle générale "humain dans la boucle" posée ailleurs dans ce prompt — ce choix doit donc être explicite et réversible à tout moment par le client.

### Modèle de données
```prisma
model ParametresAutonomie {
  id                  String   @id @default(cuid())
  organisationId      String   @unique
  organisation        Organisation @relation(fields: [organisationId], references: [id])
  reponseAutonomeActive Boolean @default(false)
  bookingAutonomeActive Boolean @default(false)
  seuilConfianceMin   Int      @default(85) // en dessous de ce seuil, transfert systématique à un humain
  updatedAt           DateTime @updatedAt
}

model OptimisationCampagne {
  id             String   @id @default(cuid())
  campagneId     String
  campagne       Campagne @relation(fields: [campagneId], references: [id])
  segment        String
  coutParLead    Float
  statut         String   @default("en_test") // en_test, scaling, en_pause
  derniereEvaluation DateTime @default(now())
}
```

### Agent de réponse autonome (optionnel)
- Si `reponseAutonomeActive` est activé pour l'organisation : quand un prospect répond à un email de séquence (fonctionnalité 17), l'IA analyse la réponse et, si son score de confiance dépasse `seuilConfianceMin`, répond automatiquement (objection simple, question factuelle, confirmation de créneau) sans validation humaine préalable
- En dessous du seuil de confiance, ou pour toute réponse ambiguë/négative/hors-sujet, la conversation est systématiquement transférée à un commercial (notification + `Interaction` créée avec statut "à traiter")
- Si `bookingAutonomeActive` est activé, une réponse positive claire ("ça m'intéresse", proposition de créneau) déclenche directement l'envoi du lien de booking (fonctionnalité 42) sans validation — sinon le commercial valide manuellement avant l'envoi du lien
- Toute réponse envoyée en mode autonome est marquée distinctement dans l'historique (`Interaction.notes` préfixé "[Réponse IA autonome]") pour audit et confiance
- Page "Paramètres d'autonomie" avec avertissement explicite sur les implications (image de marque, erreurs possibles) avant activation, et possibilité de désactiver instantanément

### Auto-optimisation des campagnes par coût/lead
- Pour chaque segment actif dans une campagne (ex: par secteur ou par persona ciblé), calcule périodiquement (tâche planifiée quotidienne) le `coutParLead` réel : somme des coûts d'API/envoi consommés (croisé avec `UsageAPI` et le volume d'`EmailEnvoye`) divisée par le nombre de leads qualifiés obtenus sur ce segment
- Règles configurables par l'utilisateur : ex. "mettre en pause un segment si coût/lead > seuil X après N jours", "scaler automatiquement (augmenter le volume d'enrichissement/envoi) un segment si coût/lead < seuil Y" — jamais d'augmentation de budget sans validation explicite du seuil par l'utilisateur au préalable, seule l'exécution dans les bornes déjà validées est automatique
- Page "Performance par segment" affichant les `OptimisationCampagne` avec leur statut, comparables visuellement (tableau trié par coût/lead croissant)

