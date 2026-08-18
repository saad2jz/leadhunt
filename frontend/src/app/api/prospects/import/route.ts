import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const importSchema = z.object({
  companies: z.array(
    z.object({
      nom: z.string(),
      siren: z.string(),
      formeJuridique: z.string().optional(),
      adresse: z.string().optional(),
      codeNaf: z.string().optional(),
      libelleSecteur: z.string().optional(),
      dirigeantNom: z.string().optional(),
      dirigeantRole: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
  ),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = importSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    const { geocodeAddress } = require('@/lib/geocoding');
    const { recalculateProspectScore } = require('@/lib/scoring');

    // Importation dans une transaction pour garantir la cohérence
    const createdProspectIds = await scopedPrisma.$transaction(async (tx) => {
      const ids: string[] = [];

      for (const comp of validatedData.companies) {
        // Évite l'importation de doublons SIREN pour la même organisation
        const existing = await tx.prospect.findFirst({
          where: { siren: comp.siren },
        });

        if (existing) {
          continue; // Déjà importé
        }

        // Géocodage de l'adresse (priorité aux coordonnées reçues directement)
        let latitude: number | null = comp.latitude || null;
        let longitude: number | null = comp.longitude || null;
        if (!latitude && comp.adresse) {
          try {
            const geo = await geocodeAddress(comp.adresse);
            if (geo) {
              latitude = geo.latitude;
              longitude = geo.longitude;
            }
          } catch (e) {
            console.error(e);
          }
        }

        // 1. Création du prospect
        const prospect = await tx.prospect.create({
          data: {
            organisationId: session.user.organisationId,
            nom: comp.nom.trim(),
            siren: comp.siren,
            adresse: comp.adresse || null,
            codeNaf: comp.codeNaf || null,
            secteur: comp.libelleSecteur || null,
            formeJuridique: comp.formeJuridique || null,
            latitude,
            longitude,
            statut: 'À appeler',
          },
        });

        // 2. Création du premier contact lié
        if (comp.dirigeantNom && comp.dirigeantNom !== 'Non renseigné') {
          await tx.contact.create({
            data: {
              organisationId: session.user.organisationId,
              prospectId: prospect.id,
              nom: comp.dirigeantNom.trim(),
              fonction: comp.dirigeantRole || 'Dirigeant',
            },
          });
        }

        ids.push(prospect.id);
      }

      return ids;
    });

    // Recalcule le score pour tous les nouveaux prospects importés
    for (const pid of createdProspectIds) {
      await recalculateProspectScore(pid);
    }

    const importedCount = createdProspectIds.length;

    return NextResponse.json({
      success: true,
      importedCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur import prospects:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue lors de l\'import.' }, { status: 500 });
  }
}
