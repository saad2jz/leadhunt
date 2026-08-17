import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const updateCampagneSchema = z.object({
  nom: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);

    // Récupère la structure Kanban complète d'un seul coup
    const campagne = await scopedPrisma.campagne.findFirst({
      where: { id: params.id },
      include: {
        etapes: {
          orderBy: { ordre: 'asc' },
          include: {
            prospects: {
              include: {
                prospect: {
                  include: {
                    contacts: true,
                  },
                },
              },
              orderBy: { dateEntreeEtape: 'desc' },
            },
          },
        },
      },
    });

    if (!campagne) {
      return NextResponse.json({ error: 'Campagne introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ campagne });
  } catch (error) {
    console.error('Erreur GET campagne:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = updateCampagneSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    const existing = await scopedPrisma.campagne.findFirst({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Campagne introuvable.' }, { status: 404 });
    }

    const updated = await scopedPrisma.campagne.update({
      where: { id: params.id },
      data: {
        nom: validatedData.nom,
        description: validatedData.description,
      },
    });

    return NextResponse.json({
      success: true,
      campagne: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur PUT campagne:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);

    const existing = await scopedPrisma.campagne.findFirst({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Campagne introuvable.' }, { status: 404 });
    }

    await scopedPrisma.campagne.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Campagne supprimée avec succès.',
    });
  } catch (error) {
    console.error('Erreur DELETE campagne:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
