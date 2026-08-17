import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const quoteSchema = z.object({
  id: z.string().optional(),
  prospectId: z.string(),
  statut: z.enum(['brouillon', 'envoyé', 'accepté', 'refusé']).default('brouillon'),
  tauxTVA: z.number().default(20),
  lignes: z.array(
    z.object({
      description: z.string().min(1, 'La description est requise.'),
      quantite: z.number().min(1),
      prixUnitaire: z.number().min(0),
    })
  ),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const prospectId = searchParams.get('prospectId');

  try {
    const scopedPrisma = getScopedPrisma(session);
    
    const devis = await scopedPrisma.devis.findMany({
      where: prospectId ? { prospectId } : {},
      include: {
        prospect: { select: { nom: true } },
        lignes: { orderBy: { ordre: 'asc' } },
      },
      orderBy: { dateCreation: 'desc' },
    });

    return NextResponse.json({ devis });
  } catch (error) {
    console.error('Erreur GET devis:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = quoteSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // Calcule HT et TTC
    let montantHT = 0;
    validated.lignes.forEach(l => {
      montantHT += l.quantite * l.prixUnitaire;
    });
    const montantTTC = Number((montantHT * (1 + validated.tauxTVA / 100)).toFixed(2));
    montantHT = Number(montantHT.toFixed(2));

    const result = await scopedPrisma.$transaction(async (tx) => {
      let devisId = validated.id;
      let numero = '';

      if (devisId) {
        // Mode update : Supprime d'abord les anciennes lignes
        await tx.ligneDevis.deleteMany({
          where: { devisId },
        });

        const dev = await tx.devis.update({
          where: { id: devisId },
          data: {
            statut: validated.statut,
            montantHT,
            montantTTC,
            tauxTVA: validated.tauxTVA,
          },
        });
        numero = dev.numero;
      } else {
        // Mode création : génère un numéro DEV-YYYY-XXX
        const currentYear = new Date().getFullYear();
        const count = await tx.devis.count({
          where: { organisationId: session.user.organisationId },
        });
        const numSeq = String(count + 1).padStart(3, '0');
        numero = `DEV-${currentYear}-${numSeq}`;

        const dev = await tx.devis.create({
          data: {
            organisationId: session.user.organisationId,
            prospectId: validated.prospectId,
            numero,
            statut: validated.statut,
            montantHT,
            montantTTC,
            tauxTVA: validated.tauxTVA,
          },
        });
        devisId = dev.id;
      }

      // Enregistre les nouvelles lignes
      for (let i = 0; i < validated.lignes.length; i++) {
        const line = validated.lignes[i];
        if (line) {
          await tx.ligneDevis.create({
            data: {
              devisId: devisId!,
              description: line.description,
              quantite: line.quantite,
              prixUnitaire: line.prixUnitaire,
              ordre: i,
            },
          });
        }
      }

      // Si le devis est marqué "accepté", on change le prospect en "Client"
      if (validated.statut === 'accepté') {
        await tx.prospect.update({
          where: { id: validated.prospectId },
          data: { statut: 'Client' },
        });

        // Crée l'interaction CRM correspondante
        await tx.interaction.create({
          data: {
            organisationId: session.user.organisationId,
            prospectId: validated.prospectId,
            type: 'RDV',
            resultat: 'Répondu',
            notes: `Devis ${numero} accepté d'un montant de ${montantTTC} € TTC. Prospect converti en client !`,
          },
        });
      }

      return { devisId, numero };
    });

    // Recalcule le score (+20 points car interaction positive / devis accepté)
    const { recalculateProspectScore } = require('@/lib/scoring');
    await recalculateProspectScore(validated.prospectId);

    return NextResponse.json({
      success: true,
      devisId: result.devisId,
      numero: result.numero,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST devis:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
