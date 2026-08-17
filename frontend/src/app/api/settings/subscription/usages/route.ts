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
    
    // Récupération des compteurs d'usage de l'organisation
    const usages = await scopedPrisma.usageAPI.findMany({
      orderBy: { resetAt: 'asc' },
    });

    // Si aucun usage, on en mocke un fictif de recherche pour de la clarté d'interface
    if (usages.length === 0) {
      const today = new Date();
      const resetAt = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      
      return NextResponse.json({
        usages: [
          {
            id: 'mock-sirene',
            apiName: 'Recherches Sirene',
            count: 0,
            limit: null,
            resetAt: resetAt.toISOString(),
          },
          {
            id: 'mock-enrichment',
            apiName: 'Enrichissements Waterfall',
            count: 0,
            limit: session.user.plan === 'starter' ? 0 : session.user.plan === 'pro' ? 100 : session.user.plan === 'business' ? 500 : null,
            resetAt: resetAt.toISOString(),
          }
        ]
      });
    }

    return NextResponse.json({ usages });
  } catch (error) {
    console.error('Erreur GET usages:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
