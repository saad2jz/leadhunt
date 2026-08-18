import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);

    // Vérifie si une campagne existe déjà pour éviter d'en créer à l'infini
    const existingCampaign = await scopedPrisma.campagne.findFirst();
    if (existingCampaign) {
      return NextResponse.json({ success: true, message: 'Une campagne existe déjà.' });
    }

    // Crée une campagne démo avec une étape par défaut
    await scopedPrisma.campagne.create({
      data: {
        organisationId: session.user.organisationId,
        nom: 'Campagne Initiale - Relance Leads',
        etapes: {
          create: [
            {
              organisationId: session.user.organisationId,
              nom: 'Premier contact - Présentation',
              ordre: 0,
            },
            {
              organisationId: session.user.organisationId,
              nom: 'Relance 1 - Proposition de valeur',
              ordre: 1,
            },
          ],
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Campagne de test créée avec succès.',
    });
  } catch (error) {
    console.error('Erreur creation campagne demo:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
