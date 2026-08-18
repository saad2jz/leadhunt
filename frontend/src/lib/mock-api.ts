// Mock API Interceptor for client-side evaluation on static hosts (GitHub Pages)

const STORAGE_KEYS = {
  PROSPECTS: 'leadhunt_mock_prospects',
  CAMPAIGN_RELANCES: 'leadhunt_mock_relances',
  CRM_CONNECTIONS: 'leadhunt_mock_crm_connections',
  CRM_LOGS: 'leadhunt_mock_crm_logs',
  VIEWS: 'leadhunt_mock_views',
  INTEGRATIONS: 'leadhunt_mock_integrations',
  SUBSCRIPTION: 'leadhunt_mock_subscription',
  TEMPLATES: 'leadhunt_mock_templates',
  SEQUENCES: 'leadhunt_mock_sequences',
  AUTONOMIE: 'leadhunt_mock_autonomie',
  OUTREACH: 'leadhunt_mock_outreach',
  VEILLE: 'leadhunt_mock_veille',
  LEADS: 'leadhunt_mock_leads',
  INTERACTIONS: 'leadhunt_mock_interactions',
};

// Seed initial data if localStorage is empty
function seedDatabase() {
  if (typeof window === 'undefined') return;

  const getOrSet = (key: string, defaultData: any) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(defaultData));
    }
  };

  // Data migration: ensure all existing prospects in localStorage have the contacts array
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.PROSPECTS);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) {
        let modified = false;
        const migrated = parsed.map(p => {
          if (!p.contacts) {
            modified = true;
            return { ...p, contacts: [] };
          }
          return p;
        });
        if (modified) {
          localStorage.setItem(STORAGE_KEYS.PROSPECTS, JSON.stringify(migrated));
        }
      }
    }
  } catch (e) {
    console.error('Error during prospects migration:', e);
  }

  // Seed Prospects
  getOrSet(STORAGE_KEYS.PROSPECTS, [
    {
      id: 'p1',
      nom: 'Acme Corp',
      adresse: '123 Rue de la Paix',
      ville: 'Paris',
      codePostal: '75001',
      siteWeb: 'https://acme.example.com',
      secteur: 'Logiciel',
      taille: '50-200',
      statut: 'RDV pris',
      score: 85,
      telephone: '0123456789',
      telephoneVerifie: true,
      email: 'contact@acme.example.com',
      emailVerifie: true,
      latitude: 48.8566,
      longitude: 2.3522,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      contacts: [],
    },
    {
      id: 'p2',
      nom: 'Stark Industries',
      adresse: '456 Avenue des Champs-Élysées',
      ville: 'Paris',
      codePostal: '75008',
      siteWeb: 'https://stark.example.com',
      secteur: 'Aéronautique',
      taille: '500+',
      statut: 'À appeler',
      score: 92,
      telephone: '0198765432',
      telephoneVerifie: false,
      email: 'pepper@stark.example.com',
      emailVerifie: true,
      latitude: 48.8700,
      longitude: 2.3000,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      contacts: [],
    },
    {
      id: 'p3',
      nom: 'Wayne Enterprises',
      adresse: '789 Boulevard Haussmann',
      ville: 'Paris',
      codePostal: '75009',
      siteWeb: 'https://wayne.example.com',
      secteur: 'Sécurité',
      taille: '200-500',
      statut: 'Client',
      score: 78,
      telephone: '0144556677',
      telephoneVerifie: true,
      email: 'bruce@wayne.example.com',
      emailVerifie: false,
      latitude: 48.8737,
      longitude: 2.3364,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      contacts: [],
    }
  ]);

  // Seed Relances du jour
  getOrSet(STORAGE_KEYS.CAMPAIGN_RELANCES, [
    {
      id: 'r1',
      prospectId: 'p1',
      prospectNom: 'Acme Corp',
      canal: 'Téléphone',
      statut: 'A faire',
      relanceProgrammee: new Date().toISOString(),
      etape: 1,
      campagneId: 'c1',
      campagneNom: 'Campagne IDF Logiciels',
    },
    {
      id: 'r2',
      prospectId: 'p2',
      prospectNom: 'Stark Industries',
      canal: 'Email',
      statut: 'A faire',
      relanceProgrammee: new Date().toISOString(),
      etape: 2,
      campagneId: 'c1',
      campagneNom: 'Campagne IDF Logiciels',
    }
  ]);

  // Seed CRM connections
  getOrSet(STORAGE_KEYS.CRM_CONNECTIONS, [
    {
      id: 'conn1',
      fournisseur: 'hubspot',
      apiKey: 'pat-eu1-xxxxxxx-mock-token',
      actif: true,
      mappingChamps: JSON.stringify({ nom: 'name', telephone: 'phone', email: 'email', ville: 'city', secteur: 'industry' })
    }
  ]);

  // Seed CRM logs
  getOrSet(STORAGE_KEYS.CRM_LOGS, [
    { id: 'log1', date: new Date().toISOString(), type: 'sync', status: 'success', message: 'Synchronisation de 5 prospects vers HubSpot réussie' }
  ]);

  // Seed Views
  getOrSet(STORAGE_KEYS.VIEWS, [
    { id: 'v1', nom: 'Tous les prospects', filtres: {} },
    { id: 'v2', nom: 'Secteur Tech / Score > 80', filtres: { scoreGte: 80, secteur: 'Logiciel' } }
  ]);

  // Seed Subscription limit metrics
  getOrSet(STORAGE_KEYS.SUBSCRIPTION, {
    plan: 'Starter',
    usages: {
      prospects: { count: 3, limit: 50 },
      emails: { count: 12, limit: 100 },
      appels: { count: 5, limit: 50 },
      iaCredits: { count: 25, limit: 200 }
    }
  });

  // Seed Email Templates
  getOrSet(STORAGE_KEYS.TEMPLATES, [
    { id: 't1', objet: 'Amélioration de votre tunnel commercial B2B', corps: 'Bonjour {{nom}},\n\nJ\'ai remarqué votre entreprise...' },
    { id: 't2', objet: 'Question rapide sur vos outils CRM', corps: 'Bonjour {{nom}},\n\nQuel CRM utilisez-vous aujourd\'hui ?' }
  ]);

  // Seed Sequences
  getOrSet(STORAGE_KEYS.SEQUENCES, [
    { id: 'seq1', nom: 'Séquence Relance Standard', etapes: [{ delai: 1, templateId: 't1' }, { delai: 3, templateId: 't2' }] }
  ]);

  // Seed Autonomie settings
  getOrSet(STORAGE_KEYS.AUTONOMIE, {
    actif: true,
    volumeQuotidien: 20,
    ciblageSecteurs: ['Logiciel', 'Services B2B'],
    iaTone: 'professionnel'
  });

  // Seed Outreach configuration
  getOrSet(STORAGE_KEYS.OUTREACH, {
    sendGridApiKey: '',
    fromEmail: 'contact@leadhunt.io',
    dailyLimit: 100
  });

  // Seed Veille
  getOrSet(STORAGE_KEYS.VEILLE, [
    { id: 've1', date: new Date().toISOString(), type: 'Signal d\'embauche', titre: 'Acme Corp recrute 3 commerciaux', description: 'Offre d\'emploi détectée sur Welcome To The Jungle.' }
  ]);

  // Seed Leads
  getOrSet(STORAGE_KEYS.LEADS, [
    { id: 'l1', nom: 'Jean Dupont', email: 'jean.dupont@sales.com', message: 'Je souhaiterais obtenir une démonstration.', date: new Date().toISOString() }
  ]);

  // Seed Interactions
  getOrSet(STORAGE_KEYS.INTERACTIONS, [
    { id: 'i1', date: new Date().toISOString(), type: 'Email', notes: 'Séquence commencée', prospectId: 'p1' }
  ]);
}

