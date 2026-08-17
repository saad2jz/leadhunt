import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const updateProspectSchema = z.object({
  id: z.string(),
  statut: z.string().optional(),
  nom: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    const prospects = await scopedPrisma.prospect.findMany({
      include: {
        contacts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ prospects });
  } catch (error) {
    console.error('Erreur GET prospects:', error);
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
    const validatedData = updateProspectSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    const updated = await scopedPrisma.prospect.update({
      where: { id: validatedData.id },
      data: {
        statut: validatedData.statut,
        nom: validatedData.nom,
      },
    });

    return NextResponse.json({ success: true, prospect: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST prospects:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Paramètre id requis.' }, { status: 400 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    await scopedPrisma.prospect.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Prospect supprimé.' });
  } catch (error) {
    console.error('Erreur DELETE prospect:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue lors de la suppression.' }, { status: 500 });
  }
}
