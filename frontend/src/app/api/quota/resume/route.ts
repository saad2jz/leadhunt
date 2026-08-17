import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const usages = await prisma.usageAPI.findMany({
      where: {
        organisationId: session.user.organisationId,
      },
      orderBy: { apiName: 'asc' },
    });

    // Initialisation par défaut si aucun compteur n'existe encore en base
    const defaultApis = [
      { name: 'pappers', limit: 100 },
      { name: 'hunter', limit: 50 },
      { name: 'apollo', limit: 75 }
    ];

    const today = new Date();
    const resetAt = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const mergedUsages = defaultApis.map(def => {
      const match = usages.find(u => u.apiName === def.name);
      return {
        id: match?.id || `temp-${def.name}`,
        apiName: def.name,
        count: match?.count || 0,
        limit: match?.limit || def.limit,
        resetAt: match?.resetAt || resetAt,
      };
    });

    return NextResponse.json({ usages: mergedUsages });
  } catch (error) {
    console.error('Erreur GET quota resume:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
