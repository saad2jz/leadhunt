import { prisma } from './prisma';

interface VerifierParams {
  organisationId: string;
  email?: string | null;
  telephone?: string | null;
  siren?: string | null;
}

/**
 * Vérifie si un contact ou une entreprise est inscrit(e) sur la liste noire RGPD
 * de l'organisation.
 * 
 * @returns true si le contact est bloqué (présent sur la liste noire), false sinon.
 */
export async function estSurListeNoire({
  organisationId,
  email,
  telephone,
  siren,
}: VerifierParams): Promise<boolean> {
  if (!organisationId) {
    throw new Error('Identifiant d\'organisation requis pour la vérification de la liste noire.');
  }

  const clausesOr: any[] = [];

  if (email) {
    clausesOr.push({ email: email.trim().toLowerCase() });
  }
  if (telephone) {
    clausesOr.push({ telephone: telephone.trim() });
  }
  if (siren) {
    clausesOr.push({ siren: siren.trim() });
  }

  if (clausesOr.length === 0) {
    return false;
  }

  const opposition = await prisma.listeNoirContact.findFirst({
    where: {
      organisationId,
      OR: clausesOr,
    },
  });

  return opposition !== null;
}
