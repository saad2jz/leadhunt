import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const importSchema = z.object({
  contacts: z.array(
    z.object({
      prenom: z.string().optional().default(''),
      nom: z.string().min(1, 'Le nom est requis.'),
      poste: z.string().optional().default('Contact'),
      entreprise: z.string().min(1, 'Le nom de l\'entreprise est requis.'),
      linkedinUrl: z.string().url().optional().or(z.literal('')),
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
    const { contacts } = importSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    let importedCount = 0;

    await scopedPrisma.$transaction(async (tx) => {
      for (const row of contacts) {
        const companyName = row.entreprise.trim();
        const contactName = `${row.prenom} ${row.nom}`.trim();

        // 1. Cherche si le prospect (entreprise) existe déjà
        let prospect = await tx.prospect.findFirst({
          where: { nom: companyName },
        });

        // 2. Si l'entreprise n'existe pas, on la crée à la volée
        if (!prospect) {
          prospect = await tx.prospect.create({
            data: {
              organisationId: session.user.organisationId,
              nom: companyName,
              statut: 'À appeler',
            },
          });
        }

        // 3. Crée le contact lié à l'entreprise
        await tx.contact.create({
          data: {
            organisationId: session.user.organisationId,
            prospectId: prospect.id,
            nom: contactName,
            fonction: row.poste.trim() || 'Décideur',
            linkedinUrl: row.linkedinUrl ? row.linkedinUrl.trim() : null,
          },
        });

        importedCount++;
      }
    });

    return NextResponse.json({
      success: true,
      count: importedCount,
      message: `${importedCount} contacts LinkedIn Sales Navigator importés avec succès.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur import Sales Navigator:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
