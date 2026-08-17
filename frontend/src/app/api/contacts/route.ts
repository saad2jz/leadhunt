import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const createContactSchema = z.object({
  prospectId: z.string(),
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères.'),
  email: z.string().email('Format email invalide.').nullable().optional().or(z.literal('')),
  telephone: z.string().nullable().optional(),
  fonction: z.string().default('Décideur'),
  linkedinUrl: z.string().url('L\'URL LinkedIn doit être valide.').nullable().optional().or(z.literal('')),
  notes: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = createContactSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // Vérifie d'abord si le prospect existe et appartient bien au tenant
    const prospect = await scopedPrisma.prospect.findUnique({
      where: { id: validatedData.prospectId },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect introuvable ou accès non autorisé.' }, { status: 404 });
    }

    const contact = await scopedPrisma.contact.create({
      data: {
        organisationId: session.user.organisationId,
        prospectId: validatedData.prospectId,
        nom: validatedData.nom.trim(),
        email: validatedData.email ? validatedData.email.toLowerCase().trim() : null,
        telephone: validatedData.telephone ? validatedData.telephone.trim() : null,
        fonction: validatedData.fonction,
        linkedinUrl: validatedData.linkedinUrl ? validatedData.linkedinUrl.trim() : null,
        notes: validatedData.notes ? validatedData.notes.trim() : null,
      },
    });

    const { recalculateProspectScore } = require('@/lib/scoring');
    await recalculateProspectScore(validatedData.prospectId);

    return NextResponse.json({
      success: true,
      contact,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST contact:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
