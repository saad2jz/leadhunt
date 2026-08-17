import { getScopedPrisma } from './auth-scope';
import { prisma } from './prisma';

/**
 * Interface pour le résultat d'enrichissement d'un décideur
 */
export interface EnrichmentResult {
  email: string | null;
  emailStatutVerif: 'verifie' | 'risque' | 'invalide' | 'non_teste';
  emailProbabiliteBounce: number;
  telephone: string | null;
  telephoneType: 'mobile' | 'fixe' | null;
  telephoneActif: boolean;
  telephoneNomCorrespond: boolean;
  fournisseursConsultes: any[];
  confiance: 'haute' | 'moyenne' | 'faible' | 'manuelle';
  source: 'api' | 'manuel';
}

/**
 * Vérifie et incrémente le quota mensuel pour un fournisseur d'API donné
 */
export async function verifierQuotaAPI(apiName: string, organisationId: string | null): Promise<boolean> {
  const today = new Date();
  const resetAt = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  try {
    // Essaye de trouver un quota existant pour cette API et cette organisation (ou global)
    let usage = await prisma.usageAPI.findFirst({
      where: {
        apiName,
        organisationId,
      },
    });

    // Si aucun quota n'existe, on initialise un quota par défaut
    if (!usage) {
      let limit: number | null = null;
      if (apiName === 'pappers') limit = 100;
      else if (apiName === 'hunter') limit = 50;
      else if (apiName === 'apollo') limit = 75;
      else limit = 30; // autres fournisseurs secondaires

      usage = await prisma.usageAPI.create({
        data: {
          apiName,
          organisationId,
          count: 0,
          limit,
          resetAt,
        },
      });
    }

    // Si la période de reset est dépassée, on réinitialise le compteur
    if (new Date() >= new Date(usage.resetAt)) {
      usage = await prisma.usageAPI.update({
        where: { id: usage.id },
        data: {
          count: 0,
          resetAt,
        },
      });
    }

    // Si la limite est atteinte, on refuse l'appel
    if (usage.limit !== null && usage.count >= usage.limit) {
      console.warn(`Quota épuisé pour l'API ${apiName} (Organisation: ${organisationId || 'Global'})`);
      return false;
    }

    // Incrémente atomiquement
    await prisma.usageAPI.update({
      where: { id: usage.id },
      data: {
        count: { increment: 1 },
      },
    });

    return true;
  } catch (error) {
    console.error(`Erreur verifierQuotaAPI pour ${apiName}:`, error);
    return false; // Bloque par sécurité en cas d'erreur DB
  }
}

/**
 * Cascade waterfall multi-fournisseurs pour enrichir les coordonnées d'un décideur
 */
