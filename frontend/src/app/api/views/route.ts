import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const vueSchema = z.object({
  nom: z.string().min(2, 'Le nom de la vue doit contenir au moins 2 caractères.'),
  filtres: z.string().min(2, 'Les filtres doivent être renseignés.'),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    const vues = await scopedPrisma.vueSauvegardee.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ vues });
  } catch (error) {
    console.error('Erreur GET vues sauvegardees:', error);
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
    const { nom, filtres } = vueSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    const vue = await scopedPrisma.vueSauvegardee.create({
      data: {
        organisationId: session.user.organisationId,
        nom: nom.trim(),
        filtres,
      },
    });

    return NextResponse.json({
      success: true,
      vue,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST vue sauvegardee:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
