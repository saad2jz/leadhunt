---
name: app-mobile-expo
description: Application mobile Expo (iOS/Android) consommant les mêmes routes API que le frontend web. Dernière itération, une fois le reste stable.
---

# Skill — Itération 6 : Mobile

Prérequis : toutes les itérations précédentes déjà en place et stables côté API — cette app ne fait que consommer les routes existantes, aucune nouvelle logique métier ne doit être créée ici.

## Fonctionnalité 20 — App mobile native

- Utilise **Expo (React Native)** plutôt que du natif pur (Swift/Kotlin séparés) — un seul code source pour iOS et Android, et Expo permet de partager une bonne partie de la logique métier avec le frontend Next.js existant
- L'app mobile consomme les mêmes routes API que le frontend web (aucune duplication de backend nécessaire)
- Fonctionnalités prioritaires pour la V1 mobile (ne pas tout dupliquer d'un coup) :
  - Connexion (NextAuth via un flow adapté mobile, ex: `expo-auth-session`)
  - Liste de mes prospects assignés + recherche/filtres simplifiés
  - Fiche prospect avec bouton clic-to-call natif (utilise directement le téléphone de l'appareil, plus simple que Twilio ici) et bouton pour logger un email/interaction rapide
  - Carte géographique avec géolocalisation de l'utilisateur (pertinent pour les tournées terrain) et navigation GPS vers un prospect en un tap (ouvre Google Maps/Waze via deep link)
  - Mode hors-ligne basique : mise en cache des prospects du jour pour consultation sans réseau, synchronisation à la reconnexion
- Notifications push (via `expo-notifications`) pour les relances du jour et les rappels de rendez-vous

