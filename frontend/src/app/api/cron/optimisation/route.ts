import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const campagnes = await prisma.campagne.findMany({
      include: {
        prospects: {
          include: {
            prospect: {
              include: {
                emailsEnvoyes: true,
                appels: true,
              },
            },
          },
        },
      },
    });

    let optimisedCount = 0;
    const optimisations: any[] = [];

    for (const campagne of campagnes) {
      // Regroupement par secteur (segment)
      const segmentStats: { [key: string]: { emails: number; appels: number; leads: number; wins: number } } = {};

      campagne.prospects.forEach(pc => {
        const sector = pc.prospect.secteur || 'Autre';
        if (!segmentStats[sector]) {
          segmentStats[sector] = { emails: 0, appels: 0, leads: 0, wins: 0 };
        }

        const stats = segmentStats[sector];
        if (stats) {
          stats.emails += pc.prospect.emailsEnvoyes.length;
          stats.appels += pc.prospect.appels.length;
          stats.leads += 1;
          if (pc.prospect.statut === 'RDV pris' || pc.prospect.statut === 'Client') {
            stats.wins += 1;
          }
        }
      });

      for (const sector of Object.keys(segmentStats)) {
        const stats = segmentStats[sector];
        if (!stats) continue;

        // Calcul du coût réel : email = 0.05€, appel = 0.20€
        const totalCost = stats.emails * 0.05 + stats.appels * 0.20;
        
        // Coût par lead (CPL) qualifié
        const winsCount = stats.wins || 1; // Évite division par zéro
        const coutParLead = Number((totalCost / winsCount).toFixed(2));

        let statut = 'en_test';
        if (stats.leads >= 5) {
          if (coutParLead > 25.0) {
            statut = 'en_pause';
          } else if (coutParLead < 5.0) {
            statut = 'scaling';
          }
        }

        // Met à jour ou crée le compte-rendu d'optimisation
        const opt = await prisma.optimisationCampagne.upsert({
          where: { id: `${campagne.id}-${sector}` }, // Clé artificielle unique pour upsert
          create: {
            id: `${campagne.id}-${sector}`,
            organisationId: campagne.organisationId,
            campagneId: campagne.id,
            segment: sector,
            coutParLead,
            statut,
            derniereEvaluation: new Date(),
          },
          update: {
            coutParLead,
            statut,
            derniereEvaluation: new Date(),
          },
        });

        optimisations.push(opt);
        optimisedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      campagnesOptimisees: campagnes.length,
      segmentsAnalyses: optimisedCount,
      optimisations,
    });
  } catch (error) {
    console.error('Erreur CRON optimisation campagnes:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
