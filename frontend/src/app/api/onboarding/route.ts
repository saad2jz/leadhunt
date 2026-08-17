import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { recommanderPlanEtModules } from '@/lib/onboarding-recommandation';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schéma pour la mise à jour de l'onboarding
const onboardingUpdateSchema = z.object({
  etapeActuelle: z.number().min(1).max(5).optional(),
  reponsesDiagnostic: z.record(z.string(), z.any()).optional(),
  planChoisi: z.enum(['starter', 'pro', 'business', 'entreprise']).optional(),
  modulesChoisis: z.array(z.string()).optional(),
  termine: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    
    // Récupère l'état d'onboarding de l'organisation
    let onboarding = await scopedPrisma.onboardingOrganisation.findFirst();

    if (!onboarding) {
      // Création automatique si inexistant (cas limite)
      onboarding = await scopedPrisma.onboardingOrganisation.create({
        data: {
          organisationId: session.user.organisationId,
          etapeActuelle: 1,
          reponsesDiagnostic: JSON.stringify({}),
          planRecommande: 'starter',
          termine: false,
        },
      });
    }

    // Calcul de l'état réel de la checklist interactive (Étape 3)
    const prospectsCount = await scopedPrisma.prospect.count();
    const contactsCount = await scopedPrisma.contact.count();
    const campagnesCount = await scopedPrisma.campagne.count();

    const checklist = {
      rechercheFaite: prospectsCount > 0, // Si prospect importé, recherche forcément faite
      prospectsImportes: prospectsCount >= 5,
      contactDecideurAjoute: contactsCount >= 1,
      campagneCreee: campagnesCount >= 1,
    };

    return NextResponse.json({
      onboarding: {
        ...onboarding,
        reponsesDiagnostic: onboarding.reponsesDiagnostic ? JSON.parse(onboarding.reponsesDiagnostic) : {},
      },
      checklist,
    });
  } catch (error) {
    console.error('Erreur GET onboarding:', error);
    return NextResponse.json({ error: 'Une erreur est survenue lors de la récupération de l\'onboarding.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = onboardingUpdateSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    let onboarding = await scopedPrisma.onboardingOrganisation.findFirst();

    if (!onboarding) {
      return NextResponse.json({ error: 'Dossier onboarding introuvable.' }, { status: 404 });
    }

    const updates: any = {};

    if (validatedData.etapeActuelle !== undefined) {
      updates.etapeActuelle = validatedData.etapeActuelle;
    }

    if (validatedData.reponsesDiagnostic !== undefined) {
      const reponses = validatedData.reponsesDiagnostic;
      updates.reponsesDiagnostic = JSON.stringify(reponses);

      // Calcul automatique de la recommandation si les réponses de diagnostic sont complètes
      if (reponses.tailleEquipe && reponses.crmActuel && reponses.modeProspection) {
        const volume = Number(reponses.volumeProspects) || 0;
        const recommandation = recommanderPlanEtModules({
          tailleEquipe: reponses.tailleEquipe,
          crmActuel: reponses.crmActuel,
          modeProspection: reponses.modeProspection,
          volumeProspects: volume,
          secteurs: reponses.secteurs || [],
        });
        updates.planRecommande = recommandation.plan;
      }
    }

    if (validatedData.termine !== undefined) {
      updates.termine = validatedData.termine;
    }

    // Met à jour l'onboarding dans la transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mise à jour de l'onboarding
      await tx.onboardingOrganisation.update({
        where: { id: onboarding!.id },
        data: updates,
      });

      // 2. Si l'utilisateur a choisi un plan (ou si on finalise), on met à jour l'organisation
      if (validatedData.planChoisi || validatedData.termine) {
        const plan = validatedData.planChoisi || onboarding!.planRecommande || 'starter';
        
        // Re-calcule les modules conseillés si on n'a pas de modulesChoisis explicites
        let modulesActifs = validatedData.modulesChoisis;
        if (!modulesActifs && onboarding!.reponsesDiagnostic) {
          const reponses = JSON.parse(onboarding!.reponsesDiagnostic || '{}');
          if (reponses.tailleEquipe && reponses.crmActuel) {
            const volume = Number(reponses.volumeProspects) || 0;
            const recommandation = recommanderPlanEtModules({
              tailleEquipe: reponses.tailleEquipe,
              crmActuel: reponses.crmActuel,
              modeProspection: reponses.modeProspection,
              volumeProspects: volume,
              secteurs: reponses.secteurs || [],
            });
            modulesActifs = recommandation.modules;
          }
        }

        await tx.organisation.update({
          where: { id: session.user.organisationId },
          data: {
            plan: plan,
            modulesActifs: JSON.stringify(modulesActifs || ['sirene', 'pipeline', 'dashboard', 'liste_noire']),
          },
        });
      }
    });

    const updatedOnboarding = await scopedPrisma.onboardingOrganisation.findFirst();

    return NextResponse.json({
      success: true,
      onboarding: {
        ...updatedOnboarding,
        reponsesDiagnostic: updatedOnboarding?.reponsesDiagnostic ? JSON.parse(updatedOnboarding.reponsesDiagnostic) : {},
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST onboarding:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
