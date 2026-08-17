import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const registerSchema = z.object({
  nomOrganisation: z.string().min(2, 'Le nom de l\'organisation doit faire au moins 2 caractères.'),
  email: z.string().email('Adresse email invalide.'),
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères.'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const existingUser = await prisma.utilisateur.findUnique({
      where: { email: validatedData.email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cette adresse email existe déjà.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Exécute l'inscription de manière transactionnelle
    const result = await prisma.$transaction(async (tx) => {
      // 1. Création de l'organisation
      const org = await tx.organisation.create({
        data: {
          nom: validatedData.nomOrganisation.trim(),
          plan: 'starter', // Plan de base à l'inscription
          modulesActifs: JSON.stringify(['prospection', 'pipeline', 'dashboard']), // Modules par défaut
        },
      });

      // 2. Création de l'utilisateur (Manager initial)
      const user = await tx.utilisateur.create({
        data: {
          email: validatedData.email.toLowerCase().trim(),
          passwordHash,
          role: 'Manager',
          organisationId: org.id,
        },
      });

      // 3. Initialisation de l'onboarding pour cette organisation
      await tx.onboardingOrganisation.create({
        data: {
          organisationId: org.id,
          etapeActuelle: 1,
          reponsesDiagnostic: JSON.stringify({}),
          planRecommande: 'starter',
          termine: false,
        },
      });

      return { org, user };
    });

    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès. Vous pouvez maintenant vous connecter.',
      organisationId: result.org.id,
      userId: result.user.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur inscription:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
