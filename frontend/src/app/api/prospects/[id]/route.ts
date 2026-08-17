import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const updateProspectSchema = z.object({
  nom: z.string().min(2).optional(),
  statut: z.string().optional(),
  assigneAId: z.string().nullable().optional(),
  note: z.number().min(0).max(5).optional(),
  notes: z.string().nullable().optional(),
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
    const prospect = await scopedPrisma.prospect.findFirst({
      where: { id: params.id },
      include: {
        contacts: true,
        interactions: {
          include: {
            analyseIA: true,
          },
          orderBy: { date: 'desc' },
        },
        emailsEnvoyes: {
          orderBy: { dateEnvoi: 'desc' },
        },
        sequences: {
          include: {
            sequence: {
              include: {
                etapes: true,
              },
            },
          },
        },
        signauxEmbauche: {
          orderBy: { dateDetection: 'desc' },
        },
        devis: {
          include: { lignes: { orderBy: { ordre: 'asc' } } },
          orderBy: { dateCreation: 'desc' },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ prospect });
  } catch (error) {
    console.error('Erreur GET prospect:', error);
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
    const validatedData = updateProspectSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // Vérifie s'il existe
    const existing = await scopedPrisma.prospect.findFirst({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Prospect introuvable.' }, { status: 404 });
    }

    const updated = await scopedPrisma.prospect.update({
      where: { id: params.id },
      data: {
        nom: validatedData.nom,
        statut: validatedData.statut,
        assigneAId: validatedData.assigneAId,
        note: validatedData.note,
        notes: validatedData.notes,
      },
    });

    const { recalculateProspectScore } = require('@/lib/scoring');
    await recalculateProspectScore(params.id);

    // Récupère l'enregistrement mis à jour avec le nouveau score
    const finalUpdated = await scopedPrisma.prospect.findUnique({
      where: { id: params.id },
      include: {
        contacts: true,
        interactions: {
          include: { analyseIA: true },
          orderBy: { date: 'desc' },
        },
        emailsEnvoyes: { orderBy: { dateEnvoi: 'desc' } },
        sequences: { include: { sequence: { include: { etapes: true } } } },
        signauxEmbauche: { orderBy: { dateDetection: 'desc' } },
        devis: {
          include: { lignes: { orderBy: { ordre: 'asc' } } },
          orderBy: { dateCreation: 'desc' },
        },
      }
    });

    return NextResponse.json({
      success: true,
      prospect: finalUpdated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur PUT prospect:', error);
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

    const existing = await scopedPrisma.prospect.findFirst({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Prospect introuvable.' }, { status: 404 });
    }

    await scopedPrisma.prospect.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Prospect supprimé avec succès.',
    });
  } catch (error) {
    console.error('Erreur DELETE prospect:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
