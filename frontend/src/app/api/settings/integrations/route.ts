import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const crmSchema = z.object({
  fournisseur: z.enum(['hubspot', 'pipedrive', 'webhook']),
  apiKey: z.string().nullable().optional(),
  baseUrl: z.string().nullable().optional(),
  mappingChamps: z.string(),
  actif: z.boolean().default(true),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);
    
    const connexions = await scopedPrisma.connexionCRM.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const logs = await scopedPrisma.synchroLog.findMany({
      include: {
        prospect: {
          select: { nom: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ connexions, logs });
  } catch (error) {
    console.error('Erreur GET settings crm integrations:', error);
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
    const validated = crmSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // Un seul profil par fournisseur par organisation
    const crm = await scopedPrisma.connexionCRM.upsert({
      where: { id: `${session.user.organisationId}-${validated.fournisseur}` },
      create: {
        id: `${session.user.organisationId}-${validated.fournisseur}`,
        organisationId: session.user.organisationId,
        fournisseur: validated.fournisseur,
        apiKey: validated.apiKey || null,
        baseUrl: validated.baseUrl || null,
        mappingChamps: validated.mappingChamps,
        actif: validated.actif,
      },
      update: {
        apiKey: validated.apiKey || null,
        baseUrl: validated.baseUrl || null,
        mappingChamps: validated.mappingChamps,
        actif: validated.actif,
      },
    });

    return NextResponse.json({
      success: true,
      crm,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST crm integration:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
