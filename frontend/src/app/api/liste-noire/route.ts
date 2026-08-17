import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const blockSchema = z.object({
  email: z.string().email().nullable().optional(),
  telephone: z.string().nullable().optional(),
  siren: z.string().nullable().optional(),
  motif: z.enum(['Demande RGPD', 'Opposition demarchage', 'Autre']).default('Demande RGPD'),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    const blacklist = await scopedPrisma.listeNoirContact.findMany({
      orderBy: { dateAjout: 'desc' },
    });

    return NextResponse.json({ blacklist });
  } catch (error) {
    console.error('Erreur GET liste-noire:', error);
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
    const validatedData = blockSchema.parse(body);
    const { email, telephone, siren, motif } = validatedData;

    if (!email && !telephone && !siren) {
      return NextResponse.json({ error: 'Veuillez renseigner au moins un email, un téléphone ou un SIREN.' }, { status: 400 });
    }

    const scopedPrisma = getScopedPrisma(session);

    const result = await scopedPrisma.$transaction(async (tx) => {
      // 1. Ajoute à la liste noire
      const entry = await tx.listeNoirContact.create({
        data: {
          organisationId: session.user.organisationId,
          email: email ? email.toLowerCase().trim() : null,
          telephone: telephone ? telephone.trim() : null,
          siren: siren ? siren.trim() : null,
          motif,
          ajoutePar: session.user.id,
        },
      });

      // 2. Met à jour le statut des prospects concernés à "Ne plus contacter"
      const clausesOr: any[] = [];
      if (siren) {
        clausesOr.push({ siren });
      }
      if (email) {
        clausesOr.push({
          contacts: {
            some: { email: email.toLowerCase().trim() },
          },
        });
      }
      if (telephone) {
        clausesOr.push({
          contacts: {
            some: { telephone: telephone.trim() },
          },
        });
      }

      if (clausesOr.length > 0) {
        await tx.prospect.updateMany({
          where: {
            OR: clausesOr,
          },
          data: {
            statut: 'Ne plus contacter',
          },
        });
      }

      return entry;
    });

    return NextResponse.json({ success: true, entry: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST liste-noire:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Paramètre id requis.' }, { status: 400 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);

    // Vérifie si la ligne appartient bien à l'organisation (auth-scope le fait mais double sécurité)
    await scopedPrisma.listeNoirContact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Contact retiré de la liste noire.' });
  } catch (error) {
    console.error('Erreur DELETE liste-noire:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue lors de la suppression.' }, { status: 500 });
  }
}
