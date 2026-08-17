import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Récupère toutes les relances programmées aujourd'hui ou en retard
    const relances = await scopedPrisma.prospectCampagne.findMany({
      where: {
        relanceProgrammee: {
          lte: todayEnd,
        },
      },
      include: {
        prospect: {
          include: {
            contacts: true,
          },
        },
        campagne: true,
        etape: true,
      },
      orderBy: { relanceProgrammee: 'asc' }, // du plus en retard au plus récent
    });

    return NextResponse.json({ relances });
  } catch (error) {
    console.error('Erreur GET relances du jour:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
