import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Resend Webhook Received]:', body);

    const eventType = body.type; // "email.opened", "email.clicked", "email.bounced"
    const emailId = body.data?.email_id; // ID d'email renvoyé par Resend

    if (!emailId || !eventType) {
      return NextResponse.json({ error: 'Payload invalide.' }, { status: 400 });
    }

    // Récupère l'email correspondant (recherche globale sans scope car c'est un appel webhook externe)
    const emailRecord = await prisma.emailEnvoye.findFirst({
      where: { idProviderExterne: emailId },
    });

    if (!emailRecord) {
      console.warn(`[Resend Webhook]: Aucun email trouvé pour l'idprovider : ${emailId}`);
      return NextResponse.json({ message: 'Email introuvable en base.' });
    }

    let statut = 'envoyé';
    let dataToUpdate: any = {};

    if (eventType === 'email.opened') {
      statut = 'ouvert';
      dataToUpdate = { statut, dateOuverture: new Date() };
    } else if (eventType === 'email.clicked') {
      statut = 'cliqué';
      dataToUpdate = { statut, dateClic: new Date() };
    } else if (eventType === 'email.bounced') {
      statut = 'bounced';
      dataToUpdate = { statut };
      
      // Met à jour la table des quotas/réputation de la boîte mail (Optionnel)
      await prisma.boiteMailOutreach.updateMany({
        where: { organisationId: emailRecord.organisationId },
        data: { scoreReputation: { decrement: 5 } } // Déclasse la réputation en cas de bounce
      });
    }

    await prisma.emailEnvoye.update({
      where: { id: emailRecord.id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur webhook Resend:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
