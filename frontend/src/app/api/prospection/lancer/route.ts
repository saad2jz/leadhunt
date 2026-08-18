import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { enrichirDecideur } from '@/lib/waterfall';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const launchSchema = z.object({
  entryType: z.enum(['entreprise', 'motscles']),
  entryValue: z.string().min(2),
  besoin: z.object({
    solutionType: z.string().min(2),
    tailleMin: z.number().default(1),
    tailleMax: z.number().default(200),
    zonesGeo: z.array(z.string()).default([]),
    secteurs: z.array(z.string()).default([]),
    budgetType: z.string().default('Moyen'),
    signauxAchat: z.array(z.string()).default([]),
    rolesDecideurs: z.array(z.string()).default([]),
    maxEntitesIA: z.number().min(1).max(10).default(5),
  }),
});

// GET: Récupère l'état et les résultats d'une recherche
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID de recherche manquant.' }, { status: 400 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);

    const recherche = await scopedPrisma.rechercheProspection.findFirst({
      where: { id },
      include: {
        entreprises: {
          include: {
            decideurs: true,
            planApproche: true,
          },
          orderBy: { fitScore: 'desc' },
        },
        buyerPersonas: true,
      },
    });

    if (!recherche) {
      return NextResponse.json({ error: 'Recherche introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ recherche });
  } catch (error) {
    console.error('Erreur GET prospection status:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}

// POST: Lance une nouvelle recherche
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = launchSchema.parse(body);

    const scopedPrisma = getScopedPrisma(session);

    // 1. Création de la recherche en statut "en_cours"
    const recherche = await scopedPrisma.rechercheProspection.create({
      data: {
        organisationId: session.user.organisationId,
        utilisateurId: session.user.id,
        entryType: validatedData.entryType,
        entryValue: validatedData.entryValue,
        besoin: JSON.stringify(validatedData.besoin),
        statut: 'en_cours',
      },
    });

    // 2. Traitement asynchrone en arrière-plan (non bloquant)
    processSearchInBackground(recherche.id, validatedData, session);

    return NextResponse.json({
      success: true,
      rechercheId: recherche.id,
      message: 'Recherche de prospection lancée avec succès.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST prospection lancer:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}

/**
 * Fonction asynchrone exécutant l'extraction de leads en arrière-plan
 */
async function processSearchInBackground(rechercheId: string, input: any, session: any) {
  const orgId = session.user.organisationId;
  console.log(`[Recherche: ${rechercheId}] Démarrage du traitement en tâche de fond.`);

  try {
    // Liste d'entreprises fictives à prospecter pour la démo de prospection
    const mockCompanies = [
      { nom: 'Alpha Services', siren: '123456789', secteur: '70.22Z', effectif: '45 salariés', ville: 'Paris', departement: '75', signal: 'recrutement' },
      { nom: 'Beta Tech', siren: '987654321', secteur: '62.01Z', effectif: '85 salariés', ville: 'Lyon', departement: '69', signal: 'levees_fonds' },
      { nom: 'Gamma Consulting', siren: '111222333', secteur: '70.22Z', effectif: '12 salariés', ville: 'Marseille', departement: '13', signal: 'refonte_site' },
      { nom: 'Delta Immo', siren: '444555666', secteur: '68.31Z', effectif: '22 salariés', ville: 'Bordeaux', departement: '33', signal: 'recrutement' },
      { nom: 'Epsilon Retail', siren: '777888999', secteur: '47.11D', effectif: '60 salariés', ville: 'Lille', departement: '59', signal: 'none' },
    ];

    const targetCompanies = mockCompanies.filter(comp => {
      // Filtrage simple pour rendre la simulation interactive
      if (input.besoin.secteurs.length > 0 && !input.besoin.secteurs.includes(comp.secteur)) {
        return Math.random() > 0.5; // garde aléatoirement si hors critères
      }
      return true;
    }).slice(0, input.besoin.maxEntitesIA);

    const fitPoids = 0.5; // ratios de scoring par défaut
    const timingPoids = 0.5;

    // Récupération facultative des poids personnalisés de l'utilisateur
    let poidsRecord = await prisma.poidsScoring.findUnique({
      where: { utilisateurId: session.user.id }
    });

    const weightsFit = poidsRecord ? JSON.parse(poidsRecord.poidsFit as string) : { secteur: 30, taille: 25, geo: 20, decideur: 25 };
    const weightsTiming = poidsRecord ? JSON.parse(poidsRecord.poidsTiming as string) : { signal: 30, recrutement: 30, technique: 25, fraicheur: 15 };

    // 1. Boucle de traitement sur chaque entreprise
    for (const comp of targetCompanies) {
      // Vérification/Création du cache global public
      let cache = await prisma.entrepriseCache.findUnique({
        where: { siren: comp.siren }
      });

      if (!cache) {
        cache = await prisma.entrepriseCache.create({
          data: {
            siren: comp.siren,
            nom: comp.nom,
            secteur: comp.secteur,
            effectif: comp.effectif,
            ville: comp.ville,
            signauxBruts: JSON.stringify({ signalAchat: comp.signal }),
          }
        });
      }

      // Calcul des scores
      // Fit Score
      let fitScore = 60; // score de base
      if (input.besoin.secteurs.includes(comp.secteur)) fitScore += (weightsFit.secteur * 0.4);
      if (input.besoin.zonesGeo.some((z: string) => z.includes(comp.ville) || z.includes('Toute la France'))) fitScore += (weightsFit.geo * 0.4);
      fitScore = Math.min(Math.round(fitScore + Math.random() * 20), 100);

      // Timing Score
      let timingScore = 40;
      if (input.besoin.signauxAchat.includes(comp.signal)) timingScore += (weightsTiming.signal * 0.5);
      if (comp.signal === 'recrutement') timingScore += (weightsTiming.recrutement * 0.5);
      timingScore = Math.min(Math.round(timingScore + Math.random() * 30), 100);

      // Vérification CRM existant
      const existingCRM = await prisma.prospect.findFirst({
        where: { organisationId: orgId, siren: comp.siren }
      });

      // Création de l'entreprise trouvée
      const entTrouvee = await prisma.entrepriseTrouvee.create({
        data: {
          organisationId: orgId,
          rechercheId: rechercheId,
          entrepriseCacheId: cache.id,
          nom: comp.nom,
          secteur: comp.secteur,
          effectif: comp.effectif,
          ville: comp.ville,
          fitScore,
          fitDetail: JSON.stringify({ secteurMatch: true, geoMatch: true }),
          timingScore,
          timingDetail: JSON.stringify({ signalDetecte: comp.signal }),
          statutCRM: existingCRM ? 'deja_en_pipe' : 'nouveau',
          prospectId: existingCRM?.id || null,
        }
      });

      // 2. Cascade Waterfall décideurs
      const targetRoles = input.besoin.rolesDecideurs.length > 0 ? input.besoin.rolesDecideurs : ['CTO', 'Gérant'];
      let hasMobile = false;
      
      for (const role of targetRoles) {
        const testName = role === 'Gérant' ? 'Marc Lemaire' : role === 'CTO' ? 'Sarah Dubreuil' : 'Jean Dupont';
        
        const enrichResult = await enrichirDecideur(
          testName,
          role,
          comp.nom,
          'FR',
          session
        );

        if (enrichResult.telephone && enrichResult.telephoneType === 'mobile') {
          hasMobile = true;
        }

        const decideur = await prisma.decideurTrouve.create({
          data: {
            organisationId: orgId,
            entrepriseTrouveeId: entTrouvee.id,
            nom: testName,
            fonction: role,
            linkedinUrl: `https://www.linkedin.com/in/mock-${testName.toLowerCase().replace(' ', '-')}`,
            emailTrouve: enrichResult.email,
            emailStatutVerif: enrichResult.emailStatutVerif,
            emailProbabiliteBounce: enrichResult.emailProbabiliteBounce,
            telephoneTrouve: enrichResult.telephone,
            telephoneType: enrichResult.telephoneType,
            telephoneActif: enrichResult.telephoneActif,
            telephoneNomCorrespond: enrichResult.telephoneNomCorrespond,
            confiance: enrichResult.confiance,
            source: enrichResult.source,
            fournisseursConsultes: JSON.stringify(enrichResult.fournisseursConsultes),
          }
        });

        // Enregistrer la triple vérification d'email
        if (enrichResult.email) {
          await prisma.verificationEmail.create({
            data: {
              organisationId: orgId,
              decideurId: decideur.id,
              moteur: 'smtp_check',
              resultat: enrichResult.emailStatutVerif === 'verifie' ? 'valide' : 'risque',
            }
          });
        }
      }

      // 3. Plan d'approche (Claude ou simulation)
      const angle = fitScore > 80 ? "Positionnement valeur direct" : "Approche indirecte / Partage de contenu";
      const draft = `Bonjour,\n\nJ'ai remarqué vos récents développements chez ${comp.nom} (notamment sur l'aspect ${comp.signal}).\n\nAu vu de votre croissance, je pense que notre solution de ${input.besoin.solutionType} pourrait accélérer votre productivité.\n\nSeriez-vous ouvert à un échange de 10 min ce jeudi ?\n\nCordialement,\n${session.user.email.split('@')[0]}`;

      const phoneNum = hasMobile;

      await prisma.planApproche.create({
        data: {
          organisationId: orgId,
          entrepriseTrouveeId: entTrouvee.id,
          canalRecommande: 'email',
          angleAccroche: angle,
          etapesSequence: JSON.stringify([
            { jour: 1, action: "Warmup - Visite profil LinkedIn de la cible + Suivi page de l'entreprise" },
            { jour: 3, action: `Premier Contact - Cold Emailing personnalisé sur l'aspect ${comp.signal || 'développement'}` },
            { jour: 5, action: "LinkedIn - Demande de connexion avec message court d'accroche" },
            { jour: 7, action: phoneNum ? "Téléphone (Cold Calling) - Premier appel direct suite à l'email" : "LinkedIn - Relance de courtoisie suite à la demande de connexion" },
            { jour: 12, action: "Nurturing - Envoi d'une étude de cas client par e-mail" }
          ]),
          messageDraft: draft,
        }
      });
    }

    // 4. Buyer Persona (Claude ou simulation)
    const primaryRole = input.besoin.rolesDecideurs[0] || 'Décideur';
    await prisma.buyerPersona.create({
      data: {
        organisationId: orgId,
        rechercheId: rechercheId,
        roleTarget: primaryRole,
        motivations: JSON.stringify([
          'Gagner du temps sur les tâches opérationnelles quotidiennes.',
          'Réduire les coûts de fonctionnement des processus B2B.'
        ]),
        objections: JSON.stringify([
          "Manque de temps ou de budget pour implémenter un nouvel outil.",
          "Crainte du changement pour les équipes opérationnelles."
        ]),
        vocabulaire: JSON.stringify([
          "ROI", "Gains de temps", "Automation", "Simplicité d'usage"
        ]),
        kpis: JSON.stringify([
          "Taux de conversion", "Coût d'acquisition (CAC)", "Délai de traitement"
        ]),
      }
    });

    // 5. Recherche marquée comme terminée avec succès
    await prisma.rechercheProspection.update({
      where: { id: rechercheId },
      data: { statut: 'terminee' }
    });

    console.log(`[Recherche: ${rechercheId}] Traitement terminé avec succès.`);
  } catch (err) {
    console.error(`[Recherche: ${rechercheId}] Erreur lors de l'exécution asynchrone:`, err);
    await prisma.rechercheProspection.update({
      where: { id: rechercheId },
      data: { statut: 'erreur' }
    });
  }
}
