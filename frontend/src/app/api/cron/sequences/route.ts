import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  // Sécurité facultative pour éviter les appels externes non autorisés en prod
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const today = new Date();
    
    // 1. Récupère tous les prospects en cours de séquence dont la date d'envoi est arrivée ou dépassée
    const activeProspectSeqs = await prisma.prospectSequence.findMany({
      where: {
        statut: 'en cours',
        prochainEnvoi: {
          lte: today,
        },
      },
      include: {
        prospect: true,
        sequence: {
          include: {
            etapes: {
              orderBy: { ordre: 'asc' },
            },
          },
        },
      },
    });

    let emailsSent = 0;
    let sequencesStopped = 0;

    for (const ps of activeProspectSeqs) {
      const etapeActuelleOrdre = ps.etapeActuelle;
      const etape = ps.sequence.etapes.find(e => e.ordre === etapeActuelleOrdre);

      if (!etape) {
        // Plus d'étapes disponibles : termine la séquence
        await prisma.prospectSequence.update({
          where: { id: ps.id },
          data: { statut: 'terminée', prochainEnvoi: null },
        });
        continue;
      }

      // Règle d'arrêt automatique intelligent : Si la condition est "si_pas_de_reponse"
      if (etape.condition === 'si_pas_de_reponse') {
        // Vérifie si le prospect a répondu (soit via une interaction Email loggée manuellement avec résultat 'Répondu',
        // soit si un email envoyé a été cliqué/ouvert)
        const hasReplied = await prisma.interaction.findFirst({
          where: {
            prospectId: ps.prospectId,
            type: 'Email',
            resultat: 'Répondu',
            date: { gte: ps.dateDebut },
          },
        });

        const hasClicked = await prisma.emailEnvoye.findFirst({
          where: {
            prospectId: ps.prospectId,
            statut: { in: ['cliqué', 'ouvert'] },
            dateEnvoi: { gte: ps.dateDebut },
          },
        });

        if (hasReplied || hasClicked) {
          // Arrête la séquence pour ce prospect
          await prisma.prospectSequence.update({
            where: { id: ps.id },
            data: { statut: 'arrêtée', prochainEnvoi: null },
          });
          sequencesStopped++;
          continue;
        }
      }

      // Charge le template d'email
      const template = await prisma.templateEmail.findUnique({
        where: { id: etape.templateId },
      });

      if (!template) {
        console.error(`Template ${etape.templateId} introuvable pour la séquence ${ps.sequence.nom}`);
        continue;
      }

      // Envoi de l'email (Simulé ou réel selon clé API)
      const resendKey = process.env.RESEND_API_KEY;
      let idProviderExterne = `re_${Math.random().toString(36).substring(2, 10)}`;

      if (resendKey && resendKey !== 'mock_key' && ps.prospect.email) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'outreach@prospectintel.fr',
              to: ps.prospect.email,
              subject: template.objet,
              html: `<p>${template.corps.replace(/\n/g, '<br>')}</p>`,
            }),
          });
        } catch (e) {
          console.error("Échec envoi cron email:", e);
        }
      }

      // Enregistre l'email en BDD
      await prisma.emailEnvoye.create({
        data: {
          organisationId: ps.organisationId,
          prospectId: ps.prospectId,
          templateId: template.id,
          objet: template.objet,
          corps: template.corps,
          statut: 'envoyé',
          idProviderExterne,
        },
      });

      // Enregistre l'interaction
      await prisma.interaction.create({
        data: {
          organisationId: ps.organisationId,
          prospectId: ps.prospectId,
          type: 'Email',
          resultat: 'Envoyé',
          notes: `[Séquence: ${ps.sequence.nom}] Étape ${etapeActuelleOrdre + 1} - ${template.objet}`,
        },
      });

      // Calcule le prochain envoi
      const nextEtapeOrdre = etapeActuelleOrdre + 1;
      const nextEtape = ps.sequence.etapes.find(e => e.ordre === nextEtapeOrdre);

      if (nextEtape) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + nextEtape.delaiJours);
        
        await prisma.prospectSequence.update({
          where: { id: ps.id },
          data: {
            etapeActuelle: nextEtapeOrdre,
            prochainEnvoi: nextDate,
          },
        });
      } else {
        // C'était la dernière étape
        await prisma.prospectSequence.update({
          where: { id: ps.id },
          data: {
            etapeActuelle: nextEtapeOrdre,
            statut: 'terminée',
            prochainEnvoi: null,
          },
        });
      }

      emailsSent++;
    }

    return NextResponse.json({
      success: true,
      processed: activeProspectSeqs.length,
      emailsSent,
      sequencesStopped,
    });
  } catch (error) {
    console.error('Erreur CRON sequences:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
