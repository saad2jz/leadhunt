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
export async function geminiGenerate(prompt: string, systemPrompt?: string): Promise<string> {
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
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
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

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans explication, avec exactement ces clés :
{
  "solutionType": "Description courte de l'offre/produit",
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

  const raw = await geminiGenerate(prompt);

  // Extract JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Gemini did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed;
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
