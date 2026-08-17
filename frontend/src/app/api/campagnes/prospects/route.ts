import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const addProspectsSchema = z.object({
  campagneId: z.string(),
  prospectIds: z.array(z.string()).min(1, 'Sélectionnez au moins un prospect.'),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { campagneId, prospectIds } = addProspectsSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // 1. Trouve la première étape de la campagne (ordre === 0)
    const firstEtape = await scopedPrisma.etape.findFirst({
      where: {
        campagneId,
        ordre: 0,
      },
    });

    if (!firstEtape) {
      return NextResponse.json({ error: 'Première étape de campagne introuvable.' }, { status: 404 });
    }

    let addedCount = 0;

    await scopedPrisma.$transaction(async (tx) => {
      for (const prospectId of prospectIds) {
        // Évite les doublons de prospect dans la même campagne
        const existing = await tx.prospectCampagne.findFirst({
          where: {
            campagneId,
            prospectId,
          },
        });

        if (existing) continue;

        await tx.prospectCampagne.create({
          data: {
            organisationId: session.user.organisationId,
            campagneId,
            prospectId,
            etapeId: firstEtape.id,
          },
        });
        addedCount++;
      }
    });

    return NextResponse.json({
      success: true,
      count: addedCount,
      message: `${addedCount} prospect(s) ajouté(s) à la campagne.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST campagne prospects:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
