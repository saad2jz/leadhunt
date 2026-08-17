import { prisma } from './prisma';

/**
 * Retourne une instance de Prisma étendue pour filtrer automatiquement
 * toutes les opérations par l'organisationId de la session de l'utilisateur.
 * 
 * Si un modèle ne contient pas de filtre organisationId, ou pour findUnique,
 * la logique adapte la requête pour garantir l'isolation multi-tenant.
 */
export function getScopedPrisma(session: any) {
  const organisationId = session?.user?.organisationId;
  const userRole = session?.user?.role;
  
  if (!organisationId) {
    throw new Error('Non autorisé : Organisation manquante ou session invalide.');
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Les tables globales qui ne sont pas associées à une organisation spécifique
          const globalModels = ['Organisation', 'PlanTarifaire'];

          // Le SuperAdmin peut court-circuiter le scope pour l'administration globale
          if (userRole === 'SuperAdmin') {
            return query(args);
          }

          if (!globalModels.includes(model)) {
            // Fonte des arguments en any pour contourner les contraintes de typage statique de Prisma
            const queryArgs = args as any;
            
            // Initialisation des arguments de filtrage
            queryArgs.where = queryArgs.where || {};

            // Intercept et transforme findUnique en findFirst pour supporter le filtrage par organisationId
            let resolvedOperation = operation;
            if (operation === 'findUnique') {
              resolvedOperation = 'findFirst';
            } else if (operation === 'findUniqueOrThrow') {
              resolvedOperation = 'findFirstOrThrow';
            }

            // Application du filtre organisationId sur la lecture / modification
            if ([
              'findFirst', 'findFirstOrThrow', 'findMany', 'count', 
              'aggregate', 'groupBy', 'update', 'updateMany', 
              'delete', 'deleteMany'
            ].includes(resolvedOperation)) {
              queryArgs.where.organisationId = organisationId;
            } else if (resolvedOperation === 'upsert') {
              queryArgs.where.organisationId = organisationId;
              queryArgs.create = queryArgs.create || {};
              queryArgs.create.organisationId = organisationId;
              queryArgs.update = queryArgs.update || {};
              queryArgs.update.organisationId = organisationId;
            } else if (resolvedOperation === 'create') {
              queryArgs.data = queryArgs.data || {};
              queryArgs.data.organisationId = organisationId;
            } else if (resolvedOperation === 'createMany') {
              if (Array.isArray(queryArgs.data)) {
                queryArgs.data = queryArgs.data.map((item: any) => ({
                  ...item,
                  organisationId,
                }));
              } else if (queryArgs.data) {
                queryArgs.data.organisationId = organisationId;
              }
            }

            // Exécute la requête avec les arguments modifiés
            // @ts-ignore
            return query(queryArgs);
          }

          return query(args);
        },
      },
    },
  });
}
