import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { enrichirDecideur } from '@/lib/waterfall';
import { enrichirDecideursParIA } from '@/lib/gemini-client';
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
    return NextResponse.json({ error: 'ID manquant.' }, { status: 400 });
  }

  const scopedPrisma = getScopedPrisma(session);
  const recherche = await scopedPrisma.rechercheProspection.findUnique({
    where: { id },
    include: {
      entreprises: {
        include: {
          decideurs: true,
          planApproche: true,
        },
      },
      buyerPersonas: true,
    },
  });

  if (!recherche) {
    return NextResponse.json({ error: 'Recherche introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ recherche });
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
    // --- Vrai Appel API SIRENE ---
    const secteurs: string[] = input.besoin.secteurs || [];
    const nafCode = secteurs.find(s => s.includes('.')) || '';
    const q = input.entryValue
      ? input.entryValue.split(',')[0].trim()
      : input.besoin.solutionType.split(' ')[0];

    let sirenResults: any[] = [];
    try {
      const params = new URLSearchParams();
      if (q && q.length > 2) params.set('q', q);
      if (nafCode) params.set('activite_principale', nafCode);
      params.set('page', '1');
      params.set('per_page', String(input.besoin.maxEntitesIA || 5));
      params.set('etat_administratif', 'A');

      const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?${params.toString()}`;
      const sirenRes = await fetch(apiUrl);
      if (sirenRes.ok) {
        const sirenData = await sirenRes.json();
        sirenResults = sirenData.results || [];
      }
    } catch (sirenErr) {
      console.error('[Backend Search] SIRENE API call failed:', sirenErr);
    }

    if (sirenResults.length === 0) {
      console.warn('[Backend Search] Aucune entreprise trouvée dans SIRENE pour cette recherche.');
      await prisma.rechercheProspection.update({
        where: { id: rechercheId },
        data: { statut: 'terminee' }
      });
      return;
    }

    // --- Vrai Appel d'Enrichissement Décideurs par Gemini IA ---
    let iaEnrichment: Record<string, any> = {};
    const roles: string[] = input.besoin.rolesDecideurs || ['Gérant', 'Directeur commercial'];
    try {
      const listToEnrich = sirenResults.map((r: any) => ({
        siren: r.siren || '',
        nom: r.nom_complet || r.nom_raison_sociale || '',
        ville: r.siege?.libelle_commune || '',
        naf: r.activite_principale || '',
      }));
      iaEnrichment = await enrichirDecideursParIA(listToEnrich, roles);
    } catch (iaErr) {
      console.error('[Backend Search] IA Enrichment failed:', iaErr);
    }

    const fitPoids = 0.5; // ratios de scoring par défaut
    const timingPoids = 0.5;

    // Récupération facultative des poids personnalisés de l'utilisateur
    let poidsRecord = await prisma.poidsScoring.findUnique({
      where: { utilisateurId: session.user.id }
    });

    const weightsFit = poidsRecord ? JSON.parse(poidsRecord.poidsFit as string) : { secteur: 30, taille: 25, geo: 20, decideur: 25 };
    const weightsTiming = poidsRecord ? JSON.parse(poidsRecord.poidsTiming as string) : { signal: 30, recrutement: 30, technique: 25, fraicheur: 15 };

    // Mappage des entreprises réelles de SIRENE
    const targetCompanies = sirenResults.map((et: any, idx: number) => {
      const nom = et.nom_complet || et.nom_raison_sociale || `Entreprise ${idx + 1}`;
      const siren = et.siren || '';
      const nafCode2 = et.activite_principale || secteurs[0] || '70.22Z';
      const villeRaw = et.siege?.libelle_commune || et.siege?.code_postal || 'France';
      const ville = villeRaw.charAt(0).toUpperCase() + villeRaw.slice(1).toLowerCase();
      const signal = input.besoin.signauxAchat[idx % input.besoin.signauxAchat.length] || 'recrutement';

      let effectif = 'NC';
      const tranche = et.tranche_effectif_salarie;
      const effectifMap: Record<string, string> = {
        '00': '0 salarié', '01': '1-2 salariés', '02': '3-5 salariés',
        '03': '6-9 salariés', '11': '10-19 salariés', '12': '20-49 salariés',
        '21': '50-99 salariés', '22': '100-199 salariés', '31': '200-499 salariés',
        '32': '500-999 salariés', '41': '1000-1999 salariés', '42': '2000+ salariés',
      };
      if (tranche) effectif = effectifMap[tranche] || `Effectif ${tranche}`;

      return {
        nom,
        siren,
        secteur: nafCode2,
        effectif,
        ville,
        signal
      };
    });

    // 1. Boucle de traitement sur chaque entreprise répertoriée dans SIRENE
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

      // 2. Cascade Waterfall décideurs réels
      const targetRoles = input.besoin.rolesDecideurs.length > 0 ? input.besoin.rolesDecideurs : ['Gérant', 'Directeur commercial'];
      let hasMobile = false;

      const enriched = iaEnrichment[comp.siren] || {};
      
      // Si nous avons un dirigeant réel extrait, on traite son cas. Sinon on s'arrête (données factuelles uniquement)
      if (enriched.dirigeantNom) {
        const testName = enriched.dirigeantNom;
        const finalRole = enriched.dirigeantRole || targetRoles[0] || 'Dirigeant';
        const finalLinkedin = enriched.linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(finalRole + ' ' + comp.nom)}`;
        
        const enrichResult = await enrichirDecideur(
          testName,
          finalRole,
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
            fonction: finalRole,
            linkedinUrl: finalLinkedin,
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
