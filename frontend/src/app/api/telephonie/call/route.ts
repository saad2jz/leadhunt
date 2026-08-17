import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const callSchema = z.object({
  prospectId: z.string(),
  telephone: z.string().min(6, 'Numéro de téléphone invalide.'),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { prospectId, telephone } = callSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // Vérifie s'il existe et appartient bien au tenant
    const prospect = await scopedPrisma.prospect.findFirst({
      where: { id: prospectId },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect introuvable.' }, { status: 404 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

    let idProviderExterne = `ca_${Math.random().toString(36).substring(2, 10)}`;

    if (accountSid && authToken && twilioNumber) {
      try {
        // Envoi réel click-to-call : on appelle d'abord le commercial (session.user.telephone ou mock), puis le bridge
        const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: telephone,
            From: twilioNumber,
            Url: 'http://demo.twilio.com/docs/voice.xml', // Instructions vocales par défaut
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          idProviderExterne = resData.sid;
        } else {
          console.error("Erreur de retour de l'API Twilio:", await res.text());
        }
      } catch (err) {
        console.error("Échec du click-to-call Twilio réel:", err);
      }
    } else {
      console.log(`[SIMULATION APPEL] Clic-to-call vers ${telephone} pour le prospect ${prospect.nom}`);
    }

    // Enregistre l'appel en base de données
    const appel = await scopedPrisma.appel.create({
      data: {
        organisationId: session.user.organisationId,
        prospectId,
        utilisateurId: session.user.id,
        numeroAppele: telephone.trim(),
        statut: 'en cours',
        idProviderExterne,
      },
    });

    return NextResponse.json({
      success: true,
      appel,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST call:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
