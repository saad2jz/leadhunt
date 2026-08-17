import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const autonomieSchema = z.object({
  reponseAutonomeActive: z.boolean(),
  bookingAutonomeActive: z.boolean(),
  seuilConfianceMin: z.number().min(0).max(100),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    
    // 1. Récupère ou initialise les paramètres d'autonomie
    let params = await scopedPrisma.parametresAutonomie.findFirst({
      where: { organisationId: session.user.organisationId },
    });

    if (!params) {
      params = await scopedPrisma.parametresAutonomie.create({
        data: {
          organisationId: session.user.organisationId,
          reponseAutonomeActive: false,
          bookingAutonomeActive: false,
          seuilConfianceMin: 85,
        },
      });
    }

    // 2. Récupère les optimisations de campagne
    const optimisations = await scopedPrisma.optimisationCampagne.findMany({
      orderBy: { coutParLead: 'asc' },
    });

    return NextResponse.json({
      success: true,
      params,
      optimisations,
    });
  } catch (error) {
    console.error('Erreur GET settings autonomie:', error);
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
    const validatedData = autonomieSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    const updated = await scopedPrisma.parametresAutonomie.upsert({
      where: { organisationId: session.user.organisationId },
      create: {
        organisationId: session.user.organisationId,
        reponseAutonomeActive: validatedData.reponseAutonomeActive,
        bookingAutonomeActive: validatedData.bookingAutonomeActive,
        seuilConfianceMin: validatedData.seuilConfianceMin,
      },
      update: {
        reponseAutonomeActive: validatedData.reponseAutonomeActive,
        bookingAutonomeActive: validatedData.bookingAutonomeActive,
        seuilConfianceMin: validatedData.seuilConfianceMin,
      },
    });

    return NextResponse.json({
      success: true,
      params: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST settings autonomie:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
