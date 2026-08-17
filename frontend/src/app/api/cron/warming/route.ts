import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    // 1. Récupère toutes les boîtes mail actuellement en cours de chauffage
    const boites = await prisma.boiteMailOutreach.findMany({
      where: {
        statutChauffage: 'en_chauffage',
      },
    });

    let updatedCount = 0;

    for (const boite of boites) {
      const daysSinceStart = Math.floor(
        (new Date().getTime() - new Date(boite.dateDebutChauffage).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Augmente le volume max autorisé de 2 emails par jour de chauffage, jusqu'à un plafond stable de 50
      const newVolumeMax = Math.min(5 + daysSinceStart * 2, 50);
      
      // Simule un volume journalier actuel proche du max pour représenter l'activité de warm-up
      const simulatedActuel = Math.max(0, newVolumeMax - Math.floor(Math.random() * 5));

      // Si le volume max de 50 est atteint depuis plus de 2 jours, la boîte passe à l'état "pret"
      let statut = 'en_chauffage';
      if (newVolumeMax >= 50 && daysSinceStart > 25) {
        statut = 'pret';
      }

      await prisma.boiteMailOutreach.update({
        where: { id: boite.id },
        data: {
          volumeJournalierMax: newVolumeMax,
          volumeJournalierActuel: simulatedActuel,
          statutChauffage: statut,
          scoreReputation: Math.min(100, (boite.scoreReputation || 95) + (Math.random() > 0.8 ? 1 : 0)), // Améliore lentement la réputation
        },
      });

      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      processed: boites.length,
      updated: updatedCount,
    });
  } catch (error) {
    console.error('Erreur CRON warming:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
