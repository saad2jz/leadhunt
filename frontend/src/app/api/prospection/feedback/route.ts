import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const feedbackSchema = z.object({
  entiteId: z.string(),
  typeEntite: z.enum(['entreprise', 'decideur']),
  vote: z.enum(['pertinent', 'pas_pertinent']),
  scoreDetailAuVote: z.any().default({}),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = feedbackSchema.parse(body);

    const feedback = await prisma.feedbackScoring.create({
      data: {
        organisationId: session.user.organisationId,
        utilisateurId: session.user.id,
        entiteId: validatedData.entiteId,
        typeEntite: validatedData.typeEntite,
        vote: validatedData.vote,
        scoreDetailAuVote: JSON.stringify(validatedData.scoreDetailAuVote),
      },
    });

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST feedback:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