export async function enrichirDecideur(
  nom: string,
  fonction: string,
  entrepriseNom: string,
  paysProbable: string = 'FR',
  session: any
): Promise<EnrichmentResult> {
  const orgId = session.user.organisationId;
  const providers = [
    { nom: 'hunter', typeDonnee: 'email', ordrePriorite: 1, zonesGeoFortes: { FR: 0.9, EMEA: 0.8 } },
    { nom: 'apollo', typeDonnee: 'les_deux', ordrePriorite: 2, zonesGeoFortes: { US: 0.95, FR: 0.75 } },
    { nom: 'wiza', typeDonnee: 'email', ordrePriorite: 3, zonesGeoFortes: { FR: 0.6 } },
    { nom: 'snov', typeDonnee: 'email', ordrePriorite: 4, zonesGeoFortes: { FR: 0.5 } },
    { nom: 'contactout', typeDonnee: 'les_deux', ordrePriorite: 5, zonesGeoFortes: { FR: 0.4 } },
  ];

  // Trier les fournisseurs selon la zone géographique cible
  const sortedProviders = [...providers].sort((a, b) => {
    const rateA = (a.zonesGeoFortes as any)[paysProbable] || 0.3;
    const rateB = (b.zonesGeoFortes as any)[paysProbable] || 0.3;
    return rateB - rateA; // Priorise le taux de succès le plus fort pour la zone
  });

  let emailTrouve: string | null = null;
  let telephoneTrouve: string | null = null;
  let telephoneType: 'mobile' | 'fixe' | null = null;
  const fournisseursConsultes: any[] = [];

  // Mots clés pour deviner l'email pattern
  const normaliser = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
  const [prenom, nomFamille] = nom.split(' ');
  const pName = normaliser(prenom || '');
  const lName = normaliser(nomFamille || prenom || '');
  const domain = `${normaliser(entrepriseNom)}.fr`;

  for (const provider of sortedProviders) {
    // S'arrêter si on a tout trouvé
    if (emailTrouve && telephoneTrouve) break;

    // Vérifie le quota
    const quotaOk = await verifierQuotaAPI(provider.nom, orgId);
    if (!quotaOk) {
      fournisseursConsultes.push({ provider: provider.nom, status: 'quota_exhausted' });
      continue;
    }

    // Simulation de l'appel API (Dev / Demo High-Fidelity Mock)
    let emailResult: string | null = null;
    let phoneResult: string | null = null;
    let phoneTypeResult: 'mobile' | 'fixe' | null = null;

    if (provider.nom === 'hunter' && !emailTrouve) {
      // Hunter trouve souvent des emails
      emailResult = `${pName}.${lName}@${domain}`;
    } else if (provider.nom === 'apollo') {
      if (!emailTrouve) emailResult = `${pName}@${domain}`;
      if (!telephoneTrouve) {
        phoneResult = `06${Math.floor(10000000 + Math.random() * 90000000)}`;
        phoneTypeResult = 'mobile';
      }
    } else if (provider.nom === 'wiza' && !emailTrouve) {
      emailResult = `${pName.charAt(0)}${lName}@${domain}`;
    } else if (provider.nom === 'contactout' && !telephoneTrouve) {
      phoneResult = `07${Math.floor(10000000 + Math.random() * 90000000)}`;
      phoneTypeResult = 'mobile';
    }

    if (emailResult || phoneResult) {
      if (emailResult && !emailTrouve) emailTrouve = emailResult;
      if (phoneResult && !telephoneTrouve) {
        telephoneTrouve = phoneResult;
        telephoneType = phoneTypeResult;
      }
      fournisseursConsultes.push({
        provider: provider.nom,
        status: 'success',
        found: { email: !!emailResult, telephone: !!phoneResult },
      });
    } else {
      fournisseursConsultes.push({ provider: provider.nom, status: 'not_found' });
    }
  }

  // Triple validation d'email (simulation de 3 moteurs : syntaxe, MX, SMTP)
  let emailStatutVerif: 'verifie' | 'risque' | 'invalide' | 'non_teste' = 'non_teste';
  let emailProbabiliteBounce = 1.0;

  if (emailTrouve) {
    // Simulation du consensus
    const checkSyntax = true;
    const checkMX = true;
    const checkSMTP = Math.random() > 0.15; // 85% de SMTP valide pour la démo

    if (checkSyntax && checkMX && checkSMTP) {
      emailStatutVerif = 'verifie';
      emailProbabiliteBounce = 0.02;
    } else if (checkSyntax && checkMX) {
      emailStatutVerif = 'risque'; // Catch-all probable
      emailProbabiliteBounce = 0.25;
    } else {
      emailStatutVerif = 'invalide';
      emailProbabiliteBounce = 0.95;
    }
  }

  // Déterminer le niveau de confiance final
  let confiance: 'haute' | 'moyenne' | 'faible' | 'manuelle' = 'faible';
  if (emailStatutVerif === 'verifie' && telephoneTrouve && telephoneType === 'mobile') {
    confiance = 'haute';
  } else if (emailStatutVerif === 'verifie' || (telephoneTrouve && telephoneType === 'mobile')) {
    confiance = 'moyenne';
  }

  return {
    email: emailTrouve,
    emailStatutVerif,
    emailProbabiliteBounce,
    telephone: telephoneTrouve,
    telephoneType,
    telephoneActif: telephoneTrouve ? Math.random() > 0.1 : false, // 90% actif
    telephoneNomCorrespond: telephoneTrouve ? Math.random() > 0.08 : false, // 92% de correspondance correcte
    fournisseursConsultes,
    confiance,
    source: 'api',
  };
}
