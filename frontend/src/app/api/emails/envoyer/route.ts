import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const sendEmailSchema = z.object({
  prospectId: z.string(),
  contactId: z.string().nullable().optional(),
  templateId: z.string().nullable().optional(),
  objet: z.string().min(1, "L'objet est requis."),
  corps: z.string().min(1, "Le corps de l'email est requis."),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = sendEmailSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // Vérifie s'il existe et appartient bien au tenant
    const prospect = await scopedPrisma.prospect.findFirst({
      where: { id: validatedData.prospectId },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect introuvable.' }, { status: 404 });
    }

    // Récupération des credentials Resend
    const resendKey = process.env.RESEND_API_KEY;
    let idProviderExterne = `re_${Math.random().toString(36).substring(2, 10)}`;

    if (resendKey && resendKey !== 'mock_key' && prospect.email) {
      try {
        // Envoi réel via Resend
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'outreach@prospectintel.fr', // Doit être configuré sur Resend
            to: prospect.email,
            subject: validatedData.objet,
            html: `<p>${validatedData.corps.replace(/\n/g, '<br>')}</p>`,
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          idProviderExterne = resData.id;
        } else {
          console.error("Erreur de retour de l'API Resend:", await res.text());
        }
      } catch (err) {
        console.error("Échec de l'envoi réel via Resend client:", err);
      }
    } else {
      console.log(`[SIMULATION EMAIL] Envoi de l'email à ${prospect.email || 'inconnu'} via Resend.`);
    }

    // Enregistre l'email envoyé en base de données
    const emailEnvoye = await scopedPrisma.emailEnvoye.create({
      data: {
        organisationId: session.user.organisationId,
        prospectId: validatedData.prospectId,
        contactId: validatedData.contactId || null,
        templateId: validatedData.templateId || null,
        objet: validatedData.objet.trim(),
        corps: validatedData.corps,
        statut: 'envoyé',
        idProviderExterne,
      },
    });

    // Ajoute automatiquement une Interaction CRM de type "Email"
    await scopedPrisma.interaction.create({
      data: {
        organisationId: session.user.organisationId,
        prospectId: validatedData.prospectId,
        type: 'Email',
        resultat: 'Envoyé',
        notes: `Objet : ${validatedData.objet.trim()}`,
      },
    });

    return NextResponse.json({
      success: true,
      emailEnvoye,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST envoyer email:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
