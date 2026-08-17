import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const iaSchema = z.object({
  interactionId: z.string(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { interactionId } = iaSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // 1. Récupère l'interaction et vérifie le tenant
    const interaction = await scopedPrisma.interaction.findUnique({
      where: { id: interactionId },
    });

    if (!interaction) {
      return NextResponse.json({ error: 'Interaction introuvable.' }, { status: 404 });
    }

    const notes = interaction.notes || '';
    let resume = '';
    let intentionDetectee = 'Tiède';
    let actionSuggeree = 'Programmer une relance dans 2 semaines.';

    // Appel Anthropic API si clé configurée
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    if (claudeKey && claudeKey !== 'mock_key') {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 150,
            messages: [
              {
                role: 'user',
                content: `Analyse la note d'échange commercial suivante :\n"${notes}"\n\nDonne une réponse JSON au format précis suivant :\n{\n  "resume": "résumé en 3 points",\n  "intention": "Chaud" ou "Tiède" ou "Froid",\n  "action": "action suggérée"\n}`,
              },
            ],
          }),
        });

        if (response.ok) {
          const resJson = await response.json();
          const contentText = resJson.content?.[0]?.text || '';
          const parsed = JSON.parse(contentText.trim());
          resume = parsed.resume || '';
          intentionDetectee = parsed.intention || 'Tiède';
          actionSuggeree = parsed.action || '';
        } else {
          throw new Error('Echec retour Claude');
        }
      } catch (err) {
        console.error("Échec appel Claude API, retour au classificateur heuristique:", err);
      }
    }

    // Heuristique de secours si pas de réponse Claude
    if (!resume) {
      const lowerNotes = notes.toLowerCase();
      
      const positiveWords = ['intéressé', 'rappel', 'rdv', 'démo', 'ok', 'oui', 'rencontrer', 'besoin', 'tarif', 'devis'];
      const negativeWords = ['pas intéressé', 'non merci', 'trop cher', 'aucune utilité', 'fermer', 'ne veut pas', 'refus'];

      const hasPositive = positiveWords.some(w => lowerNotes.includes(w));
      const hasNegative = negativeWords.some(w => lowerNotes.includes(w));

      if (hasNegative) {
        intentionDetectee = 'Froid';
        actionSuggeree = 'Marquer comme perdu et exclure des campagnes.';
      } else if (hasPositive || interaction.resultat === 'Répondu') {
        intentionDetectee = 'Chaud';
        actionSuggeree = 'Planifier un rendez-vous (RDV) ou proposer un lien de booking.';
      } else {
        intentionDetectee = 'Tiède';
        actionSuggeree = 'Planifier un rappel de suivi ou relancer par email sous 10 jours.';
      }

      resume = `• Échange commercial via ${interaction.type}.
• Intention perçue : prospect qualifié de niveau ${intentionDetectee}.
• Notes : ${notes.substring(0, 80)}${notes.length > 80 ? '...' : ''}`;
    }

    // Enregistre l'analyse IA
    const analyseIA = await scopedPrisma.analyseIA.create({
      data: {
        organisationId: session.user.organisationId,
        interactionId,
        resume,
        intentionDetectee,
        actionSuggeree,
      },
    });

    return NextResponse.json({
      success: true,
      analyseIA,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST analyser IA:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
