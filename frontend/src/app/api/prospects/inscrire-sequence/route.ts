import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const subscriptionSchema = z.object({
  prospectId: z.string(),
  sequenceId: z.string(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { prospectId, sequenceId } = subscriptionSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // 1. Vérifie si le prospect appartient bien au tenant
    const prospect = await scopedPrisma.prospect.findFirst({
      where: { id: prospectId },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect introuvable.' }, { status: 404 });
    }

    // 2. Vérifie si la séquence appartient bien au tenant
    const sequence = await scopedPrisma.sequenceEmail.findFirst({
      where: { id: sequenceId },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Séquence introuvable.' }, { status: 404 });
    }

    // 3. Évite la double inscription active
    const existing = await scopedPrisma.prospectSequence.findFirst({
      where: {
        prospectId,
        sequenceId,
        statut: 'en cours',
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Le prospect est déjà actif dans cette séquence.' }, { status: 400 });
    }

    // 4. Inscrit le prospect (déclenchement immédiat de l'étape 0)
    const prospectSequence = await scopedPrisma.prospectSequence.create({
      data: {
        organisationId: session.user.organisationId,
        prospectId,
        sequenceId,
        etapeActuelle: 0,
        statut: 'en cours',
        prochainEnvoi: new Date(), // Envoi immédiat lors du prochain passage du cron
      },
    });

    return NextResponse.json({
      success: true,
      prospectSequence,
      message: 'Prospect inscrit avec succès dans la séquence.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST prospect sequence:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
