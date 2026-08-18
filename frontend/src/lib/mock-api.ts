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
