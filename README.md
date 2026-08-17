# Prospect Intelligence — SaaS B2B Multi-tenant & Mobile App

Prospect Intelligence est une plateforme SaaS de prospection commerciale B2B dotée d'une architecture multi-tenant robuste, de pipelines de vente avancés (Outreach, téléphonie clic-to-call, séquences mail), d'une veille SIRENE intelligente et d'une application mobile terrain Expo.

---

## 🏗️ Architecture du Projet

Le projet est divisé en deux modules principaux :
1.  **[`frontend/`](file:///c:/Users/Utilisateur/Documents/Codex/2026-08-14/mets-en-place-d-s-le/frontend)** : Next.js 14 (App Router) + PostgreSQL + Prisma Client.
2.  **[`mobile/`](file:///c:/Users/Utilisateur/Documents/Codex/2026-08-14/mets-en-place-d-s-le/mobile)** : Application mobile native multiplateforme Expo (React Native).

---

## 🚀 Démarrage Rapide

### Prérequis
*   Node.js (v18+)
*   Une base de données PostgreSQL active. En local, le démon PostgreSQL tourne sur le port `51214`.

### 1. Lancement du Backend & Web (Next.js)

1.  Accédez au dossier frontend :
    ```bash
    cd frontend
    ```
2.  Installez les dépendances :
    ```bash
    npm install
    ```
3.  Configurez vos variables d'environnement dans un fichier `.env` (voir `.env.example` pour les clés d'API mock/réelles).
4.  Synchronisez la structure de votre base de données via Prisma :
    ```bash
    npx prisma db push
    ```
5.  Lancez le serveur de développement :
    ```bash
    npm run dev
    ```
    Le site est accessible sur `http://localhost:3000`.

### 2. Lancement de l'Application Mobile (Expo)

1.  Accédez au dossier mobile :
    ```bash
    cd mobile
    ```
2.  Installez les dépendances :
    ```bash
    npm install
    ```
3.  Démarrez le serveur Expo :
    ```bash
    npm run start
    ```
    Saisissez l'URL de votre serveur API local (ex: `http://localhost:3000` ou votre adresse IP locale) sur l'écran d'authentification mobile.

---

## 🔒 Règles de Sécurité Multi-tenant (RGPD)

*   **Isolation stricte** : Toutes les tables de la base de données possèdent un champ `organisationId`.
*   **Scoped Clients** : Les requêtes en base de données sont toutes filtrées dynamiquement à l'aide de l'utilitaire `getScopedPrisma(session)`.
*   **Règle RGPD** : Toute tentative d'outreach ou de contact vers un élément présent dans la table `ListeNoirContact` (Siren, Email ou Téléphone) est bloquée en amont.
