interface DiagnosticReponses {
  tailleEquipe: 'Seul' | '2-5' | '6+';
  crmActuel: 'Aucun' | 'HubSpot' | 'Pipedrive' | 'Autre';
  modeProspection: 'A distance' | 'Terrain' | 'Les deux';
  volumeProspects: number; // estimation mensuelle
  secteurs: string[];
}

interface RecommandationResult {
  plan: 'starter' | 'pro' | 'business' | 'entreprise';
  modules: string[];
}

/**
 * Logique d'analyse pour recommander un plan tarifaire et activer des modules spécifiques
 * en fonction des besoins réels d'API/infrastructure (surtout payants comme Twilio/Anthropic).
 */
export function recommanderPlanEtModules(reponses: DiagnosticReponses): RecommandationResult {
  const plan: RecommandationResult['plan'] = 'starter';
  const modules = ['sirene', 'pipeline', 'dashboard', 'liste_noire']; // Modules de base gratuits

  const { tailleEquipe, crmActuel, modeProspection, volumeProspects } = reponses;

  // 1. Évaluation pour le plan Entreprise (besoin d'automatisation complète, SSO, marketplace, app mobile, volumes massifs)
  if (tailleEquipe === '6+' || volumeProspects >= 2000) {
    return {
      plan: 'entreprise',
      modules: [
        ...modules,
        'prospection_ia_avancee',
        'recherche_intelligente',
        'enrichissement_waterfall',
        'veille_commerciale',
        'sequences_email',
        'crm_externe',
        'carte_geo',
        'scoring_auto',
        'telephonie',
        'delivrabilite',
        'chatbot_ia_public',
        'whatsapp',
        'intake_leads',
        'devis',
        'SSO',
        'roles_avances',
        'marketplace_templates',
        'app_mobile',
        'cles_perso',
      ],
    };
  }

  // 2. Évaluation pour le plan Business (téléphonie Twilio, enrichissement cascade waterfall, IA de qualification)
  if (tailleEquipe === '2-5' || volumeProspects >= 500) {
    return {
      plan: 'business',
      modules: [
        ...modules,
        'recherche_intelligente',
        'enrichissement_waterfall',
        'veille_commerciale',
        'sequences_email',
        'crm_externe',
        'carte_geo',
        'scoring_auto',
        'telephonie',
        'delivrabilite',
        'chatbot_ia_public',
        'whatsapp',
        'intake_leads',
        'devis',
      ],
    };
  }

  // 3. Évaluation pour le plan Pro (scoring intelligent, séquences emails Resend, intégration CRM HubSpot/Pipedrive, carte terrain)
  if (crmActuel !== 'Aucun' || modeProspection === 'Terrain' || modeProspection === 'Les deux' || volumeProspects >= 100) {
    return {
      plan: 'pro',
      modules: [
        ...modules,
        'recherche_intelligente',
        'veille_commerciale',
        'sequences_email',
        'crm_externe',
        'carte_geo',
        'scoring_auto',
      ],
    };
  }

  // 4. Par défaut : Plan Starter (coût API nul, recherche SIRENE gratuite)
  return {
    plan: 'starter',
    modules,
  };
}
