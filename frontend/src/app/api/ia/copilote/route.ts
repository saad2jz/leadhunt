import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const chatSchema = z.object({
  message: z.string().min(1, 'Message vide.'),
  conversationId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message, conversationId } = chatSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    let convId = conversationId;
    let messagesList: any[] = [];

    // 1. Récupère ou crée la conversation
    if (convId) {
      const conv = await scopedPrisma.conversationAgent.findUnique({
        where: { id: convId },
      });
      if (conv) {
        messagesList = JSON.parse(conv.messages || '[]');
      }
    } else {
      const newConv = await scopedPrisma.conversationAgent.create({
        data: {
          organisationId: session.user.organisationId,
          utilisateurId: session.user.id,
          messages: '[]',
        },
      });
      convId = newConv.id;
    }

    // Ajoute le message de l'utilisateur
    messagesList.push({ role: 'user', content: message });

    let responseText = '';
    let proposedAction: any = null;

    // NOTE: This route is now a fallback. The CopiloteWidget calls Gemini directly.
    const lowerMessage = message.toLowerCase();

    // Check if previous message asked for a sector and we need to capture the text input
    const wasAskedForSector = messagesList.length >= 3 && 
      messagesList[messagesList.length - 2]?.role === 'assistant' && 
      messagesList[messagesList.length - 2]?.content?.includes('Quel secteur');

    if (lowerMessage === 'lancer une recherche sirene' || lowerMessage === 'recherche sirene') {
      responseText = "Quel secteur d'activité ou mot-clé recherchez-vous ? Saisissez-le ci-dessous (ex: Restauration, BTP, Logiciel...) :";
    } else if (wasAskedForSector || lowerMessage.includes('recherche') || lowerMessage.includes('trouve') || lowerMessage.includes('sirene')) {
      let target = '';
      if (lowerMessage.includes('btp')) target = 'BTP';
      else if (lowerMessage.includes('restaurant') || lowerMessage.includes('restau')) target = 'Restauration';
      else if (lowerMessage.includes('coiffeur')) target = 'Coiffure';
      else if (wasAskedForSector) {
        target = message.trim();
      } else {
        target = 'Logiciel';
      }

      responseText = `Je comprends que vous souhaitez sourcer de nouvelles entreprises dans le secteur : **${target}**. Je propose de lancer une recherche SIRENE ciblée.`;
      
      // Crée l'action proposée
      proposedAction = {
        typeAction: 'recherche_entreprise',
        parametres: JSON.stringify({ secteur: target, ville: 'Paris' }),
        statut: 'proposée',
      };
    } else if (lowerMessage.includes('inscrire') || lowerMessage.includes('séquence') || lowerMessage.includes('sequence')) {
      responseText = "Je propose d'inscrire vos prospects qualifiés récents à votre séquence d'outreach email active.";
      proposedAction = {
        typeAction: 'inscrire_sequence',
        parametres: JSON.stringify({ sequenceId: 'default' }),
        statut: 'proposée',
      };
    } else if (lowerMessage.includes('mail') || lowerMessage.includes('email') || lowerMessage.includes('envoyer')) {
      responseText = "Je propose d'envoyer un email de relance à vos prospects restés sans réponse depuis 7 jours.";
      proposedAction = {
        typeAction: 'envoyer_email',
        parametres: JSON.stringify({ delayDays: 7 }),
        statut: 'proposée',
      };
    } else if (lowerMessage.includes('combien') || lowerMessage.includes('stat') || lowerMessage.includes('leads')) {
      // Lecture seule : réponse immédiate
      const count = await scopedPrisma.prospect.count();
      const rdvCount = await scopedPrisma.prospect.count({ where: { statut: 'RDV pris' } });
      responseText = `Vous avez actuellement **${count}** prospects dans votre CRM, dont **${rdvCount}** avec un rendez-vous fixé. Votre performance est stable !`;
    } else {
      responseText = "Bonjour ! Je suis votre copilote commercial IA. Je peux chercher de nouveaux prospects, les inscrire à des campagnes d'outreach ou analyser vos statistiques. Décrivez-moi votre besoin !";
    }

    // Ajoute la réponse de l'assistant
    messagesList.push({ role: 'assistant', content: responseText });

    // Enregistre l'historique de conversation
    await scopedPrisma.conversationAgent.update({
      where: { id: convId },
      data: { messages: JSON.stringify(messagesList) },
    });

    // Enregistre l'action s'il y a lieu
    let actionLog = null;
    if (proposedAction) {
      actionLog = await scopedPrisma.actionAgent.create({
        data: {
          conversationId: convId,
          typeAction: proposedAction.typeAction,
          parametres: proposedAction.parametres,
          statut: 'proposée',
        },
      });
    }

    return NextResponse.json({
      success: true,
      conversationId: convId,
      messages: messagesList,
      proposedAction: actionLog,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur copilote IA:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
