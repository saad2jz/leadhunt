import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { recalculateProspectScore } from '@/lib/scoring';
import { z } from 'zod';

const verifySchema = z.object({
  prospectId: z.string(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { prospectId } = verifySchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // Vérifie si le prospect appartient bien au tenant
    const prospect = await scopedPrisma.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect introuvable.' }, { status: 404 });
    }

    // Supprime d'abord les anciens signaux pour ce prospect
    await scopedPrisma.signalEmbauche.deleteMany({
      where: { prospectId },
    });

    // Simulation de recherche de postes ouverts Indeed/LinkedIn
    const postsTemplates = [
      { titre: 'Account Executive / Business Developer', url: 'https://indeed.com/viewjob?jk=sales1' },
      { titre: 'Développeur Fullstack React/Node.js', url: 'https://indeed.com/viewjob?jk=dev2' },
      { titre: 'Directeur Marketing Digital (CMO)', url: 'https://indeed.com/viewjob?jk=mktg3' }
    ];

    const results: any[] = [];
    const countToGenerate = Math.floor(1 + Math.random() * 3); // Génère entre 1 et 3 offres fictives réalistes

    for (let i = 0; i < countToGenerate; i++) {
      const template = postsTemplates[i % postsTemplates.length];
      if (template) {
        const signal = await scopedPrisma.signalEmbauche.create({
          data: {
            organisationId: session.user.organisationId,
            prospectId,
            titrePoste: template.titre,
            urlOffre: template.url,
            actif: true,
          },
        });
        results.push(signal);
      }
    }

    // Recalcule immédiatement le score (+10 points si signaux d'embauches)
    await recalculateProspectScore(prospectId);

    return NextResponse.json({
      success: true,
      signaux: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST verifier signaux:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
