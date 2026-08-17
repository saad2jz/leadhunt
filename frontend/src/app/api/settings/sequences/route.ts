import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const sequenceSchema = z.object({
  nom: z.string().min(2, 'Le nom de la séquence doit contenir au moins 2 caractères.'),
  etapes: z.array(
    z.object({
      ordre: z.number(),
      delaiJours: z.number().min(0),
      templateId: z.string(),
      condition: z.enum(['toujours', 'si_pas_de_reponse']),
    })
  ).min(1, 'La séquence doit contenir au moins une étape.'),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    const sequences = await scopedPrisma.sequenceEmail.findMany({
      include: {
        etapes: {
          orderBy: { ordre: 'asc' },
          include: {
            template: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ sequences });
  } catch (error) {
    console.error('Erreur GET sequences:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { nom, etapes } = sequenceSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    const sequence = await scopedPrisma.$transaction(async (tx) => {
      // 1. Crée le conteneur de séquence
      const seq = await tx.sequenceEmail.create({
        data: {
          organisationId: session.user.organisationId,
          nom: nom.trim(),
        },
      });

      // 2. Crée les étapes ordonnées
      for (const step of etapes) {
        await tx.etapeSequence.create({
          data: {
            sequenceId: seq.id,
            ordre: step.ordre,
            delaiJours: step.delaiJours,
            templateId: step.templateId,
            condition: step.condition,
          },
        });
      }

      return seq;
    });

    return NextResponse.json({
      success: true,
      sequence,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST sequence:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
