import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const importSchema = z.object({
  id: z.string(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = importSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // 1. Récupère l'entreprise détectée
    const entreprise = await scopedPrisma.nouvelleEntrepriseDetectee.findFirst({
      where: { id },
    });

    if (!entreprise) {
      return NextResponse.json({ error: 'Entreprise détectée introuvable.' }, { status: 404 });
    }

    if (entreprise.statut === 'Importée') {
      return NextResponse.json({ error: 'Cette entreprise a déjà été importée.' }, { status: 400 });
    }

    // 2. Importe en prospect
    const prospect = await scopedPrisma.prospect.create({
      data: {
        organisationId: session.user.organisationId,
        nom: entreprise.nom,
        siren: entreprise.siren,
        statut: 'À appeler',
        notes: `Création récente détectée le ${new Date(entreprise.dateCreation).toLocaleDateString('fr-FR')} par veille SIRENE.`,
      },
    });

    // 3. Met à jour le statut dans la veille
    await scopedPrisma.nouvelleEntrepriseDetectee.update({
      where: { id },
      data: { statut: 'Importée' },
    });

    // 4. Recalcule le score (+10 points car c'est une création récente de moins de 6 mois !)
    const { recalculateProspectScore } = require('@/lib/scoring');
    await recalculateProspectScore(prospect.id);

    return NextResponse.json({
      success: true,
      prospect,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST importer veille:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
