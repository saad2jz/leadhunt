import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateOrgSchema = z.object({
  id: z.string(),
  plan: z.enum(['starter', 'pro', 'business', 'entreprise']),
  nom: z.string().min(2),
  modulesActifs: z.array(z.string()),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Accès interdit. Réservé aux SuperAdmins.' }, { status: 403 });
  }

  try {
    const organisations = await prisma.organisation.findMany({
      include: {
        utilisateurs: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ organisations });
  } catch (error) {
    console.error('Erreur GET admin organisations:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Accès interdit.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = updateOrgSchema.parse(body);

    const updated = await prisma.organisation.update({
      where: { id: validatedData.id },
      data: {
        nom: validatedData.nom.trim(),
        plan: validatedData.plan,
        modulesActifs: JSON.stringify(validatedData.modulesActifs),
      },
    });

    return NextResponse.json({
      success: true,
      organisation: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST admin organisation:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
