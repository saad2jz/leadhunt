import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Format email invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.utilisateur.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organisation: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
    }

    let modules: string[] = [];
    try {
      modules = JSON.parse(user.organisation.modulesActifs || '[]');
    } catch (e) {}

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organisationId: user.organisationId,
        plan: user.organisation.plan,
        modulesActifs: modules,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur login mobile:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
