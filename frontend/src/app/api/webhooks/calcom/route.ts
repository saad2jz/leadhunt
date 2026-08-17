import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recalculateProspectScore } from '@/lib/scoring';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Cal.com Webhook received]:', JSON.stringify(body));

    const triggerEvent = body.triggerEvent || '';
    const payload = body.payload || {};

    if (triggerEvent === 'BOOKING_CREATED') {
      const attendees = payload.attendees || [];
      const title = payload.title || 'Rendez-vous client';
      const organizerEmail = payload.organizer?.email || '';

      // 1. Cherche le commercial par son email
      const user = await prisma.utilisateur.findFirst({
        where: { email: organizerEmail },
      });

      // 2. Cherche le prospect par l'email d'un participant
      for (const att of attendees) {
        const email = att.email;
        if (!email) continue;

        // Cherche d'abord dans les contacts direct
        const contact = await prisma.contact.findFirst({
          where: { email },
          include: { prospect: true },
        });

        let prospect = contact?.prospect;

        if (!prospect) {
          // Cherche directement sur le prospect
          prospect = await prisma.prospect.findFirst({
            where: { email },
          });
        }

        if (prospect) {
          // Crée l'interaction de type RDV
          await prisma.interaction.create({
            data: {
              organisationId: prospect.organisationId,
              prospectId: prospect.id,
              type: 'RDV',
              resultat: 'Répondu',
              notes: `Rendez-vous planifié automatiquement via Cal.com. Titre: ${title}`,
            },
          });

          // Déplace le prospect à l'étape RDV pris
          await prisma.prospect.update({
            where: { id: prospect.id },
            data: { statut: 'RDV pris' },
          });

          // Recalcule le score
          await recalculateProspectScore(prospect.id);
          break; // Trouvé et qualifié
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur webhook Cal.com:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
