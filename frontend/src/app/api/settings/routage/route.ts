import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const ruleSchema = z.object({
  id: z.string().optional(),
  nom: z.string().min(2, 'Le nom de la règle doit contenir au moins 2 caractères.'),
  condition: z.string(), // JSON string
  assigneAId: z.string(),
  ordre: z.number().default(0),
  actif: z.boolean().default(true),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    
    const regles = await scopedPrisma.regleRoutage.findMany({
      orderBy: { ordre: 'asc' },
    });

    const commerciaux = await scopedPrisma.utilisateur.findMany({
      where: { role: 'Commercial' },
      select: { id: true, email: true },
    });

    return NextResponse.json({ regles, commerciaux });
  } catch (error) {
    console.error('Erreur GET settings routage rules:', error);
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
    const validated = ruleSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    let regle;

    if (validated.id) {
      regle = await scopedPrisma.regleRoutage.update({
        where: { id: validated.id },
        data: {
          nom: validated.nom.trim(),
          condition: validated.condition,
          assigneAId: validated.assigneAId,
          ordre: validated.ordre,
          actif: validated.actif,
        },
      });
    } else {
      regle = await scopedPrisma.regleRoutage.create({
        data: {
          organisationId: session.user.organisationId,
          nom: validated.nom.trim(),
          condition: validated.condition,
          assigneAId: validated.assigneAId,
          ordre: validated.ordre,
          actif: validated.actif,
        },
      });
    }

    return NextResponse.json({
      success: true,
      regle,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST settings routage:', error);
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
    await scopedPrisma.regleRoutage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Règle supprimée.' });
  } catch (error) {
    console.error('Erreur DELETE settings routage:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
