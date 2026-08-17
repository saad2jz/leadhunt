import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';
import { z } from 'zod';

const syncSchema = z.object({
  prospectId: z.string(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { prospectId } = syncSchema.parse(body);
    const scopedPrisma = getScopedPrisma(session);

    // 1. Récupère le prospect et ses contacts
    const prospect = await scopedPrisma.prospect.findUnique({
      where: { id: prospectId },
      include: { contacts: true },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect introuvable.' }, { status: 404 });
    }

    // 2. Charge les intégrations CRM actives de l'organisation
    const connexions = await scopedPrisma.connexionCRM.findMany({
      where: { organisationId: session.user.organisationId, actif: true },
    });

    if (connexions.length === 0) {
      return NextResponse.json({ error: 'Aucune intégration CRM active configurée.' }, { status: 400 });
    }

    const syncResults = [];

    for (const conn of connexions) {
      let isSuccess = false;
      let logMsg = '';
      let externalId = prospect.idExterneCRM;

      // Simulation ou envoi réel
      const isMock = !conn.apiKey || conn.apiKey === 'mock_key' || conn.apiKey === 'demo_key';

      try {
        const mapping = JSON.parse(conn.mappingChamps || '{}');
        
        // Construction de la charge utile (payload) selon le mapping
        const payload: { [key: string]: any } = {};
        Object.keys(mapping).forEach(localKey => {
          const crmKey = mapping[localKey];
          if (crmKey) {
            payload[crmKey] = (prospect as any)[localKey] || '';
          }
        });

        if (isMock) {
          // Simulation réussie
          externalId = externalId || `ext_${conn.fournisseur}_${Math.random().toString(36).substring(2, 9)}`;
          isSuccess = true;
          logMsg = `[Simulation ${conn.fournisseur.toUpperCase()}] Données poussées avec succès: ${JSON.stringify(payload)}`;
        } else {
          // Appel réel
          if (conn.fournisseur === 'hubspot') {
            const url = `https://api.hubapi.com/crm/v3/objects/${externalId ? 'companies/' + externalId : 'companies'}`;
            const method = externalId ? 'PATCH' : 'POST';
            const res = await fetch(url, {
              method,
              headers: {
                Authorization: `Bearer ${conn.apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ properties: payload }),
            });
            if (res.ok) {
              const resData = await res.json();
              externalId = resData.id;
              isSuccess = true;
              logMsg = 'Synchronisé avec HubSpot API.';
            } else {
              const errText = await res.text();
              throw new Error(`Erreur HubSpot: ${errText}`);
            }
          } else if (conn.fournisseur === 'pipedrive') {
            const tokenQuery = `?api_token=${conn.apiKey}`;
            const url = `https://api.pipedrive.com/v1/organizations${externalId ? '/' + externalId : ''}${tokenQuery}`;
            const method = externalId ? 'PUT' : 'POST';
            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (res.ok) {
              const resData = await res.json();
              externalId = resData.data?.id;
              isSuccess = true;
              logMsg = 'Synchronisé avec Pipedrive API.';
            } else {
              const errText = await res.text();
              throw new Error(`Erreur Pipedrive: ${errText}`);
            }
          } else {
            // Webhook Générique
            const webhookUrl = conn.baseUrl || '';
            if (webhookUrl) {
              const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'prospect_sync', prospect: payload, contacts: prospect.contacts }),
              });
              if (res.ok) {
                isSuccess = true;
                logMsg = `Webhook envoyé avec succès à ${webhookUrl}`;
              } else {
                throw new Error(`Webhook retourné avec statut ${res.status}`);
              }
            } else {
              throw new Error('URL de webhook non renseignée.');
            }
          }
        }
      } catch (err: any) {
        isSuccess = false;
        logMsg = err?.message || 'Erreur inconnue de synchronisation.';
      }

      // Enregistre le log de synchro
      await scopedPrisma.synchroLog.create({
        data: {
          organisationId: session.user.organisationId,
          connexionId: conn.id,
          prospectId: prospect.id,
          statut: isSuccess ? 'succès' : 'échec',
          message: logMsg,
        },
      });

      // Met à jour l'identifiant externe s'il y a succès
      if (isSuccess && externalId && externalId !== prospect.idExterneCRM) {
        await scopedPrisma.prospect.update({
          where: { id: prospect.id },
          data: { idExterneCRM: externalId },
        });
      }

      // Met à jour la date de dernière synchronisation
      await scopedPrisma.connexionCRM.update({
        where: { id: conn.id },
        data: { derniereSynchro: new Date() },
      });

      syncResults.push({
        fournisseur: conn.fournisseur,
        statut: isSuccess ? 'succès' : 'échec',
        message: logMsg,
      });
    }

    return NextResponse.json({
      success: true,
      syncResults,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || error.message }, { status: 400 });
    }
    console.error('Erreur POST sync CRM:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
