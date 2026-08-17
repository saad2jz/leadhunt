import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const createInteractionSchema = z.object({
  prospectId: z.string(),
  type: z.enum(['Appel', 'Email', 'LinkedIn', 'RDV']),
  resultat: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = createInteractionSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // Vérifie si le prospect appartient au tenant
    const prospect = await scopedPrisma.prospect.findFirst({
      where: { id: validatedData.prospectId },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect introuvable.' }, { status: 404 });
    }

    const interaction = await scopedPrisma.interaction.create({
      data: {
        organisationId: session.user.organisationId,
        prospectId: validatedData.prospectId,
        type: validatedData.type,
        resultat: validatedData.resultat ? validatedData.resultat.trim() : null,
        notes: validatedData.notes ? validatedData.notes.trim() : null,
      },
    });

    const { recalculateProspectScore } = require('@/lib/scoring');
    await recalculateProspectScore(validatedData.prospectId);

    return NextResponse.json({
      success: true,
      interaction,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST interaction:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
