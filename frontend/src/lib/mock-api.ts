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
  ORGANISATIONS: 'leadhunt_mock_organisations',
  CAMPAGNES: 'leadhunt_mock_campagnes',
  ETAPES: 'leadhunt_mock_etapes',
  PROSPECT_CAMPAGNE: 'leadhunt_mock_prospect_campagnes',
  PROSPECTION: 'leadhunt_mock_prospection',
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

  // Data validation migration: clear relances and subscription if they are stored in the old formats
  try {
    const existingSub = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
    if (existingSub) {
      const parsed = JSON.parse(existingSub);
      if (parsed && !Array.isArray(parsed.usages)) {
        localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION);
      }
    }
    const existingRel = localStorage.getItem(STORAGE_KEYS.CAMPAIGN_RELANCES);
    if (existingRel) {
      const parsed = JSON.parse(existingRel);
      if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].prospect) {
        localStorage.removeItem(STORAGE_KEYS.CAMPAIGN_RELANCES);
      }
    }
  } catch (e) {
    console.error('Error during data validation migration:', e);
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
      relanceProgrammee: new Date().toISOString(),
      canal: 'Téléphone',
      statut: 'A faire',
      etape: { id: 'e1', nom: 'Premier contact' },
      campagne: { id: 'c1', nom: 'Campagne IDF Logiciels' },
      prospect: {
        id: 'p1',
        nom: 'Acme Corp',
        contacts: [
          { id: 'ct1', nom: 'Alice Martin', fonction: 'Directrice Commerciale' }
        ]
      }
    },
    {
      id: 'r2',
      relanceProgrammee: new Date().toISOString(),
      canal: 'Email',
      statut: 'A faire',
      etape: { id: 'e2', nom: 'Relance 1' },
      campagne: { id: 'c1', nom: 'Campagne IDF Logiciels' },
      prospect: {
        id: 'p2',
        nom: 'Stark Industries',
        contacts: [
          { id: 'ct2', nom: 'Pepper Potts', fonction: 'CEO' }
        ]
      }
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

  // Seed Subscription limit metrics matching the db schema array format
  getOrSet(STORAGE_KEYS.SUBSCRIPTION, {
    usages: [
      {
        id: 'mock-sirene',
        apiName: 'Recherches Sirene',
        count: 3,
        limit: 50,
        resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      },
      {
        id: 'mock-enrichment',
        apiName: 'Enrichissements Waterfall',
        count: 12,
        limit: 100,
        resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      },
      {
        id: 'mock-calls',
        apiName: 'Appels Téléphoniques',
        count: 5,
        limit: 50,
        resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      },
      {
        id: 'mock-ia',
        apiName: 'Crédits IA Copilote',
        count: 25,
        limit: 200,
        resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      }
    ]
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

  // Seed Organisations
  getOrSet(STORAGE_KEYS.ORGANISATIONS, [
    {
      id: 'org1',
      nom: 'Leadhunt Startup',
      plan: 'business',
      modulesActifs: JSON.stringify(['prospection', 'crm', 'carte', 'autonomie', 'enrichissement', 'sequences', 'telephonie']),
      createdAt: new Date().toISOString(),
      utilisateurs: [
        { id: 'u1', email: 'jean@leadhunt.io', role: 'SuperAdmin' }
      ]
    },
    {
      id: 'org2',
      nom: 'Wayne Corporate',
      plan: 'pro',
      modulesActifs: JSON.stringify(['carte', 'crm']),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      utilisateurs: [
        { id: 'u2', email: 'bruce@wayne.example.com', role: 'Manager' }
      ]
    }
  ]);

  // Seed Campagnes
  getOrSet(STORAGE_KEYS.CAMPAGNES, [
    {
      id: 'c1',
      nom: 'Campagne IDF Logiciels',
      description: 'Campagne de prospection ciblée sur les éditeurs de logiciels en Île-de-France.',
      createdAt: new Date().toISOString(),
    }
  ]);

  // Seed Etapes
  getOrSet(STORAGE_KEYS.ETAPES, [
    { id: 'e1', campagneId: 'c1', nom: 'Qualification', ordre: 0, couleur: '#94a3b8' },
    { id: 'e2', campagneId: 'c1', nom: 'Premier contact', ordre: 1, couleur: '#60a5fa' },
    { id: 'e3', campagneId: 'c1', nom: 'Relance', ordre: 2, couleur: '#f59e0b' },
    { id: 'e4', campagneId: 'c1', nom: 'RDV pris', ordre: 3, couleur: '#a855f7' },
    { id: 'e5', campagneId: 'c1', nom: 'Closing / Gagné', ordre: 4, couleur: '#10b981' },
    { id: 'e6', campagneId: 'c1', nom: 'Perdu', ordre: 5, couleur: '#ef4444' }
  ]);

  // Seed ProspectCampagne
  getOrSet(STORAGE_KEYS.PROSPECT_CAMPAGNE, [
    { id: 'pc1', campagneId: 'c1', prospectId: 'p1', etapeId: 'e2', dateEntreeEtape: new Date().toISOString() },
    { id: 'pc2', campagneId: 'c1', prospectId: 'p2', etapeId: 'e1', dateEntreeEtape: new Date().toISOString() },
    { id: 'pc3', campagneId: 'c1', prospectId: 'p3', etapeId: 'e4', dateEntreeEtape: new Date().toISOString() }
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
        const responseData = await handleMockRoute(url, init);
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
async function handleMockRoute(url: string, init?: RequestInit): Promise<any> {
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

    case 'admin/organisations': {
      const organisations = getItems(STORAGE_KEYS.ORGANISATIONS);
      if (method === 'POST') {
        const index = organisations.findIndex(o => o.id === body.id);
        if (index > -1) {
          organisations[index] = {
            ...organisations[index],
            nom: body.nom.trim(),
            plan: body.plan,
            modulesActifs: JSON.stringify(body.modulesActifs),
          };
          setItems(STORAGE_KEYS.ORGANISATIONS, organisations);
          return { success: true, organisation: organisations[index] };
        }
        return { error: 'Organisation introuvable' };
      }
      return { organisations };
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

    case 'entreprises/search': {
      const q = queryParams.get('q') || '';
      return {
        results: [
          {
            siren: '123456789',
            nom: `${q} Solutions`,
            formeJuridique: 'SAS',
            adresse: '12 Rue de l\'Innovation, Paris',
            codeNaf: '6201Z',
            libelleSecteur: 'Édition de logiciels',
            dirigeantNom: 'Jean Dupont',
            dirigeantRole: 'Président',
            trancheEffectif: '20 à 49 salariés'
          },
          {
            siren: '987654321',
            nom: `${q} Corporation`,
            formeJuridique: 'SA',
            adresse: '45 Avenue de la Technologie, Lyon',
            codeNaf: '5829C',
            libelleSecteur: 'Services informatiques',
            dirigeantNom: 'Marc Martin',
            dirigeantRole: 'Directeur Général',
            trancheEffectif: '100 à 199 salariés'
          }
        ]
      };
    }

    case 'prospects/import': {
      const prospects = getItems(STORAGE_KEYS.PROSPECTS);
      const companies = body.companies || [];
      companies.forEach((c: any) => {
        if (!prospects.some(p => p.id === c.siren)) {
          prospects.unshift({
            id: c.siren,
            nom: c.nom,
            adresse: c.adresse,
            ville: c.adresse?.split(',')[1]?.trim() || 'Paris',
            secteur: c.libelleSecteur,
            taille: c.trancheEffectif,
            statut: 'À appeler',
            score: 75,
            telephone: '0100000000',
            telephoneVerifie: true,
            email: `contact@${c.nom.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
            emailVerifie: true,
            contacts: [
              { id: 'ct_' + Date.now(), nom: c.dirigeantNom, fonction: c.dirigeantRole }
            ],
            createdAt: new Date().toISOString()
          });
        }
      });
      setItems(STORAGE_KEYS.PROSPECTS, prospects);
      return { success: true, importedCount: companies.length };
    }

    case 'prospects/inscrire-sequence': {
      return { success: true };
    }

    case 'emails/envoyer': {
      return { success: true };
    }

    case 'ia/analyser': {
      return { success: true, analyse: 'Analyse IA générée avec succès pour ce prospect.' };
    }

    case 'signaux/verifier': {
      return { success: true, signaux: [] };
    }

    case 'crm/sync': {
      const logs = getItems(STORAGE_KEYS.CRM_LOGS);
      logs.unshift({
        id: 'log_' + Date.now(),
        date: new Date().toISOString(),
        type: 'sync',
        status: 'success',
        message: 'Synchronisation manuelle réussie'
      });
      setItems(STORAGE_KEYS.CRM_LOGS, logs);
      return { success: true };
    }

    case 'contacts': {
      const prospects = getItems(STORAGE_KEYS.PROSPECTS);
      const index = prospects.findIndex(p => p.id === body.prospectId);
      if (index > -1) {
        if (!prospects[index].contacts) {
          prospects[index].contacts = [];
        }
        const newContact = {
          id: 'c_' + Date.now(),
          nom: body.nom,
          email: body.email,
          telephone: body.telephone,
          fonction: body.role || body.fonction || 'Décideur',
        };
        prospects[index].contacts.push(newContact);
        // Recalculate/increment score slightly on adding contacts
        prospects[index].score = Math.min(100, (prospects[index].score || 50) + 10);
        setItems(STORAGE_KEYS.PROSPECTS, prospects);
        return { success: true, contact: newContact };
      }
      return { error: 'Prospect introuvable' };
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

    case 'campagnes': {
      const campaigns = getItems(STORAGE_KEYS.CAMPAGNES);
      const stages = getItems(STORAGE_KEYS.ETAPES);
      const links = getItems(STORAGE_KEYS.PROSPECT_CAMPAGNE);

      if (method === 'POST') {
        const newCamp = {
          id: 'c_' + Date.now(),
          nom: body.nom.trim(),
          description: body.description ? body.description.trim() : '',
          createdAt: new Date().toISOString(),
        };
        campaigns.unshift(newCamp);
        setItems(STORAGE_KEYS.CAMPAGNES, campaigns);

        // Add default steps
        const defaultEtapes = [
          { id: 'e_' + Date.now() + '_0', campagneId: newCamp.id, nom: 'Qualification', ordre: 0, couleur: '#94a3b8' },
          { id: 'e_' + Date.now() + '_1', campagneId: newCamp.id, nom: 'Premier contact', ordre: 1, couleur: '#60a5fa' },
          { id: 'e_' + Date.now() + '_2', campagneId: newCamp.id, nom: 'Relance', ordre: 2, couleur: '#f59e0b' },
          { id: 'e_' + Date.now() + '_3', campagneId: newCamp.id, nom: 'RDV pris', ordre: 3, couleur: '#a855f7' },
          { id: 'e_' + Date.now() + '_4', campagneId: newCamp.id, nom: 'Closing / Gagné', ordre: 4, couleur: '#10b981' },
          { id: 'e_' + Date.now() + '_5', campagneId: newCamp.id, nom: 'Perdu', ordre: 5, couleur: '#ef4444' }
        ];
        stages.push(...defaultEtapes);
        setItems(STORAGE_KEYS.ETAPES, stages);

        return { success: true, campagne: { ...newCamp, etapes: defaultEtapes, prospects: [] } };
      }

      // Populate GET response
      const populated = campaigns.map(c => {
        const cStages = stages.filter(s => s.campagneId === c.id).sort((a, b) => a.ordre - b.ordre);
        const cLinks = links.filter(l => l.campagneId === c.id);
        return {
          ...c,
          etapes: cStages,
          prospects: cLinks,
        };
      });

      return { success: true, campagnes: populated };
    }

    case 'campagnes/prospects': {
      const links = getItems(STORAGE_KEYS.PROSPECT_CAMPAGNE);
      const stages = getItems(STORAGE_KEYS.ETAPES);
      const { campagneId, prospectIds } = body;

      const firstStage = stages.find(s => s.campagneId === campagneId && s.ordre === 0);
      if (!firstStage) return { error: 'Première étape introuvable' };

      let addedCount = 0;
      prospectIds.forEach((pId: string) => {
        const exists = links.some(l => l.campagneId === campagneId && l.prospectId === pId);
        if (!exists) {
          links.push({
            id: 'pc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            campagneId,
            prospectId: pId,
            etapeId: firstStage.id,
            dateEntreeEtape: new Date().toISOString(),
          });
          addedCount++;
        }
      });

      setItems(STORAGE_KEYS.PROSPECT_CAMPAGNE, links);
      return { success: true, count: addedCount, message: `${addedCount} prospect(s) ajouté(s).` };
    }

    case 'campagnes/drag-and-drop': {
      const links = getItems(STORAGE_KEYS.PROSPECT_CAMPAGNE);
      const index = links.findIndex(l => l.id === body.prospectCampagneId);
      if (index > -1) {
        links[index].etapeId = body.toEtapeId;
        links[index].dateEntreeEtape = new Date().toISOString();
        setItems(STORAGE_KEYS.PROSPECT_CAMPAGNE, links);
        return { success: true, prospectCampagne: links[index] };
      }
      return { error: 'Liaison introuvable' };
    }

    case 'campagnes/relance': {
      const links = getItems(STORAGE_KEYS.PROSPECT_CAMPAGNE);
      const index = links.findIndex(l => l.id === body.prospectCampagneId);
      if (index > -1) {
        links[index].relanceProgrammee = body.relanceProgrammee;
        links[index].notes = body.notes;
        setItems(STORAGE_KEYS.PROSPECT_CAMPAGNE, links);
        return { success: true, prospectCampagne: links[index] };
      }
      return { error: 'Liaison introuvable' };
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

    case 'icp/decouvrir': {
      const siteUrl = body.siteUrl || '';
      const host = siteUrl.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0].toLowerCase();
      const companyKey = host.split('.')[0] || 'entreprise';

      // Industry detection based on domain keywords
      const kw = companyKey + ' ' + host;

      const isFood = /aperi|traiteur|restau|boulan|biscuit|charcut|fromagerie|vins?|biere|brasserie|alimentation|epicerie|cafe|bar|pastry|gastrono|chocolat|fruits?|legum|boucher|poissonnier/i.test(kw);
      const isBTP = /batiment|btp|construction|charpente|maconnerie|plomberie|electricien|toiture|renovation|architecture|immobi|agenceimmo|promoteur|terrassement|isolation|genie.civil/i.test(kw);
      const isLogiciel = /saas|tech|software|logiciel|digital|app|dev|code|ia|ai|data|cloud|cyber|erp|crm|fintech|edtech|hrtech/i.test(kw);
      const isConseil = /conseil|consult|cabinet|audit|expertise|strateg|rh|drh|management|finance|compta|juridique|notaire|avocat/i.test(kw);
      const isIndustrie = /industrie|manufacturing|usine|production|machine|meca|metal|acier|aluminium|forge|fonderie|packaging|pharma|chimie|energie|petrole|agri/i.test(kw);
      const isSante = /sante|medical|clinic|hopital|pharmaci|optique|dentist|kine|infirm|paramedical|maison.de.retraite|ehpad/i.test(kw);
      const isCommerce = /retail|commerce|boutique|mode|fashion|sport|luxe|bijou|cosmet|beaute|coiffure|esthetique|magasin|enseigne|distribution|franchise/i.test(kw);
      const isTransport = /transport|logistique|livraison|colis|fret|camion|flotte|transitaire|expediteur|import|export/i.test(kw);
      const isMarketing = /agence|marketing|communication|publicite|design|graphisme|redaction|seo|social.media|influence|evenement|relations.presse/i.test(kw);
      const isFormation = /formation|ecole|universite|apprentissage|elearning|coaching|cpf|organisme.de.formation|bilan.competence/i.test(kw);
      const isAssurance = /assurance|assur|insurance|prevoyance|mutuelle|courtier/i.test(kw);

      let resumeActivite: string;
      let concurrentsIdentifies: string[];
      let segmentsProposes: any[];
      let besoinGenere: any;

      if (isFood) {
        resumeActivite = `Entreprise agroalimentaire ou de restauration (${companyKey.toUpperCase()}) proposant des produits ou services gastronomiques à destination des professionnels du secteur HCR (Hôtels, Cafés, Restaurants) et de la grande distribution.`;
        concurrentsIdentifies = ['metro.fr', 'promocash.com', 'sysco.fr'];
        segmentsProposes = [
          { nom: 'Restaurateurs et traiteurs indépendants', score: 94 },
          { nom: 'Chaînes de restauration et franchises', score: 88 },
          { nom: 'Grande distribution et épiceries fines', score: 78 }
        ];
        besoinGenere = {
          solutionType: 'Distribution alimentaire & HCR B2B',
          tailleMin: 1,
          tailleMax: 50,
          zonesGeo: ['Toute la France'],
          secteurs: ['56.10A', '56.29A', '47.11D'],
          budgetType: 'Standard',
          signauxAchat: ['recrutement', 'refonte_site'],
          rolesDecideurs: ['Gérant', 'Responsable achats', 'Chef de cuisine', 'Directeur de restaurant'],
          motsClesSuggeres: 'Restaurants indépendants, Traiteurs professionnels, Brasseries, Cafetérias entreprise, Restauration collective, Hôtels restaurants',
          maxEntitesIA: 5,
        };
      } else if (isBTP) {
        resumeActivite = `Entreprise du secteur BTP/Construction (${companyKey.toUpperCase()}) proposant des prestations de construction, rénovation ou services techniques à destination des maîtres d'ouvrage, promoteurs et collectivités.`;
        concurrentsIdentifies = ['eiffage.com', 'vinci.com', 'bouygues-construction.fr'];
        segmentsProposes = [
          { nom: 'Promoteurs immobiliers et aménageurs', score: 92 },
          { nom: 'Syndics et gestionnaires de patrimoine', score: 85 },
          { nom: 'Collectivités locales et établissements publics', score: 80 }
        ];
        besoinGenere = {
          solutionType: 'Travaux & Services BTP',
          tailleMin: 5,
          tailleMax: 200,
          zonesGeo: ['Toute la France'],
          secteurs: ['41.10A', '42.11Z', '43.22A'],
          budgetType: 'Moyen',
          signauxAchat: ['levees_fonds', 'recrutement'],
          rolesDecideurs: ['Directeur de programme', 'Maître d\'ouvrage', 'Responsable technique', 'DAF'],
          motsClesSuggeres: 'Promoteurs immobiliers, Agences immobilières, Bailleurs sociaux, Syndics de copropriété, Collectivités locales, Arquitectes maîtres d\'oeuvre',
          maxEntitesIA: 5,
        };
      } else if (isAssurance) {
        resumeActivite = `Plateforme ou courtier en assurance (${companyKey.toUpperCase()}) offrant des solutions de prévoyance, assurance santé, habitation ou RC Pro adaptées aux professionnels et particuliers.`;
        concurrentsIdentifies = ['wakam.com', 'seyna.eu', 'april.fr'];
        segmentsProposes = [
          { nom: 'Courtiers en assurance indépendants', score: 92 },
          { nom: 'Agences immobilières et syndics', score: 85 },
          { nom: 'Startups et PME de services', score: 78 }
        ];
        besoinGenere = {
          solutionType: 'Assurance & Prévoyance B2B',
          tailleMin: 10, tailleMax: 250,
          zonesGeo: ['Île-de-France', 'Auvergne-Rhône-Alpes'],
          secteurs: ['66.22Z', '68.31Z', '62.01Z'],
          budgetType: 'Moyen',
          signauxAchat: ['recrutement', 'levees_fonds'],
          rolesDecideurs: ['Gérant', 'DAF', 'Responsable achats'],
          motsClesSuggeres: 'Courtiers en assurance, Agents généraux AXA Allianz, Cabinets de gestion de patrimoine, Professions libérales RC Pro, Experts-comptables protection sociale',
          maxEntitesIA: 5,
        };
      } else if (isIndustrie) {
        resumeActivite = `Acteur industriel ou manufacturier (${companyKey.toUpperCase()}) spécialisé dans la production ou la transformation de matériaux et équipements à destination d'autres industriels et donneurs d'ordre.`;
        concurrentsIdentifies = ['industrie.fr', 'siemens.fr', 'schneider-electric.fr'];
        segmentsProposes = [
          { nom: 'Sous-traitants et équipementiers industriels', score: 91 },
          { nom: 'Distributeurs et négoces techniques', score: 84 },
          { nom: 'Donneurs d\'ordre (ETI/grandes entreprises)', score: 80 }
        ];
        besoinGenere = {
          solutionType: 'Equipements & Solutions Industrielles',
          tailleMin: 20, tailleMax: 500,
          zonesGeo: ['Toute la France', 'Belgique', 'Allemagne'],
          secteurs: ['25.62Z', '28.22Z', '20.16Z'],
          budgetType: 'Élevé',
          signauxAchat: ['recrutement', 'levees_fonds'],
          rolesDecideurs: ['Directeur technique', 'Responsable production', 'Directeur achats', 'DAF'],
          motsClesSuggeres: 'Sous-traitants aéronautique, Équipementiers automobile, Fonderies métallurgie, Industries plastiques emballage, Fabricants machines-outils, ETI manufacturières',
          maxEntitesIA: 5,
        };
      } else if (isSante) {
        resumeActivite = `Acteur de la santé ou du médical (${companyKey.toUpperCase()}) proposant des soins, équipements ou solutions de bien-être à destination des professionnels de santé et établissements médicaux.`;
        concurrentsIdentifies = ['doctolib.fr', 'maisondedocteurs.fr', 'vidal.fr'];
        segmentsProposes = [
          { nom: 'Cliniques et établissements de santé privés', score: 93 },
          { nom: 'Cabinets libéraux (médecins, kiné, infirmiers)', score: 87 },
          { nom: 'Pharmacies et para-pharmacies', score: 80 }
        ];
        besoinGenere = {
          solutionType: 'Solutions de Santé & Médical',
          tailleMin: 1, tailleMax: 100,
          zonesGeo: ['Toute la France'],
          secteurs: ['86.10Z', '86.21Z', '47.73Z'],
          budgetType: 'Standard',
          signauxAchat: ['recrutement', 'levees_fonds'],
          rolesDecideurs: ['Directeur médical', 'Directeur d\'établissement', 'Responsable achats', 'Médecin associé'],
          motsClesSuggeres: 'Cliniques privées, Cabinets médicaux groupe, EHPAD maisons de retraite, Centres de rééducation kiné, Pharmacies indépendantes, Laboratoires analyses médicales',
          maxEntitesIA: 5,
        };
      } else if (isCommerce) {
        resumeActivite = `Enseigne ou marque de commerce/retail (${companyKey.toUpperCase()}) distribuant des produits à destination des consommateurs finaux, franchisés ou revendeurs B2B.`;
        concurrentsIdentifies = ['franprix.fr', 'franchisor.fr', 'retailconnect.fr'];
        segmentsProposes = [
          { nom: 'Franchisés et revendeurs multimarques', score: 90 },
          { nom: 'Boutiques indépendantes et corners', score: 85 },
          { nom: 'Centrale d\'achat et groupements', score: 78 }
        ];
        besoinGenere = {
          solutionType: 'Distribution & Commerce de détail',
          tailleMin: 1, tailleMax: 50,
          zonesGeo: ['Toute la France'],
          secteurs: ['47.71Z', '47.19B', '47.91A'],
          budgetType: 'Standard',
          signauxAchat: ['refonte_site', 'recrutement'],
          rolesDecideurs: ['Gérant', 'Responsable achats', 'Directeur commercial'],
          motsClesSuggeres: 'Boutiques mode indépendantes, Franchisés enseégnes nationales, Concept stores, Showrooms mobilier, Distributeurs multimarques, Revendeurs BtoB spécialisés',
          maxEntitesIA: 5,
        };
      } else if (isTransport) {
        resumeActivite = `Opérateur logistique ou de transport (${companyKey.toUpperCase()}) assurant l'acheminement et la distribution de marchandises B2B sur le territoire national et international.`;
        concurrentsIdentifies = ['geodis.com', 'dhl.fr', 'tnt.fr'];
        segmentsProposes = [
          { nom: 'E-commerçants et marketplaces', score: 92 },
          { nom: 'PME industrielles exportatrices', score: 87 },
          { nom: 'Distributeurs et grossistes nationaux', score: 82 }
        ];
        besoinGenere = {
          solutionType: 'Transport & Logistique B2B',
          tailleMin: 5, tailleMax: 300,
          zonesGeo: ['Toute la France', 'Europe'],
          secteurs: ['49.41A', '52.10B', '46.90Z'],
          budgetType: 'Moyen',
          signauxAchat: ['recrutement', 'levees_fonds'],
          rolesDecideurs: ['Directeur logistique', 'Responsable supply chain', 'DAF', 'Gérant'],
          motsClesSuggeres: 'E-commerçants grande échelle, PME industrielles exportatrices, Grossistes nationaux, Importateurs distributeurs, Plateformes e-commerce, Entreprises Amazon seller',
          maxEntitesIA: 5,
        };
      } else if (isMarketing) {
        resumeActivite = `Agence de communication, marketing ou design (${companyKey.toUpperCase()}) accompagnant des entreprises dans leur stratégie de marque, visibilité digitale et acquisition client.`;
        concurrentsIdentifies = ['publicisgroupe.com', 'havas.com', 'ogilvy.fr'];
        segmentsProposes = [
          { nom: 'PME en croissance cherchant à accroître leur visibilité', score: 91 },
          { nom: 'Startups et scale-ups (levées de fonds)', score: 88 },
          { nom: 'ETI en transformation de marque', score: 82 }
        ];
        besoinGenere = {
          solutionType: 'Marketing & Communication B2B',
          tailleMin: 5, tailleMax: 250,
          zonesGeo: ['Toute la France'],
          secteurs: ['73.11Z', '62.09Z', '74.10Z'],
          budgetType: 'Standard',
          signauxAchat: ['levees_fonds', 'refonte_site'],
          rolesDecideurs: ['Directeur marketing', 'CMO', 'Directeur général', 'Gérant'],
          motsClesSuggeres: 'Startups levée de fonds série A, PME rebranding identité, ETI lancement nouveau produit, Groupes refonte site corporate, Scale-ups équipe marketing croissante',
          maxEntitesIA: 5,
        };
      } else if (isFormation) {
        resumeActivite = `Organisme de formation ou école (${companyKey.toUpperCase()}) proposant des parcours de montée en compétences, certifications et bilans à destination des salariés et professionnels.`;
        concurrentsIdentifies = ['formaplace.fr', '360learning.com', 'crossknowledge.com'];
        segmentsProposes = [
          { nom: 'DRH et responsables formation en entreprise', score: 93 },
          { nom: 'OPCO et organismes financeurs', score: 86 },
          { nom: 'Indépendants et auto-entrepreneurs', score: 78 }
        ];
        besoinGenere = {
          solutionType: 'Formation & Développement des compétences',
          tailleMin: 10, tailleMax: 500,
          zonesGeo: ['Toute la France'],
          secteurs: ['85.59B', '70.22Z', '62.02A'],
          budgetType: 'Standard',
          signauxAchat: ['recrutement'],
          rolesDecideurs: ['DRH', 'Responsable formation', 'Directeur général', 'Manager'],
          motsClesSuggeres: 'DRH entreprises 50-500 salariés, Cabinets de conseil plan formation, ETI secteur industriel, Services publics formation agents, Coopératives agricoles CPF, Groupes hôtellerie restauration',
          maxEntitesIA: 5,
        };
      } else if (isConseil) {
        resumeActivite = `Cabinet de conseil ou d'expertise (${companyKey.toUpperCase()}) proposant des prestations d'accompagnement stratégique, juridique, financier ou RH à destination des dirigeants de PME/ETI.`;
        concurrentsIdentifies = ['mckinsey.fr', 'bain.fr', 'deloitte.fr'];
        segmentsProposes = [
          { nom: 'Dirigeants de PME en transformation', score: 90 },
          { nom: 'DAF et directions financières d\'ETI', score: 86 },
          { nom: 'Fonds d\'investissement et LBO', score: 80 }
        ];
        besoinGenere = {
          solutionType: 'Conseil & Expertise B2B',
          tailleMin: 10, tailleMax: 500,
          zonesGeo: ['Toute la France'],
          secteurs: ['69.20Z', '70.22Z', '64.20Z'],
          budgetType: 'Élevé',
          signauxAchat: ['levees_fonds', 'recrutement'],
          rolesDecideurs: ['DAF', 'Directeur général', 'Associé', 'Gérant'],
          motsClesSuggeres: 'PME en transformation organisationnelle, ETI projet ERP, Groupes fusion-acquisition, Directions financières restructuration, Fonds LBO portefeuille PME, Start-up gouvernance scale-up',
          maxEntitesIA: 5,
        };
      } else if (isLogiciel) {
        resumeActivite = `Éditeur de logiciel ou solution tech (${companyKey.toUpperCase()}) développant des outils SaaS, applications ou solutions IA pour accélérer la productivité et la transformation digitale des entreprises.`;
        concurrentsIdentifies = [`alt-${companyKey}.io`, `${companyKey}-rival.fr`];
        segmentsProposes = [
          { nom: 'PME en cours de digitalisation', score: 92 },
          { nom: 'ETI cherchant à moderniser leurs processus', score: 86 },
          { nom: 'Startups et scale-ups en hyper-croissance', score: 84 }
        ];
        besoinGenere = {
          solutionType: 'Logiciel SaaS B2B',
          tailleMin: 10, tailleMax: 500,
          zonesGeo: ['Toute la France', 'Belgique'],
          secteurs: ['62.01Z', '62.02A', '63.11Z'],
          budgetType: 'Standard',
          signauxAchat: ['recrutement', 'levees_fonds'],
          rolesDecideurs: ['CTO', 'DSI', 'Directeur général', 'Responsable IT'],
          motsClesSuggeres: 'PME digitalisées ERP cloud, ETI modernisation systèmes, Startups SaaS hyper-croissance, Groupes DSI sécurité informatique, Cabinets comptables logiciel gestion, ESN éditeurs partenaires',
          maxEntitesIA: 5,
        };
      } else {
        // Fallback dynamique et sur-mesure pour TOUS les secteurs d'activité
        const label = companyKey.charAt(0).toUpperCase() + companyKey.slice(1);
        
        // Tentative de déduction de l'activité par le nom du site
        let guessedSector = 'Services & Solutions Professionnelles';
        let guessedKeywords = `Entreprises partenaires, Décideurs B2B, Gérants PME, Directions achats`;
        let targetSecteurs = ['70.22Z', '46.90Z']; // Conseil, Negoce
        let roles = ['Gérant', 'Directeur Commercial', 'Responsable achats'];

        const ev = kw.toLowerCase();
        if (/hotel|heberg|gite|camp/i.test(ev)) {
          guessedSector = 'Hôtellerie & Hébergement Professionnel';
          guessedKeywords = 'Hôtels indépendants, Châteaux hôtels, Résidences de tourisme, Gîtes professionnels';
          targetSecteurs = ['55.10Z', '55.20Z'];
        } else if (/event|salon|foir|semin/i.test(ev)) {
          guessedSector = 'Événementiel & Organisation de séminaires';
          guessedKeywords = 'Agences événementielles, Lieux de réception, Organisateurs de salons, Services traiteurs';
          targetSecteurs = ['82.30Z', '93.29Z'];
          roles = ['Chef de projet événementiel', 'Responsable communication', 'Gérant'];
        } else if (/auto|car|moto|garage|vehic/i.test(ev)) {
          guessedSector = 'Automobile, Mobilité & Flottes de véhicules';
          guessedKeywords = 'Garages indépendants, Concessionnaires, Flottes de transport, Services auto entreprise';
          targetSecteurs = ['45.11Z', '45.20A'];
          roles = ['Gestionnaire de flotte', 'Responsable achats', 'Gérant'];
        } else if (/immobilier|immo|syndic|agence/i.test(ev)) {
          guessedSector = 'Immobilier & Gestion de Patrimoine';
          guessedKeywords = 'Agences immobilières, Promoteurs immobiliers, Syndics de copropriété, Administrateurs de biens';
          targetSecteurs = ['68.31Z', '68.32A'];
          roles = ['Directeur d\'agence', 'Responsable de copropriété', 'Gérant'];
        } else if (/energie|solar|solaire|eolien|elec/i.test(ev)) {
          guessedSector = 'Énergies renouvelables & Efficacité énergétique';
          guessedKeywords = 'Installateurs solaires, Bureaux d\'études thermiques, Entreprises électricité, Éco-rénovateurs';
          targetSecteurs = ['43.22B', '71.12B'];
          roles = ['Directeur technique', 'Responsable achats', 'Gérant'];
        }

        resumeActivite = `Entreprise spécialisée dans les solutions et prestations ${guessedSector} sous la marque ${label.toUpperCase()}, ciblant les acteurs B2B de son écosystème pour maximiser leur valeur d'usage.`;
        concurrentsIdentifies = [`concurrent-${companyKey}.fr`, `groupe-${companyKey}.com`, `alternative-${companyKey}.fr`];
        segmentsProposes = [
          { nom: `Acteurs cibles du secteur ${guessedSector}`, score: 95 },
          { nom: 'PME en forte croissance du secteur', score: 88 },
          { nom: 'ETI et grands comptes partenaires', score: 76 }
        ];

        besoinGenere = {
          solutionType: `${guessedSector} B2B`,
          tailleMin: 1, tailleMax: 200,
          zonesGeo: ['Toute la France'],
          secteurs: targetSecteurs,
          budgetType: 'Standard',
          signauxAchat: ['recrutement', 'refonte_site'],
          rolesDecideurs: roles,
          motsClesSuggeres: guessedKeywords,
          maxEntitesIA: 5,
        };
      }

      return {
        success: true,
        icp: {
          id: 'icp_' + Date.now(),
          domaineAnalyse: siteUrl,
          resumeActivite,
          concurrentsIdentifies,
          segmentsProposes,
          besoinGenere
        }
      };
    }

    case 'prospection/lancer': {
      const searches = getItems(STORAGE_KEYS.PROSPECTION);
      if (method === 'POST') {
        const newSearch = {
          id: 'search_' + Date.now(),
          entryType: body.entryType,
          entryValue: body.entryValue,
          besoin: body.besoin,
          statut: 'en_cours',
          createdAt: Date.now(), // timestamp to calculate delay client-side
        };
        searches.push(newSearch);
        setItems(STORAGE_KEYS.PROSPECTION, searches);
        return { success: true, rechercheId: newSearch.id, message: 'Recherche lancée avec succès.' };
      }

      // GET method: Retrieve search status/results
      const id = queryParams.get('id');
      const search = searches.find(s => s.id === id);
      if (!search) return { error: 'Recherche introuvable' };

      // Simulate a background worker: if 3 seconds have passed since creation, mark as finished!
      if (search.statut === 'en_cours' && Date.now() - search.createdAt > 3000) {
        search.statut = 'terminee';

        const roles: string[] = search.besoin?.rolesDecideurs || ['Gérant', 'Directeur commercial'];
        const secteurs: string[] = search.besoin?.secteurs || [];
        const signaux: string[] = search.besoin?.signauxAchat || ['recrutement'];
        const solutionType: string = search.besoin?.solutionType || '';
        const entryVal: string = search.entryValue || '';

        // --- Call real SIRENE open-data API ---
        // Map NAF code(s) and search keywords to the query
        const nafCode = secteurs.find(s => s.includes('.')) || '';
        const q = entryVal
          ? entryVal.split(',')[0].trim()   // first keyword the user typed
          : solutionType.split(' ')[0];     // or first word of solution type

        let sirenResults: any[] = [];
        try {
          // Build query to recherche-entreprises.api.gouv.fr (free, no auth, CORS-enabled)
          const params = new URLSearchParams();
          if (q && q.length > 2) params.set('q', q);
          if (nafCode) params.set('activite_principale', nafCode);
          params.set('page', '1');
          params.set('per_page', '8');
          params.set('etat_administratif', 'A'); // only active companies

          const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?${params.toString()}`;
          console.log('[Mock API] Calling SIRENE API:', apiUrl);

          const sirenRes = await fetch(apiUrl);
          if (sirenRes.ok) {
            const sirenData = await sirenRes.json();
            sirenResults = sirenData.results || [];
            console.log(`[Mock API] SIRENE returned ${sirenResults.length} results`);
          }
        } catch (sirenErr) {
          console.warn('[Mock API] SIRENE API call failed, falling back to catalog:', sirenErr);
        }

        // Enrichment data generators (email/phone/LinkedIn remain simulated)
        const FIRST_NAMES = ['Alexandre', 'Sophie', 'Thomas', 'Marie', 'Nicolas', 'Isabelle', 'Julien', 'Claire'];
        const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Lefebvre', 'Girard', 'Roux'];
        const SOURCES = ['Waterfall cascade (LinkedIn + Hunter)', 'Hunter.io + Dropcontact', 'Apollo.io enrichissement', 'PhantomBuster + Kaspr', 'LinkedIn Sales Navigator'];
        const ANGLES = {
          recrutement: 'recrutement actif de vos équipes',
          levees_fonds: 'levée de fonds récente',
          refonte_site: 'refonte de votre site web',
          technologie_modifiee: 'changement technologique récent',
        };

        const buildFromSirene = (etablissement: any, idx: number): any => {
          const nom = etablissement.nom_complet || etablissement.nom_raison_sociale || `Entreprise ${idx + 1}`;
          const siren = etablissement.siren || '';
          const nafLabel = etablissement.activite_principale_libelle || solutionType;
          const nafCode2 = etablissement.activite_principale || secteurs[0] || '70.22Z';
          const villeRaw = etablissement.siege?.libelle_commune || etablissement.siege?.code_postal || 'France';
          const ville = villeRaw.charAt(0).toUpperCase() + villeRaw.slice(1).toLowerCase();
          const cp = etablissement.siege?.code_postal || '';

          // Effectif
          let effectif = '';
          const tranche = etablissement.tranche_effectif_salarie;
          const effectifMap: Record<string, string> = {
            '00': '0 salarié', '01': '1-2 salariés', '02': '3-5 salariés',
            '03': '6-9 salariés', '11': '10-19 salariés', '12': '20-49 salariés',
            '21': '50-99 salariés', '22': '100-199 salariés', '31': '200-499 salariés',
            '32': '500-999 salariés', '41': '1000-1999 salariés', '42': '2000+ salariés',
          };
          effectif = tranche ? (effectifMap[tranche] || `Effectif ${tranche}`) : 'NC';

          const firstName = FIRST_NAMES[idx % FIRST_NAMES.length];
          const lastName = LAST_NAMES[idx % LAST_NAMES.length];
          const role = roles[idx % roles.length] || 'Gérant';
          const signal = signaux[idx % signaux.length] || 'recrutement';
          const angleText = ANGLES[signal as keyof typeof ANGLES] || signal;
          const source = SOURCES[idx % SOURCES.length];
          const emailDomain = nom.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) + (cp ? `.fr` : '.com');
          const fitScore = Math.max(90, 98 - idx * 2);
          const timingScore = Math.max(89, 96 - idx * 2);
          const canal = signal === 'levees_fonds' ? 'linkedin' : (idx % 2 === 0 ? 'email' : 'linkedin');

          return {
            id: `et_${siren || idx}_${Date.now()}`,
            nom,
            siren,
            secteur: nafCode2,
            secteurLabel: nafLabel,
            effectif,
            ville,
            codePostal: cp,
            fitScore,
            fitDetail: JSON.stringify({ secteurMatch: true, geoMatch: true, tailleMatch: true, decideurMatch: true, note: "Score d'affinité optimal : adéquation totale de l'ICP." }),
            timingScore,
            timingDetail: JSON.stringify({ signalDetecte: signal }),
            statutCRM: 'nouveau',
            decideurs: [
              {
                id: `dec_${idx}_${Date.now()}`,
                nom: `${firstName} ${lastName}`,
                fonction: role,
                linkedinUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(role + ' ' + nom)}`,
                emailTrouve: `${firstName.charAt(0).toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`,
                emailStatutVerif: idx % 3 === 1 ? 'risque' : 'verifie',
                emailProbabiliteBounce: idx % 3 === 1 ? 0.14 : 0.03,
                telephoneTrouve: (idx % 2 === 0 ? '06' : '07') + Math.floor(10000000 + idx * 13579246 % 89999999),
                telephoneType: idx % 2 === 0 ? 'mobile' : 'direct',
                telephoneActif: idx < 4,
                confiance: Math.max(65, 93 - idx * 5),
                source
              }
            ],
            // Generate a tailored pitch based on the company's solutionType
            let sectorPitch = `notre solution de ${solutionType || 'services B2B'}`;
            const solLower = solutionType.toLowerCase();

            if (solLower.includes('alimentaire') || solLower.includes('hcr') || solLower.includes('boisson') || solLower.includes('apéritif')) {
              sectorPitch = "nos gammes de boissons artisanales, coffrets apéritifs et produits du terroir de qualité pour les professionnels, événements d'entreprise et cadeaux d'affaires";
            } else if (solLower.includes('btp') || solLower.includes('travaux') || solLower.includes('construction')) {
              sectorPitch = "nos prestations de travaux, rénovation de bâtiments et services techniques pour les chantiers professionnels";
            } else if (solLower.includes('assurance') || solLower.includes('prévoyance') || solLower.includes('mutuelle')) {
              sectorPitch = "nos solutions de couverture santé collective, prévoyance et garanties RC Pro sur-mesure pour protéger vos équipes et vos locaux";
            } else if (solLower.includes('logiciel') || solLower.includes('saas') || solLower.includes('tech')) {
              sectorPitch = `notre plateforme logicielle pour optimiser et automatiser vos flux de travail quotidiens`;
            } else if (solLower.includes('marketing') || solLower.includes('communication') || solLower.includes('agence')) {
              sectorPitch = "nos services d'accompagnement en visibilité digitale, branding de marque et campagnes d'acquisition de prospects";
            } else if (solLower.includes('formation') || solLower.includes('compétence')) {
              sectorPitch = "nos programmes de formation continue et ateliers certifiants pour développer les compétences de vos équipes";
            } else if (solLower.includes('conseil') || solLower.includes('cabinet') || solLower.includes('audit')) {
              sectorPitch = "nos services d'accompagnement stratégique, audit organisationnel et conseil en gestion pour sécuriser votre croissance";
            } else if (solLower.includes('transport') || solLower.includes('logistique')) {
              sectorPitch = "nos solutions d'acheminement, livraison express et gestion logistique pour optimiser vos flux de marchandises";
            } else if (solLower.includes('santé') || solLower.includes('médical')) {
              sectorPitch = "nos équipements spécialisés et solutions d'accompagnement santé pour les professionnels du secteur médical";
            } else if (solLower.includes('commerce') || solLower.includes('distribution') || solLower.includes('retail')) {
              sectorPitch = "nos solutions de distribution commerciale et approvisionnement en gros pour les points de vente";
            }

            return {
              id: `et_${siren || idx}_${Date.now()}`,
              nom,
              siren,
              secteur: nafCode2,
              secteurLabel: nafLabel,
              effectif,
              ville,
              codePostal: cp,
              fitScore,
              fitDetail: JSON.stringify({ secteurMatch: true, geoMatch: idx < 3 }),
              timingScore,
              timingDetail: JSON.stringify({ signalDetecte: signal }),
              statutCRM: 'nouveau',
              decideurs: [
                {
                  id: `dec_${idx}_${Date.now()}`,
                  nom: `${firstName} ${lastName}`,
                  fonction: role,
                  linkedinUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(role + ' ' + nom)}`,
                  emailTrouve: `${firstName.charAt(0).toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`,
                  emailStatutVerif: idx % 3 === 1 ? 'risque' : 'verifie',
                  emailProbabiliteBounce: idx % 3 === 1 ? 0.14 : 0.03,
                  telephoneTrouve: (idx % 2 === 0 ? '06' : '07') + Math.floor(10000000 + idx * 13579246 % 89999999),
                  telephoneType: idx % 2 === 0 ? 'mobile' : 'direct',
                  telephoneActif: idx < 4,
                  confiance: Math.max(65, 93 - idx * 5),
                  source
                }
              ],
              planApproche: {
                canalRecommande: canal,
                angleAccroche: `Signal détecté : ${angleText}`,
                messageDraft: idx === 0
                  ? `Bonjour ${firstName},\n\nJ'ai remarqué que ${nom} (${ville}) est actuellement en phase de ${angleText}.\n\nJe pense que ${sectorPitch} pourrait grandement intéresser vos équipes.\n\nSeriez-vous disponible pour un échange rapide de 10 minutes cette semaine ?\n\nCordialement,\n[Votre prénom]`
                  : `Bonjour ${firstName},\n\nSuite à votre récent ${angleText}, je souhaitais contacter ${nom} directement.\n\nNous proposons ${sectorPitch} pour accompagner les entreprises de votre secteur.\n\nUn échange rapide vous intéresse-t-il ?\n\nBien cordialement,\n[Votre prénom]`
              }
            };
          };

        // Use SIRENE results if available, otherwise fallback minimal set
        if (sirenResults.length > 0) {
          search.entreprises = sirenResults.slice(0, 8).map((r: any, i: number) => buildFromSirene(r, i));
        } else {
          // Minimal fallback: generic but at least contextual
          const fallbackNames = solutionType
            ? [`${q || 'PME'} Services`, `Groupe ${q || 'Pro'} France`, `${q || 'Alliance'} & Associés`]
            : ['Services Pro France', 'Groupe Alliance B2B', 'Partenaires Experts'];
          search.entreprises = fallbackNames.map((nom, i) => buildFromSirene({
            nom_complet: nom,
            siren: '',
            activite_principale: secteurs[0] || '70.22Z',
            activite_principale_libelle: solutionType,
            tranche_effectif_salarie: '12',
            siege: { libelle_commune: ['Paris', 'Lyon', 'Bordeaux'][i] || 'France', code_postal: ['75001', '69001', '33000'][i] || '' }
          }, i));
        }

        // Buyer persona (always generated from ICP context)
        search.buyerPersonas = [
          {
            id: 'bp_' + Date.now(),
            roleTarget: roles[0] || 'Gérant',
            motivations: JSON.stringify([
              `Trouver rapidement des prospects qualifiés dans le secteur ${solutionType || 'cible'}.`,
              `Réduire le temps de prospection manuelle et automatiser les relances.`,
              `Identifier les bons décideurs au bon moment grâce aux signaux d'achat.`
            ]),
            objections: JSON.stringify([
              `Incertitude sur la qualité des données de contact.`,
              `Préférence pour les recommandations réseau plutôt que la prospection froide.`
            ]),
            vocabulaire: JSON.stringify(['Pipeline', 'Relance', 'Ciblage', 'Signal d\'achat', signaux[0] === 'recrutement' ? 'Signal recrutement' : 'Levée de fonds']),
            kpis: JSON.stringify(['Taux de réponse', 'RDV qualifiés', 'Cycle de vente', 'Taux de transformation'])
          }
        ];

        // Update the item in the list
        const idx = searches.findIndex(s => s.id === id);
        if (idx > -1) {
          searches[idx] = search;
          setItems(STORAGE_KEYS.PROSPECTION, searches);
        }
      }

      return { success: true, recherche: search };

    }

        // Update the item in the list
        const idx = searches.findIndex(s => s.id === id);
        if (idx > -1) {
          searches[idx] = search;
          setItems(STORAGE_KEYS.PROSPECTION, searches);
        }
      }

      return { success: true, recherche: search };
    }

    case 'prospection/feedback': {
      return { success: true };
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
      // Handle dynamic routes like campagnes/:id
      if (path.startsWith('campagnes/')) {
        const parts = path.split('/');
        const id = parts[1];
        const campaigns = getItems(STORAGE_KEYS.CAMPAGNES);
        const stages = getItems(STORAGE_KEYS.ETAPES);
        const links = getItems(STORAGE_KEYS.PROSPECT_CAMPAGNE);
        const prospects = getItems(STORAGE_KEYS.PROSPECTS);

        if (method === 'DELETE') {
          const filtered = campaigns.filter(c => c.id !== id);
          setItems(STORAGE_KEYS.CAMPAGNES, filtered);
          return { success: true };
        } else if (method === 'PUT' || method === 'PATCH') {
          const index = campaigns.findIndex(c => c.id === id);
          if (index > -1) {
            campaigns[index] = { ...campaigns[index], ...body };
            setItems(STORAGE_KEYS.CAMPAGNES, campaigns);
            return { success: true, campagne: campaigns[index] };
          }
        } else if (method === 'GET') {
          const campagne = campaigns.find(c => c.id === id);
          if (campagne) {
            const cStages = stages.filter(s => s.campagneId === id).sort((a, b) => a.ordre - b.ordre);
            const populatedStages = cStages.map(s => {
              const sLinks = links.filter(l => l.etapeId === s.id);
              const populatedProspects = sLinks.map(l => {
                const p = prospects.find(p => p.id === l.prospectId);
                return {
                  id: l.id,
                  campagneId: l.campagneId,
                  prospectId: l.prospectId,
                  etapeId: l.etapeId,
                  dateEntreeEtape: l.dateEntreeEtape,
                  relanceProgrammee: l.relanceProgrammee,
                  notes: l.notes,
                  prospect: p ? {
                    contacts: [],
                    ...p
                  } : null
                };
              });
              return {
                ...s,
                prospects: populatedProspects
              };
            });

            return {
              success: true,
              campagne: {
                ...campagne,
                etapes: populatedStages
              }
            };
          }
        }
      }

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
          if (prospect) {
            return {
              success: true,
              prospect: {
                contacts: [],
                devis: [],
                signauxEmbauche: [],
                interactions: [],
                sequences: [],
                ...prospect
              }
            };
          }
        }
      }
      
      throw new Error(`Mock API does not support route: ${path}`);
    }
  }
}
