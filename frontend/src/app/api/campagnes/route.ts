import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const createCampagneSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères.'),
  description: z.string().nullable().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    
    const campagnes = await scopedPrisma.campagne.findMany({
      include: {
        etapes: {
          orderBy: { ordre: 'asc' },
        },
        prospects: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ campagnes });
  } catch (error) {
    console.error('Erreur GET campagnes:', error);
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
    const validatedData = createCampagneSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    const campagne = await scopedPrisma.$transaction(async (tx) => {
      // 1. Crée la campagne
      const camp = await tx.campagne.create({
        data: {
          organisationId: session.user.organisationId,
          nom: validatedData.nom.trim(),
          description: validatedData.description ? validatedData.description.trim() : null,
        },
      });

      // 2. Initialise les étapes par défaut (Qualification -> Perdu)
      const defaultEtapes = [
        { nom: 'Qualification', ordre: 0, couleur: '#94a3b8' }, // Slate
        { nom: 'Premier contact', ordre: 1, couleur: '#60a5fa' }, // Blue
        { nom: 'Relance', ordre: 2, couleur: '#f59e0b' }, // Amber
        { nom: 'RDV pris', ordre: 3, couleur: '#a855f7' }, // Purple
        { nom: 'Closing / Gagné', ordre: 4, couleur: '#10b981' }, // Emerald
        { nom: 'Perdu', ordre: 5, couleur: '#ef4444' }, // Red
      ];

      for (const etape of defaultEtapes) {
        await tx.etape.create({
          data: {
            organisationId: session.user.organisationId,
            campagneId: camp.id,
            nom: etape.nom,
            ordre: etape.ordre,
            couleur: etape.couleur,
          },
        });
      }

      return camp;
    });

    return NextResponse.json({
      success: true,
      campagne,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST campagne:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
