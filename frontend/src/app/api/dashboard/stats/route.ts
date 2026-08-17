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

    // 1. Métriques de base
    const prospectsCount = await scopedPrisma.prospect.count();
    const contactsCount = await scopedPrisma.contact.count();
    const blacklistCount = await scopedPrisma.listeNoirContact.count();

    // 2. Appels et Emails émis
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lundi de cette semaine
    weekStart.setHours(0, 0, 0, 0);

    const callsToday = await scopedPrisma.interaction.count({
      where: {
        type: 'Appel',
        date: { gte: todayStart },
      },
    });

    const callsThisWeek = await scopedPrisma.interaction.count({
      where: {
        type: 'Appel',
        date: { gte: weekStart },
      },
    });

    const emailsToday = await scopedPrisma.emailEnvoye.count({
      where: {
        dateEnvoi: { gte: todayStart },
      },
    });

    const emailsThisWeek = await scopedPrisma.emailEnvoye.count({
      where: {
        dateEnvoi: { gte: weekStart },
      },
    });

    // 3. Activité sur 14 jours (Graphique)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const interactions = await scopedPrisma.interaction.findMany({
      where: {
        date: { gte: fourteenDaysAgo },
      },
      select: {
        date: true,
      },
    });

    // Groupement par jour
    const dailyCounts: { [key: string]: number } = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0] || '';
      dailyCounts[dateStr] = 0;
    }

    interactions.forEach(inter => {
      const dateStr = inter.date.toISOString().split('T')[0] || '';
      if (dailyCounts[dateStr] !== undefined) {
        dailyCounts[dateStr] += 1;
      }
    });

    const activityGraphData = Object.keys(dailyCounts)
      .map(date => ({
        date,
        label: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        count: dailyCounts[date] || 0,
      }))
      .reverse();

    // 4. Taux de conversion global
    const statusCounts = await scopedPrisma.prospect.groupBy({
      by: ['statut'],
      _count: {
        _all: true,
      },
    });

    const counts: { [key: string]: number } = {
      'À appeler': 0,
      'RDV pris': 0,
      'Client': 0,
    };

    statusCounts.forEach(item => {
      if (counts[item.statut] !== undefined) {
        counts[item.statut] = item._count._all;
      }
    });

    // 5. Widget intelligent "Fuites détectées" (Points d'attention)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const twentyOneDaysAgo = new Date();
    twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

    // a. Prospects en RDV pris sans interaction depuis > 10 jours
    const rdvPrisSansSuivi = await scopedPrisma.prospect.count({
      where: {
        statut: 'RDV pris',
        interactions: {
          none: {
            date: { gte: tenDaysAgo },
          },
        },
      },
    });

    // b. Fiches incomplètes (Pas d'email vérifié, pas de téléphone, pas de décideur)
    const fichesIncompletes = await scopedPrisma.prospect.count({
      where: {
        emailVerifie: false,
        telephoneVerifie: false,
        contacts: {
          none: {},
        },
      },
    });

    // c. Comptes dormants (aucune interaction depuis > 21 jours, hors Client / Pas intéressé)
    const comptesDormants = await scopedPrisma.prospect.count({
      where: {
        statut: { notIn: ['Client', 'Pas intéressé'] },
        interactions: {
          none: {
            date: { gte: twentyOneDaysAgo },
          },
        },
      },
    });

    // d. Séquences d'emails bloquées (prochain envoi dépassé de plus de 2 jours)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const sequencesBloquees = await scopedPrisma.prospectSequence.count({
      where: {
        statut: 'en cours',
        prochainEnvoi: { lte: twoDaysAgo },
      },
    });

    // e. Relances en retard (relance programmée dépassée dans le pipeline Kanban)
    const relancesEnRetard = await scopedPrisma.prospectCampagne.count({
      where: {
        relanceProgrammee: { lte: new Date() },
      },
    });

    // 6. Derniers prospects
    const recentProspects = await scopedPrisma.prospect.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        contacts: true,
      },
    });

    return NextResponse.json({
      success: true,
      metrics: {
        prospectsCount,
        contactsCount,
        blacklistCount,
        callsToday,
        callsThisWeek,
        emailsToday,
        emailsThisWeek,
      },
      activityGraphData,
      conversionFunnel: {
        aAppeler: counts['À appeler'],
        rdvPris: counts['RDV pris'],
        client: counts['Client'],
      },
      attentionPoints: {
        rdvPrisSansSuivi,
        fichesIncompletes,
        comptesDormants,
        sequencesBloquees,
        relancesEnRetard,
      },
      recentProspects,
    });
  } catch (error) {
    console.error('Erreur GET dashboard stats:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
