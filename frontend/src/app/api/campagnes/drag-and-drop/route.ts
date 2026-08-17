import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const dragDropSchema = z.object({
  prospectCampagneId: z.string(),
  toEtapeId: z.string(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { prospectCampagneId, toEtapeId } = dragDropSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // Vérifie d'abord si la liaison appartient à l'organisation
    const existing = await scopedPrisma.prospectCampagne.findFirst({
      where: { id: prospectCampagneId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Prospect de campagne introuvable.' }, { status: 404 });
    }

    // Vérifie que l'étape de destination appartient aussi à l'organisation
    const targetEtape = await scopedPrisma.etape.findFirst({
      where: { id: toEtapeId },
    });

    if (!targetEtape) {
      return NextResponse.json({ error: 'Étape cible introuvable.' }, { status: 404 });
    }

    const updated = await scopedPrisma.prospectCampagne.update({
      where: { id: prospectCampagneId },
      data: {
        etapeId: toEtapeId,
        dateEntreeEtape: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      prospectCampagne: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST campaigns drag-and-drop:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
