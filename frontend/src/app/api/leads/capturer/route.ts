import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recalculateProspectScore } from '@/lib/scoring';
import { z } from 'zod';

const captureSchema = z.object({
  organisationId: z.string(),
  source: z.string().default('formulaire_site'),
  nom: z.string().nullable().optional(),
  email: z.string().email('Format email invalide.').nullable().optional().or(z.literal('')),
  telephone: z.string().nullable().optional(),
  entreprise: z.string().nullable().optional(),
  reponsesFormulaire: z.string().optional(), // JSON stringifié
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = captureSchema.parse(body);

    // Vérifie que l'organisation existe
    const org = await prisma.organisation.findUnique({
      where: { id: validated.organisationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organisation introuvable.' }, { status: 404 });
    }

    // 1. Calcul du score de qualification de base
    let scoreQualification = 0;
    if (validated.nom) scoreQualification += 10;
    if (validated.email) scoreQualification += 20;
    if (validated.telephone) scoreQualification += 20;
    if (validated.entreprise) scoreQualification += 20;

    // Parse les réponses personnalisées
    let parsedForm: any = {};
    if (validated.reponsesFormulaire) {
      try {
        parsedForm = JSON.parse(validated.reponsesFormulaire);
        // Exemples de questions de qualification : budget et urgence
        if (parsedForm.budget && String(parsedForm.budget).toLowerCase().includes('élevé') || Number(parsedForm.budget) > 1000) {
          scoreQualification += 20;
        }
        if (parsedForm.urgence && String(parsedForm.urgence).toLowerCase().includes('immédiat')) {
          scoreQualification += 10;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Routage automatique via RegleRoutage
    const rules = await prisma.regleRoutage.findMany({
      where: { organisationId: validated.organisationId, actif: true },
      orderBy: { ordre: 'asc' },
    });

    let assigneAId: string | null = null;

    // Évalue les conditions de routage
    for (const rule of rules) {
      try {
        const cond = JSON.parse(rule.condition || '{}');
        let matches = true;

        if (cond.scoreMin && scoreQualification < cond.scoreMin) {
          matches = false;
        }
        if (cond.secteur && parsedForm.secteur && !String(parsedForm.secteur).toLowerCase().includes(String(cond.secteur).toLowerCase())) {
          matches = false;
        }

        if (matches) {
          assigneAId = rule.assigneAId;
          break; // Trouvé première règle active
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Fallback si aucune règle ne correspond : premier commercial trouvé dans l'org
    if (!assigneAId) {
      const fallbackUser = await prisma.utilisateur.findFirst({
        where: { organisationId: validated.organisationId, role: 'Commercial' },
      });
      assigneAId = fallbackUser?.id || null;
    }

    // 3. Crée le LeadEntrant en base
    const lead = await prisma.leadEntrant.create({
      data: {
        organisationId: validated.organisationId,
        source: validated.source,
        nom: validated.nom || null,
        email: validated.email || null,
        telephone: validated.telephone || null,
        entreprise: validated.entreprise || null,
        reponsesFormulaire: validated.reponsesFormulaire || '{}',
        scoreQualification,
        statutIntake: 'routé',
        assigneAId,
      },
    });

    // 4. Crée automatiquement le Prospect dans le CRM
    const prospect = await prisma.prospect.create({
      data: {
        organisationId: validated.organisationId,
        nom: validated.entreprise || validated.nom || 'Prospect Inbound',
        email: validated.email || null,
        telephone: validated.telephone || null,
        statut: 'À appeler',
        assigneAId,
        notes: `Lead Inbound capturé le ${new Date().toLocaleDateString('fr-FR')} depuis ${validated.source}. Score qualification: ${scoreQualification}/100.`,
      },
    });

    // Lie le premier contact
    if (validated.nom) {
      await prisma.contact.create({
        data: {
          organisationId: validated.organisationId,
          prospectId: prospect.id,
          nom: validated.nom,
          fonction: 'Lead Inbound',
          email: validated.email || null,
          telephone: validated.telephone || null,
        },
      });
    }

    // Lie le prospect au lead entrant
    await prisma.leadEntrant.update({
      where: { id: lead.id },
      data: { prospectId: prospect.id },
    });

    // Recalcule le score d'adéquation CRM global
    await recalculateProspectScore(prospect.id);

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      prospectId: prospect.id,
      score: scoreQualification,
      assigneAId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur public capture lead:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
