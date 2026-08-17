import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const poidsSchema = z.object({
  poidsFit: z.object({
    secteur: z.number().min(0).max(100),
    taille: z.number().min(0).max(100),
    geo: z.number().min(0).max(100),
    decideur: z.number().min(0).max(100),
  }),
  poidsTiming: z.object({
    signal: z.number().min(0).max(100),
    recrutement: z.number().min(0).max(100),
    technique: z.number().min(0).max(100),
    fraicheur: z.number().min(0).max(100),
  }),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const poids = await prisma.poidsScoring.findUnique({
      where: { utilisateurId: session.user.id },
    });

    if (!poids) {
      return NextResponse.json({
        poidsFit: { secteur: 30, taille: 25, geo: 20, decideur: 25 },
        poidsTiming: { signal: 30, recrutement: 30, technique: 25, fraicheur: 15 },
      });
    }

    return NextResponse.json({
      poidsFit: JSON.parse(poids.poidsFit as string),
      poidsTiming: JSON.parse(poids.poidsTiming as string),
    });
  } catch (error) {
    console.error('Erreur GET poids:', error);
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
    const validatedData = poidsSchema.parse(body);

    const poids = await prisma.poidsScoring.upsert({
      where: { utilisateurId: session.user.id },
      update: {
        poidsFit: JSON.stringify(validatedData.poidsFit),
        poidsTiming: JSON.stringify(validatedData.poidsTiming),
      },
      create: {
        organisationId: session.user.organisationId,
        utilisateurId: session.user.id,
        poidsFit: JSON.stringify(validatedData.poidsFit),
        poidsTiming: JSON.stringify(validatedData.poidsTiming),
      },
    });

    return NextResponse.json({
      success: true,
      poids: {
        poidsFit: JSON.parse(poids.poidsFit as string),
        poidsTiming: JSON.parse(poids.poidsTiming as string),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST poids:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
