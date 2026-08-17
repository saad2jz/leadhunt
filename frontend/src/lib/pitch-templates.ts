export interface PitchTemplate {
  secteur: string;
  accroche: string;
  arguments: string[];
  callToAction: string;
}

export const pitchTemplates: Record<string, PitchTemplate> = {
  restauration: {
    secteur: 'Restauration & Cafés',
    accroche: "Optimisation de vos flux de trésorerie et simplification des approvisionnements locaux.",
    arguments: [
      "Suivi des marges en temps réel sur chaque plat.",
      "Génération automatique des bons de commande fournisseurs."
    ],
    callToAction: "Seriez-vous ouvert à une démonstration de 10 min de notre outil adapté aux restaurateurs ?"
  },
  retail: {
    secteur: 'Commerce de détail',
    accroche: "Booster le trafic en magasin et synchroniser vos ventes en ligne sans effort.",
    arguments: [
      "Gestion centralisée des stocks physiques et e-commerce.",
      "Fidélisation automatique des clients via SMS intelligent."
    ],
    callToAction: "Pouvons-nous planifier un court échange pour analyser votre flux de vente actuel ?"
  },
  btp: {
    secteur: 'Artisans & BTP',
    accroche: "Générez des devis professionnels conformes en 2 minutes et relancez automatiquement vos factures.",
    arguments: [
      "Bibliothèque intégrée des tarifs de matériaux standard.",
      "Relance automatique des factures impayées par SMS."
    ],
    callToAction: "Découvrez notre application mobile de facturation dédiée aux chantiers."
  },
  tourisme: {
    secteur: 'Hébergement & Tourisme',
    accroche: "Maximisez votre taux d'occupation de chambres en automatisant vos réservations directes.",
    arguments: [
      "Bypass des frais de commission des OTA (Booking/Airbnb).",
      "Système de paiement direct sécurisé par Stripe."
    ],
    callToAction: "Analysons ensemble comment augmenter vos réservations directes ce trimestre."
  },
  default: {
    secteur: 'Services & Divers',
    accroche: "Digitalisez vos opérations quotidiennes et gagnez 4 heures administratives par semaine.",
    arguments: [
      "Centralisation complète de vos fiches clients et contrats.",
      "Tableau de bord de suivi du chiffre d'affaires."
    ],
    callToAction: "Discutons de vos enjeux de numérisation lors d'un appel rapide cette semaine."
  }
};

export function getPitchForSector(secteur: string | null | undefined): PitchTemplate {
  if (!secteur) return pitchTemplates.default;
  
  const secLower = secteur.toLowerCase();
  if (secLower.includes('resto') || secLower.includes('caf') || secLower.includes('alimentaire')) {
    return pitchTemplates.restauration;
  }
  if (secLower.includes('commerce') || secLower.includes('retail') || secLower.includes('magasin')) {
    return pitchTemplates.retail;
  }
  if (secLower.includes('btp') || secLower.includes('artisan') || secLower.includes('construct') || secLower.includes('travaux')) {
    return pitchTemplates.btp;
  }
  if (secLower.includes('hotel') || secLower.includes('tourisme') || secLower.includes('heberg')) {
    return pitchTemplates.tourisme;
  }
  return pitchTemplates.default;
}
