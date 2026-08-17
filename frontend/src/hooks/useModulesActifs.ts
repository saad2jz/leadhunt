'use client';

import { useSession } from 'next-auth/react';

/**
 * Hook client pour lire le plan tarifaire et vérifier si un module/fonctionnalité
 * est actif ou inclus pour l'organisation courante.
 */
export function useModulesActifs() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  const user = session?.user;
  const plan = user?.plan || 'starter';
  const modulesActifs = user?.modulesActifs || [];

  /**
   * Vérifie si un module spécifique est activé pour l'organisation de l'utilisateur.
   */
  const aModuleActif = (moduleName: string): boolean => {
    return modulesActifs.includes(moduleName);
  };

  return {
    plan,
    modules: modulesActifs,
    aModuleActif,
    estStarter: plan === 'starter',
    estPro: plan === 'pro',
    estBusiness: plan === 'business',
    estEntreprise: plan === 'entreprise',
    loading,
    role: user?.role || 'Commercial',
    estSuperAdmin: user?.role === 'SuperAdmin',
    estManager: user?.role === 'Manager' || user?.role === 'SuperAdmin',
  };
}
