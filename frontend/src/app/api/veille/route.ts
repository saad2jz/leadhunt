import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const alerteVeilleSchema = z.object({
  nom: z.string().min(2, 'Le nom de l\'alerte doit contenir au moins 2 caractères.'),
  codeNaf: z.string().nullable().optional(),
  departement: z.string().nullable().optional(),
  formeJuridique: z.string().nullable().optional(),
  frequence: z.enum(['quotidienne', 'hebdomadaire']).default('quotidienne'),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    const alertes = await scopedPrisma.alerteVeille.findMany({
      include: {
        entreprises: {
          orderBy: { dateCreation: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ alertes });
  } catch (error) {
    console.error('Erreur GET veille alertes:', error);
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
    const validatedData = alerteVeilleSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    const alerte = await scopedPrisma.alerteVeille.create({
      data: {
        organisationId: session.user.organisationId,
        nom: validatedData.nom.trim(),
        codeNaf: validatedData.codeNaf || null,
        departement: validatedData.departement || null,
        formeJuridique: validatedData.formeJuridique || null,
        frequence: validatedData.frequence,
      },
    });

    return NextResponse.json({
      success: true,
      alerte,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST alerte veille:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
