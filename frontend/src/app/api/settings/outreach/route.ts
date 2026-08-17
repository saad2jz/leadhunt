import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const mailboxSchema = z.object({
  adresseEmail: z.string().email("L'adresse email doit être valide."),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    const boites = await scopedPrisma.boiteMailOutreach.findMany({
      orderBy: { dateDebutChauffage: 'desc' },
    });
    return NextResponse.json({ boites });
  } catch (error) {
    console.error('Erreur GET boites:', error);
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
    const { adresseEmail } = mailboxSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    const domaine = adresseEmail.split('@')[1];

    if (!domaine) {
      return NextResponse.json({ error: 'Domaine email invalide.' }, { status: 400 });
    }

    const boite = await scopedPrisma.boiteMailOutreach.create({
      data: {
        organisationId: session.user.organisationId,
        adresseEmail: adresseEmail.trim().toLowerCase(),
        domaine: domaine.trim().toLowerCase(),
        statutChauffage: 'en_chauffage',
        volumeJournalierActuel: 0,
        volumeJournalierMax: 5,
        scoreReputation: 100,
      },
    });

    return NextResponse.json({
      success: true,
      boite,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST boite:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