// Hook Fetch requests
export function initMockApi() {
  if (typeof window === 'undefined') return;

  // Run seed database
  seedDatabase();

  // If already hooked, don't duplicate
  if ((window as any).__fetchHooked) return;
  (window as any).__fetchHooked = true;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : (input as any).url || input.toString();

    // Check if it's an API route
    if (url.includes('/api/')) {
      console.log(`[Mock API Interceptor] Intercepted Request: ${url}`, init);

      try {
        const responseData = handleMockRoute(url, init);
        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        console.error(`[Mock API Interceptor] Error handling ${url}`, err);
        return new Response(JSON.stringify({ error: err.message || 'Mock Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Default: fallback to original fetch for statics / scripts / map tiles
    return originalFetch(input, init);
  };
}

// Intercept specific routes
function handleMockRoute(url: string, init?: RequestInit): any {
  // Normalize path and remove any trailing slash
  let path = url.split('?')[0].split('/api/')[1];
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  const queryParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
  const method = init?.method?.toUpperCase() || 'GET';
  
  let body = null;
  if (init?.body) {
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch (e) {
        body = init.body;
      }
    } else {
      body = init.body;
    }
  }

  const getItems = (key: string): any[] => {
    try {
      const val = localStorage.getItem(key);
      if (!val) return [];
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(`Error parsing localStorage key ${key}:`, e);
      return [];
    }
  };
  const setItems = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

  switch (path) {
    case 'auth/session': {
      return {
        user: {
          name: 'Jean Commercial',
          email: 'jean@leadhunt.io',
          role: 'SuperAdmin',
          plan: 'business',
          modulesActifs: ['prospection', 'crm', 'carte', 'autonomie', 'enrichissement', 'sequences', 'telephonie']
        },
        expires: '2036-08-18T00:00:00.000Z'
      };
    }

    case 'auth/csrf': {
      return { csrfToken: 'mock-csrf-token' };
    }

    case 'auth/providers': {
      return {
        credentials: {
          id: 'credentials',
          name: 'Credentials',
          type: 'credentials',
          signinUrl: '/api/auth/signin/credentials',
          callbackUrl: '/api/auth/callback/credentials'
        }
      };
    }

    case 'dashboard/stats': {
      const prospects = getItems(STORAGE_KEYS.PROSPECTS);
      const relances = getItems(STORAGE_KEYS.CAMPAIGN_RELANCES);
      const views = getItems(STORAGE_KEYS.VIEWS);
      const subscription = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION) || '{}');

      // Funnel metrics
      const aAppeler = prospects.filter(p => p.statut === 'À appeler').length;
      const rdvPris = prospects.filter(p => p.statut === 'RDV pris').length;
      const client = prospects.filter(p => p.statut === 'Client').length;

      // 14 days activity graph mock data
      const activityGraphData = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return {
          date: d.toISOString().split('T')[0],
          label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
          count: Math.floor(Math.random() * 5),
        };
      }).reverse();

      return {
        success: true,
        metrics: {
          prospectsCount: prospects.length,
          contactsCount: prospects.length, // Mock
          blacklistCount: 0,
          callsToday: 2,
          callsThisWeek: 8,
          emailsToday: 5,
          emailsThisWeek: 15,
        },
        activityGraphData,
        conversionFunnel: { aAppeler, rdvPris, client },
        attentionPoints: {
          rdvPrisSansSuivi: prospects.filter(p => p.statut === 'RDV pris').length,
          fichesIncompletes: prospects.filter(p => !p.email).length,
          comptesDormants: 0,
          sequencesBloquees: 0,
          relancesEnRetard: relances.length,
        },
        recentProspects: prospects.slice(0, 5),
      };
    }

    case 'prospects': {
      const prospects = getItems(STORAGE_KEYS.PROSPECTS);
      if (method === 'POST') {
        const newProspect = {
          id: 'p_' + Date.now(),
          createdAt: new Date().toISOString(),
          statut: 'À appeler',
          score: 50,
          ...body,
        };
        prospects.unshift(newProspect);
        setItems(STORAGE_KEYS.PROSPECTS, prospects);
        return { success: true, prospect: newProspect };
      }
      return { success: true, prospects };
    }

    case 'views': {
      const vues = getItems(STORAGE_KEYS.VIEWS);
      if (method === 'POST') {
        const newVue = { id: 'v_' + Date.now(), ...body };
        vues.push(newVue);
        setItems(STORAGE_KEYS.VIEWS, vues);
        return { success: true, vue: newVue };
      }
      return { success: true, vues };
    }

    case 'campagnes/relance/du-jour': {
      const relances = getItems(STORAGE_KEYS.CAMPAIGN_RELANCES);
      return { success: true, relances };
    }

    case 'settings/integrations': {
      const connexions = getItems(STORAGE_KEYS.CRM_CONNECTIONS);
      const logs = getItems(STORAGE_KEYS.CRM_LOGS);
      if (method === 'POST') {
        const existingIndex = connexions.findIndex(c => c.fournisseur === body.fournisseur);
        if (existingIndex > -1) {
          connexions[existingIndex] = { ...connexions[existingIndex], ...body };
        } else {
          connexions.push({ id: 'conn_' + Date.now(), ...body });
        }
        setItems(STORAGE_KEYS.CRM_CONNECTIONS, connexions);
        return { success: true };
      }
      return { success: true, connexions, logs };
    }

    case 'settings/subscription/usages': {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION) || '{}');
    }

    case 'settings/templates': {
      const templates = getItems(STORAGE_KEYS.TEMPLATES);
      if (method === 'POST') {
        const newTemplate = { id: 't_' + Date.now(), ...body };
        templates.push(newTemplate);
        setItems(STORAGE_KEYS.TEMPLATES, templates);
        return { success: true, template: newTemplate };
      }
      return { success: true, templates };
    }

    case 'settings/sequences': {
      const sequences = getItems(STORAGE_KEYS.SEQUENCES);
      if (method === 'POST') {
        const newSequence = { id: 'seq_' + Date.now(), ...body };
        sequences.push(newSequence);
        setItems(STORAGE_KEYS.SEQUENCES, sequences);
        return { success: true, sequence: newSequence };
      }
      return { success: true, sequences };
    }

    case 'settings/autonomie': {
      if (method === 'POST') {
        setItems(STORAGE_KEYS.AUTONOMIE, body);
        return { success: true };
      }
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTONOMIE) || '{}');
    }

    case 'settings/outreach': {
      if (method === 'POST') {
        setItems(STORAGE_KEYS.OUTREACH, body);
        return { success: true };
      }
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.OUTREACH) || '{}');
    }

    case 'veille': {
      const veille = getItems(STORAGE_KEYS.VEILLE);
      return { success: true, veille };
    }

    case 'leads': {
      const leads = getItems(STORAGE_KEYS.LEADS);
      return { success: true, leads };
    }

    case 'interactions': {
      const interactions = getItems(STORAGE_KEYS.INTERACTIONS);
      if (method === 'POST') {
        const newInteraction = { id: 'i_' + Date.now(), date: new Date().toISOString(), ...body };
        interactions.push(newInteraction);
        setItems(STORAGE_KEYS.INTERACTIONS, interactions);
        return { success: true, interaction: newInteraction };
      }
      return { success: true, interactions };
    }

    // Cron jobs trigger
    case 'cron/sequences':
    case 'cron/veille':
    case 'cron/warming':
    case 'cron/optimisation': {
      return { success: true, message: `Mock execution of cron job ${path} completed successfully.` };
    }

    default: {
      // Handle dynamic routes like prospects/:id
      if (path.startsWith('prospects/')) {
        const parts = path.split('/');
        const id = parts[1];
        const prospects = getItems(STORAGE_KEYS.PROSPECTS);
        
        if (method === 'DELETE') {
          const filtered = prospects.filter(p => p.id !== id);
          setItems(STORAGE_KEYS.PROSPECTS, filtered);
          return { success: true };
        } else if (method === 'PUT' || method === 'PATCH') {
          const index = prospects.findIndex(p => p.id === id);
          if (index > -1) {
            prospects[index] = { ...prospects[index], ...body };
            setItems(STORAGE_KEYS.PROSPECTS, prospects);
            return { success: true, prospect: prospects[index] };
          }
        } else if (method === 'GET') {
          const prospect = prospects.find(p => p.id === id);
          if (prospect) return { success: true, prospect };
        }
      }
      
      throw new Error(`Mock API does not support route: ${path}`);
    }
  }
}
