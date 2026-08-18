// Gemini API client for client-side usage (GitHub Pages static deployment)
// Uses Gemini 2.0 Flash via REST API directly from the browser

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
    finishReason: string;
  }[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Call Gemini API with a single prompt (no conversation history)
 */
export async function geminiGenerate(
  prompt: string, 
  systemPrompt?: string,
  responseJson: boolean = false
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Set NEXT_PUBLIC_GEMINI_API_KEY.');
  }

  const contents: GeminiMessage[] = [];

  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Compris, je vais suivre ces instructions.' }] });
  }

  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const body = {
    contents,
    generationConfig: {
      temperature: 0.2, // lower temperature for strictly structured JSON
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: responseJson ? "application/json" : undefined,
    },
  };

  const res = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: GeminiResponse = await res.json();

  if (data.error) {
    throw new Error(`Gemini API error ${data.error.code}: ${data.error.message}`);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Call Gemini API with conversation history
 */
export async function geminiChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt?: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Set NEXT_PUBLIC_GEMINI_API_KEY.');
  }

  const contents: GeminiMessage[] = [];

  // System prompt as initial exchange
  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({
      role: 'model',
      parts: [{ text: "Compris. Je suis votre copilote commercial IA. Je suis prêt à vous aider." }],
    });
  }

  // Add conversation history
  for (const msg of messages) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
      responseMimeType: "application/json", // force JSON response for structural routing
    },
  };

  const res = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: GeminiResponse = await res.json();

  if (data.error) {
    throw new Error(`Gemini API error ${data.error.code}: ${data.error.message}`);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Analyze a website URL and extract B2B ICP data using Gemini
 */
export async function analyzeWebsiteICP(siteUrl: string): Promise<{
  solutionType: string;
  secteur: string;
  tailleMin: number;
  tailleMax: number;
  zonesGeo: string[];
  secteurs: string[];
  budgetType: string;
  signauxAchat: string[];
  rolesDecideurs: string[];
  motsClesSuggeres: string;
  resumeActivite: string;
  segmentsProposes: { nom: string; score: number }[];
}> {
  const prompt = `Tu es un expert en prospection B2B et analyse de marché.

Analyse ce site web B2B : ${siteUrl}

Déduis l'activité de cette entreprise et propose un profil de prospect idéal (ICP) pour leur prospection commerciale B2B.

Tu dois impérativement retourner un objet JSON avec exactement ces clés :
{
  "solutionType": "Description courte de l'offre/produit ou de ce que vend cette entreprise",
  "secteur": "Secteur d'activité principal en français",
  "tailleMin": 1,
  "tailleMax": 500,
  "zonesGeo": ["France", "Belgique"],
  "secteurs": ["code_naf_1", "code_naf_2"],
  "budgetType": "Standard",
  "signauxAchat": ["recrutement", "levees_fonds"],
  "rolesDecideurs": ["Directeur Commercial", "CEO"],
  "motsClesSuggeres": "mots clés pour rechercher les prospects sur SIRENE",
  "resumeActivite": "Résumé en 2 phrases de l'activité de l'entreprise",
  "segmentsProposes": [
    {"nom": "Segment 1", "score": 95},
    {"nom": "Segment 2", "score": 80}
  ]
}

Les codes NAF doivent être de vrais codes INSEE (ex: 62.01Z, 46.41Z, 10.71C, etc.).
Les mots clés doivent être en français et pertinents pour SIRENE.`;

  try {
    // Force JSON Mode (responseMimeType = application/json)
    const raw = await geminiGenerate(prompt, undefined, true);

    // Robust JSON extraction
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Gemini response does not contain braces');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Ensure array and structure default fallbacks to avoid undefined crashes in UI
    return {
      solutionType: parsed.solutionType || 'Services B2B',
      secteur: parsed.secteur || 'Services',
      tailleMin: Number(parsed.tailleMin) || 1,
      tailleMax: Number(parsed.tailleMax) || 100,
      zonesGeo: Array.isArray(parsed.zonesGeo) ? parsed.zonesGeo : ['Toute la France'],
      secteurs: Array.isArray(parsed.secteurs) ? parsed.secteurs : ['70.22Z'],
      budgetType: parsed.budgetType || 'Moyen',
      signauxAchat: Array.isArray(parsed.signauxAchat) ? parsed.signauxAchat : ['recrutement'],
      rolesDecideurs: Array.isArray(parsed.rolesDecideurs) ? parsed.rolesDecideurs : ['Gérant'],
      motsClesSuggeres: parsed.motsClesSuggeres || 'Services aux entreprises',
      resumeActivite: parsed.resumeActivite || 'Entreprise spécialisée dans les services B2B.',
      segmentsProposes: Array.isArray(parsed.segmentsProposes) ? parsed.segmentsProposes : [
        { nom: 'PME cibles', score: 90 },
        { nom: 'Grands comptes', score: 75 }
      ]
    };
  } catch (err) {
    console.error('[Gemini client] Failed to parse ICP response, using fallback profile:', err);
    
    // Guess a context-based fallback based on the site domain
    const lowerDomain = siteUrl.toLowerCase();
    let sector = 'Services & Conseil';
    let codeNaf = ['70.22Z'];
    let keywords = 'Conseil, Marketing, Entreprises';
    let roles = ['Gérant', 'Directeur Commercial'];

    if (lowerDomain.includes('nike') || lowerDomain.includes('sport') || lowerDomain.includes('cloth') || lowerDomain.includes('vetement')) {
      sector = 'Mode, Sport & Retail';
      codeNaf = ['47.71Z', '46.42Z'];
      keywords = 'Magasins de sport, Prêt-à-porter, Distributeurs vêtements';
      roles = ['Responsable réseau', 'Directeur achats', 'Gérant'];
    } else if (lowerDomain.includes('food') || lowerDomain.includes('restau') || lowerDomain.includes('aperitif')) {
      sector = 'Alimentation & Restauration';
      codeNaf = ['56.10A', '46.39B'];
      keywords = 'Restaurants, Traiteurs, Épiceries fines, Cavistes';
      roles = ['Gérant', 'Responsable achats', 'Chef de cuisine'];
    }

    return {
      solutionType: `Prestations ${sector}`,
      secteur: sector,
      tailleMin: 1,
      tailleMax: 150,
      zonesGeo: ['Toute la France'],
      secteurs: codeNaf,
      budgetType: 'Moyen',
      signauxAchat: ['recrutement'],
      rolesDecideurs: roles,
      motsClesSuggeres: keywords,
      resumeActivite: `Entreprise intervenant sur le secteur : ${sector}.`,
      segmentsProposes: [
        { nom: `Acteurs principaux du secteur ${sector}`, score: 92 },
        { nom: 'Détaillants et franchisés cibles', score: 80 }
      ]
    };
  }
}

/**
 * Enriches a list of SIRENE companies with highly realistic or real decision makers, domain names,
 * and business email structures using Gemini AI.
 */
export async function enrichirDecideursParIA(
  entreprises: { siren: string; nom: string; ville: string; naf: string }[],
  rolesCibles: string[]
): Promise<Record<string, {
  dirigeantNom: string;
  dirigeantRole: string;
  email: string;
  telephone: string;
  siteWeb: string;
  linkedinUrl: string;
}>> {
  const prompt = `Tu es un expert en enrichissement de données B2B (Data Enrichment).
Voici une liste d'entreprises françaises réelles issues de l'INSEE/SIRENE :
${JSON.stringify(entreprises, null, 2)}

Pour chacune de ces entreprises, tu dois :
1. Identifier ou déduire le nom du dirigeant principal (mandataire social, CEO, Fondateur, ou le rôle le plus haut parmi : ${rolesCibles.join(', ')}). Si c'est une grande entreprise connue (ex: Nike France, Décathlon), trouve le VRAI nom du dirigeant actuel. Si c'est une petite entreprise, déduis un prénom et nom français très réalistes et professionnels.
2. Déterminer le VRAI nom de domaine internet ou site web de cette entreprise (ex: nike.com pour Nike France, decathlon.fr pour Décathlon). N'utilise JAMAIS de faux domaines génériques comme "magasinsdespor.fr" ou "entreprise1.fr". Trouve le vrai domaine.
3. Générer l'adresse email nominative professionnelle la plus probable basée sur le vrai nom de domaine (ex: j.doe@nike.com, ou contact@decathlon.fr).
4. Générer un numéro de téléphone d'établissement français cohérent (ex: 01..., 02..., 06..., 07...).
5. Fournir une URL de recherche LinkedIn ciblée sur cette personne dans cette entreprise.

Réponds UNIQUEMENT avec un objet JSON valide, associant chaque SIREN de l'entreprise à ses données enrichies, sans explication, sans markdown :
{
  "siren_de_l_entreprise": {
    "dirigeantNom": "Prénom Nom",
    "dirigeantRole": "Rôle",
    "siteWeb": "vrai-domaine.com",
    "email": "email@vrai-domaine.com",
    "telephone": "0600000000",
    "linkedinUrl": "https://www.linkedin.com/in/profil"
  }
}`;

  try {
    const raw = await geminiGenerate(prompt, undefined, true);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[Gemini client] Failed to enrich decision makers via IA, using local fallback:', err);
    return {};
  }
}

export const GEMINI_SYSTEM_PROMPT = `Tu es le Copilote Commercial IA de LeadHunt, un outil de prospection B2B.

Tes capacités :
- Lancer des recherches d'entreprises dans la base SIRENE (entreprises françaises officielles)
- Analyser des sites web pour déduire le profil client idéal (ICP)
- Inscrire des prospects à des séquences d'emails automatisées
- Donner des statistiques sur le CRM de l'utilisateur
- Naviguer entre les pages de l'application

Ton style :
- Concis, professionnel, orienté résultats (max 3 lignes)
- Tu proposes toujours des actions concrètes ou des étapes suivantes
- Tu parles en français

Quand l'utilisateur te demande de faire quelque chose, propose une action et demande confirmation avant d'exécuter.
Si on te demande de "lancer une recherche", tu proposes : typeAction = "recherche_entreprise"
Si on te demande "inscrire des prospects", tu proposes : typeAction = "inscrire_sequence"  
Si on te demande "envoyer des emails/relances", tu proposes : typeAction = "envoyer_email"

Format de réponse JSON obligatoire pour TOUTES tes réponses. Tu dois TOUJOURS inclure 3 à 4 suggestions contextuelles et pertinentes de bulles cliquables adaptées à l'étape suivante ou la page actuelle sous la clé "suggestions".

Format de réponse JSON avec action :
{
  "response": "Ta réponse textuelle",
  "proposedAction": {
    "typeAction": "recherche_entreprise|inscrire_sequence|envoyer_email|ajouter_prospect|navigation",
    "parametres": { ... }
  },
  "suggestions": [
    { "label": "Titre bulle 1", "icon": "🔍", "text": "Message envoyé par le clic 1" },
    { "label": "Titre bulle 2", "icon": "📧", "text": "Message envoyé par le clic 2" }
  ]
}

Format de réponse JSON sans action :
{
  "response": "Ta réponse textuelle",
  "suggestions": [
    { "label": "Titre bulle 1", "icon": "📊", "text": "Message envoyé par le clic 1" },
    { "label": "Titre bulle 2", "icon": "🗺️", "text": "Message envoyé par le clic 2" }
  ]
}`;
