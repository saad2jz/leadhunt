import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const templateSchema = z.object({
  nom: z.string().min(2, 'Le nom du modèle doit contenir au moins 2 caractères.'),
  objet: z.string().min(1, "L'objet est requis."),
  corps: z.string().min(1, 'Le corps est requis.'),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    const templates = await scopedPrisma.templateEmail.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Erreur GET templates:', error);
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
    const validatedData = templateSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    const template = await scopedPrisma.templateEmail.create({
      data: {
        organisationId: session.user.organisationId,
        nom: validatedData.nom.trim(),
        objet: validatedData.objet.trim(),
        corps: validatedData.corps,
      },
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST template:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
