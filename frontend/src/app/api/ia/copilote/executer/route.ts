import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const runSchema = z.object({
  actionId: z.string(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { actionId } = runSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // 1. Charge l'action proposée
    const action = await scopedPrisma.actionAgent.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      return NextResponse.json({ error: 'Action introuvable.' }, { status: 404 });
    }

    if (action.statut !== 'proposée') {
      return NextResponse.json({ error: 'Cette action a déjà été traitée.' }, { status: 400 });
    }

    let resultMsg = 'Action exécutée.';

    // 2. Exécute l'action selon son type
    const params = JSON.parse(action.parametres || '{}');

    if (action.typeAction === 'recherche_entreprise') {
      // Simule le lancement d'une recherche intelligente
      const search = await scopedPrisma.rechercheProspection.create({
        data: {
          organisationId: session.user.organisationId,
          utilisateurId: session.user.id,
          entryType: 'motscles',
          entryValue: params.secteur || 'Logiciel',
          besoin: params,
          statut: 'en_cours',
        },
      });
      resultMsg = `Recherche lancée avec succès pour le secteur ${params.secteur}. Identifiant recherche: ${search.id}`;
    } else if (action.typeAction === 'inscrire_sequence') {
      // Inscrit le premier prospect trouvé sans séquence en cours
      const targetProspect = await scopedPrisma.prospect.findFirst({
        where: {
          sequences: { none: { statut: 'en cours' } },
        },
      });

      if (targetProspect) {
        const seq = await scopedPrisma.sequenceEmail.findFirst();
        if (seq) {
          await scopedPrisma.prospectSequence.create({
            data: {
              organisationId: session.user.organisationId,
              prospectId: targetProspect.id,
              sequenceId: seq.id,
              statut: 'en cours',
            },
          });
          resultMsg = `Prospect ${targetProspect.nom} inscrit avec succès à la séquence ${seq.nom}.`;
        } else {
          resultMsg = "Aucune séquence d'emails configurée pour l'inscription.";
        }
      } else {
        resultMsg = 'Aucun prospect éligible (tous sont déjà inscrits).';
      }
    } else if (action.typeAction === 'envoyer_email') {
      resultMsg = `Appel de masse simulé : 0 emails en retard envoyés.`;
    }

    // 3. Met à jour l'action en statut validé et exécutée
    await scopedPrisma.actionAgent.update({
      where: { id: actionId },
      data: {
        statut: 'exécutée',
        resultat: resultMsg,
      },
    });

    return NextResponse.json({
      success: true,
      resultat: resultMsg,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur execution action copilote:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
