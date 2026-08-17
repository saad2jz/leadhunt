import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    let callSid = '';
    let duration = 0;
    let callStatus = '';
    let recordingUrl = '';

    // Détermine le type de contenu de la requête (Twilio envoie x-www-form-urlencoded)
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      callSid = params.get('CallSid') || '';
      duration = Number(params.get('CallDuration') || '0');
      callStatus = params.get('CallStatus') || '';
      recordingUrl = params.get('RecordingUrl') || '';
    } else {
      const body = await req.json();
      callSid = body.CallSid || '';
      duration = Number(body.CallDuration || '0');
      callStatus = body.CallStatus || '';
      recordingUrl = body.RecordingUrl || '';
    }

    console.log('[Twilio Webhook Received]:', { callSid, duration, callStatus });

    if (!callSid) {
      return NextResponse.json({ error: 'CallSid manquant.' }, { status: 400 });
    }

    // Récupère l'appel correspondant dans la BDD (recherche globale sans scope pour webhook externe)
    const appelRecord = await prisma.appel.findFirst({
      where: { idProviderExterne: callSid },
    });

    if (!appelRecord) {
      console.warn(`[Twilio Webhook]: Aucun appel trouvé pour le SID externe : ${callSid}`);
      return NextResponse.json({ message: 'Appel introuvable en base.' });
    }

    // Traduit le statut Twilio vers notre modèle
    let statut = 'terminé';
    if (callStatus === 'busy') statut = 'occupé';
    else if (callStatus === 'no-answer' || callStatus === 'failed') statut = 'manqué';

    // Met à jour l'appel en BDD
    await prisma.appel.update({
      where: { id: appelRecord.id },
      data: {
        dureeSecondes: duration,
        statut,
        enregistrementUrl: recordingUrl || null,
      },
    });

    // Ajoute automatiquement l'interaction d'appel correspondante
    await prisma.interaction.create({
      data: {
        organisationId: appelRecord.organisationId,
        prospectId: appelRecord.prospectId,
        type: 'Appel',
        resultat: statut === 'terminé' ? 'Répondu' : statut === 'occupé' ? 'Occupé' : 'Répondeur',
        notes: `Durée : ${duration} sec. ${recordingUrl ? `Enregistrement : ${recordingUrl}` : ''}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur webhook Twilio:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
