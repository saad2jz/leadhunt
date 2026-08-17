import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, idProviderExterne, event, duration } = body;

    if (!type || !idProviderExterne || !event) {
      return NextResponse.json({ error: 'Paramètres manquants (type, idProviderExterne, event).' }, { status: 400 });
    }

    if (type === 'resend') {
      const email = await prisma.emailEnvoye.findFirst({
        where: { idProviderExterne },
      });

      if (!email) {
        return NextResponse.json({ error: 'Email introuvable en base.' }, { status: 404 });
      }

      let dataToUpdate: any = { statut: event };
      if (event === 'ouvert') dataToUpdate.dateOuverture = new Date();
      if (event === 'cliqué') dataToUpdate.dateClic = new Date();

      const updated = await prisma.emailEnvoye.update({
        where: { id: email.id },
        data: dataToUpdate,
      });

      // Ajoute une interaction de type Email avec le nouvel état
      await prisma.interaction.create({
        data: {
          organisationId: email.organisationId,
          prospectId: email.prospectId,
          type: 'Email',
          resultat: event === 'ouvert' ? 'Ouvert' : event === 'cliqué' ? 'Cliqué' : 'Bounced',
          notes: `[Simulation Webhook] État de l'email : ${event}`,
        },
      });

      return NextResponse.json({ success: true, email: updated });
    } 
    
    if (type === 'twilio') {
      const appel = await prisma.appel.findFirst({
        where: { idProviderExterne },
      });

      if (!appel) {
        return NextResponse.json({ error: 'Appel introuvable en base.' }, { status: 404 });
      }

      const durSec = Number(duration || 15);
      let statut = 'terminé';
      if (event === 'busy') statut = 'occupé';
      else if (event === 'no-answer') statut = 'manqué';

      const updated = await prisma.appel.update({
        where: { id: appel.id },
        data: {
          dureeSecondes: durSec,
          statut,
        },
      });

      // Ajoute une interaction d'appel
      await prisma.interaction.create({
        data: {
          organisationId: appel.organisationId,
          prospectId: appel.prospectId,
          type: 'Appel',
          resultat: statut === 'terminé' ? 'Répondu' : statut === 'occupé' ? 'Occupé' : 'Répondeur',
          notes: `[Simulation Webhook] Appel fini. Statut : ${statut}. Durée : ${durSec}s`,
        },
      });

      return NextResponse.json({ success: true, appel: updated });
    }

    return NextResponse.json({ error: 'Type invalide.' }, { status: 400 });
  } catch (error) {
    console.error('Erreur POST simulate webhook:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
