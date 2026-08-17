import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const relanceSchema = z.object({
  prospectCampagneId: z.string(),
  relanceProgrammee: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { prospectCampagneId, relanceProgrammee, notes } = relanceSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    const existing = await scopedPrisma.prospectCampagne.findFirst({
      where: { id: prospectCampagneId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Prospect de campagne introuvable.' }, { status: 404 });
    }

    const updated = await scopedPrisma.prospectCampagne.update({
      where: { id: prospectCampagneId },
      data: {
        relanceProgrammee: relanceProgrammee ? new Date(relanceProgrammee) : null,
        notes: notes ? notes.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      prospectCampagne: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST campaigns relance:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
