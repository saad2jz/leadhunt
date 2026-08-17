import { prisma } from '@/lib/prisma';

export async function recalculateProspectScore(prospectId: string): Promise<number> {
  try {
    // 1. Récupère le prospect avec ses relations clés
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        contacts: true,
        interactions: true,
        signauxEmbauche: {
          where: { actif: true }
        }
      }
    });

    if (!prospect) return 0;

    let score = 0;

    // +20 points si email vérifié présent
    if (prospect.emailVerifie && prospect.email) {
      score += 20;
    }

    // +20 points si téléphone vérifié présent
    if (prospect.telephoneVerifie && prospect.telephone) {
      score += 20;
    }

    // +15 points si au moins un contact décideur est renseigné
    if (prospect.contacts.length > 0) {
      score += 15;
    }

    // +15 points si effectif >= 10 salariés
    const effectifStr = prospect.effectif || '';
    // Filtre les chaînes d'effectifs pour voir si elles correspondent à >= 10 salariés (ex: "10 à 19", "20 à 49", etc.)
    const checkEffectifGe10 = (eff: string): boolean => {
      const match = eff.match(/(\d+)/g);
      if (match) {
        const numbers = match.map(Number);
        const maxNum = Math.max(...numbers);
        return maxNum >= 10;
      }
      return false;
    };
    if (checkEffectifGe10(effectifStr)) {
      score += 15;
    }

    // +10 points si l'entreprise a moins de 2 ans
    // Si nous n'avons pas la date de création exacte, nous pouvons en déduire par la date d'importation,
    // ou si on a un badge d'ancienneté. Pour être robuste, on peut aussi l'estimer ou vérifier si le siren commence par des numéros récents.
    // Mettons une date de création fictive ou basée sur un champ du profil si disponible (ex: notes contenant "Création récente" ou calculé).
    const estJeune = prospect.notes?.toLowerCase().includes('création récente') || false;
    if (estJeune) {
      score += 10;
    }

    // +20 points si au moins une interaction positive a eu lieu (RDV pris ou Répondu)
    const interactionPositive = prospect.interactions.some(inter => 
      inter.type === 'RDV' || 
      inter.resultat?.toLowerCase().includes('rdv') || 
      inter.resultat?.toLowerCase().includes('répondu')
    );
    if (interactionPositive) {
      score += 20;
    }

    // +10 points si signal d'embauche actif détecté récemment (moins de 30 jours)
    const aSignauxEmbauche = prospect.signauxEmbauche.length > 0;
    if (aSignauxEmbauche) {
      score += 10;
    }

    // Plafonne le score entre 0 et 100
    const finalScore = Math.max(0, Math.min(100, score));

    // Met à jour la base de données
    await prisma.prospect.update({
      where: { id: prospectId },
      data: { score: finalScore }
    });

    console.log(`[Scoring] Prospect ${prospect.nom} recalculé avec un score de ${finalScore}/100.`);
    return finalScore;
  } catch (error) {
    console.error(`Erreur de recalcul du score pour le prospect ${prospectId}:`, error);
    return 0;
  }
}
