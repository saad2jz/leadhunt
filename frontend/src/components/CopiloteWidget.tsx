'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, User, Check, AlertCircle, Loader2, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { geminiChat, GEMINI_SYSTEM_PROMPT } from '@/lib/gemini-client';

// ---- Types ----
interface ChatMessage {
  role: 'user' | 'assistant' | 'action_proposal';
  content?: string;
  actionId?: string;
  typeAction?: string;
  parametres?: Record<string, unknown>;
}

interface ProposedAction {
  typeAction: string;
  parametres: Record<string, unknown>;
}

// ---- Helpers ----
function getStoredProspects() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('leadhunt_mock_prospects') || '[]');
  } catch { return []; }
}

function getStoredCampagnes() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('leadhunt_mock_campagnes') || '[]');
  } catch { return []; }
}

// ---- Context injected into Gemini ----
function buildContextualSystemPrompt(): string {
  const prospects = getStoredProspects();
  const campagnes = getStoredCampagnes();

  const prospectSummary = prospects.length > 0
    ? `Tu gères actuellement ${prospects.length} prospect(s) dont: ${prospects.slice(0, 3).map((p: any) => p.nom).join(', ')}${prospects.length > 3 ? ', ...' : ''}.`
    : 'Le CRM ne contient pas encore de prospects.';

  const campagneSummary = campagnes.length > 0
    ? `Il y a ${campagnes.length} campagne(s) active(s): ${campagnes.slice(0, 2).map((c: any) => c.nom).join(', ')}${campagnes.length > 2 ? ', ...' : ''}.`
    : 'Aucune campagne créée pour le moment.';

  return `${GEMINI_SYSTEM_PROMPT}

## Contexte actuel du CRM de l'utilisateur
${prospectSummary}
${campagneSummary}

## Actions disponibles
- recherche_entreprise : lancer une recherche SIRENE (vrai données entreprises françaises)
- inscrire_sequence : inscrire des prospects à une séquence d'emails
- envoyer_email : envoyer un email à un prospect
- navigation : naviguer vers une page de l'application
- ajouter_prospect : ajouter un prospect manuellement

## Pages de l'application
- /dashboard : tableau de bord statistiques
- /prospects : liste et gestion des prospects (CRM)
- /prospection : outil de recherche et génération de prospects (SIRENE)
- /campagnes : campagnes et séquences d'emails
- /carte : carte géographique des prospects
- /settings : paramètres et intégrations

## Instructions de format
Si tu proposes une action concrète, structure ta réponse EXACTEMENT ainsi (JSON valide) :
{"response": "Ton texte de réponse", "proposedAction": {"typeAction": "nom_action", "parametres": {}}}

Si tu réponds seulement (sans action), utilise :
{"response": "Ton texte de réponse"}

IMPORTANT: Ne dépasse JAMAIS les 3 lignes dans ta réponse. Sois concis et actionable.`;
}

// ---- Suggestion bubbles ----
const SUGGESTIONS = [
  { label: 'Recherche SIRENE', icon: '🔍', text: 'Lance une recherche SIRENE pour trouver des prospects' },
  { label: 'Prospects CRM', icon: '👥', text: 'Combien de prospects ai-je dans mon CRM ?' },
  { label: 'Carte des prospects', icon: '🗺️', text: 'Navigue vers la carte des prospects' },
  { label: 'Créer une campagne', icon: '📧', text: 'Comment créer une campagne email ?' },
  { label: 'Statistiques', icon: '📊', text: 'Montre-moi le tableau de bord' },
];

export default function CopiloteWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Bonjour 👋 Je suis votre **Copilote Commercial IA** (propulsé par Gemini). Je peux lancer des recherches SIRENE, analyser des sites web, gérer vos prospects et naviguer dans l'application. Que souhaitez-vous faire ?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Conversation history for multi-turn context (Gemini format)
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // ---- Local navigation/form-fill shortcuts ----
  const handleNavigationOrFormCompletion = (text: string): boolean => {
    const lower = text.toLowerCase();

    if (lower.includes('carte') || lower.includes('map gps')) {
      addAssistantMessage('Navigation vers la 🗺️ **Carte des prospects**...');
      router.push('/carte');
      return true;
    }
    if ((lower.includes('tableau') && lower.includes('bord')) || lower.includes('dashboard')) {
      addAssistantMessage('Navigation vers le 📊 **Tableau de bord**...');
      router.push('/dashboard');
      return true;
    }
    if (lower.includes('campagne')) {
      addAssistantMessage('Navigation vers les 📧 **Campagnes**...');
      router.push('/campagnes');
      return true;
    }
    if (lower.includes('prospection') && (lower.includes('va') || lower.includes('navigue') || lower.includes('aller') || lower.includes('ouvrir'))) {
      addAssistantMessage('Navigation vers la 🔍 **Recherche de prospection**...');
      router.push('/prospection');
      return true;
    }
    if (lower.includes('paramètre') || lower.includes('settings') || lower.includes('intégration')) {
      addAssistantMessage('Navigation vers les ⚙️ **Paramètres**...');
      router.push('/settings');
      return true;
    }

    return false;
  };

  const addAssistantMessage = (content: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content }]);
  };

  // ---- Execute a proposed action ----
  const executeProposedAction = async (action: ProposedAction) => {
    const { typeAction, parametres } = action;

    if (typeAction === 'navigation') {
      const page = (parametres.page as string) || '/dashboard';
      addAssistantMessage(`Navigation vers **${page}**...`);
      router.push(page);
      return;
    }

    if (typeAction === 'recherche_entreprise') {
      addAssistantMessage('🔍 Redirection vers la page de prospection SIRENE...');
      router.push('/prospection');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('copilote-fill-form', {
          detail: {
            page: '/prospection',
            data: {
              siteUrl: (parametres.siteUrl as string) || '',
              entryValue: (parametres.entryValue as string) || (parametres.secteur as string) || '',
            }
          }
        }));
      }, 900);
      return;
    }

    if (typeAction === 'ajouter_prospect') {
      addAssistantMessage(`📝 Ouverture du formulaire de prospect...`);
      router.push('/prospects');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('copilote-fill-form', {
          detail: {
            page: '/prospects',
            data: parametres,
          }
        }));
      }, 900);
      return;
    }

    addAssistantMessage(`✅ Action **${typeAction}** prise en compte.`);
  };

  // ---- Send a message to Gemini ----
  const sendToGemini = async (userMsg: string) => {
    setLoading(true);
    setGeminiError(null);
    setShowSuggestions(false);

    // Add to history
    historyRef.current.push({ role: 'user', content: userMsg });

    // Keep last 10 messages to avoid token overflow
    if (historyRef.current.length > 10) {
      historyRef.current = historyRef.current.slice(-10);
    }

    try {
      const systemPrompt = buildContextualSystemPrompt();
      const rawResponse = await geminiChat(historyRef.current, systemPrompt);

      // Try to parse as JSON (structured response)
      let assistantText = rawResponse;
      let proposedAction: ProposedAction | null = null;

      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.response) {
            assistantText = parsed.response;
          }
          if (parsed.proposedAction) {
            proposedAction = parsed.proposedAction;
          }
        } catch {
          // Not valid JSON, use raw text
          assistantText = rawResponse;
        }
      }

      // Add to history
      historyRef.current.push({ role: 'assistant', content: assistantText });

      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);

      if (proposedAction) {
        setMessages(prev => [
          ...prev,
          {
            role: 'action_proposal',
            actionId: `action_${Date.now()}`,
            typeAction: proposedAction!.typeAction,
            parametres: proposedAction!.parametres,
          }
        ]);
      } else {
        setShowSuggestions(true);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erreur Gemini inconnue';
      setGeminiError(errMsg);
      addAssistantMessage(`⚠️ Erreur IA : ${errMsg.includes('key') ? 'Clé API invalide.' : errMsg}`);
      setShowSuggestions(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    // Try local shortcuts first
    if (handleNavigationOrFormCompletion(userMsg)) return;

    await sendToGemini(userMsg);
  };

  const handleSelectSuggestion = async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    if (handleNavigationOrFormCompletion(text)) return;
    await sendToGemini(text);
  };

  const handleConfirmAction = async (actionId: string) => {
    const actionMsg = messages.find(m => m.actionId === actionId);
    if (!actionMsg) return;

    setMessages(prev => prev.filter(m => m.actionId !== actionId));

    await executeProposedAction({
      typeAction: actionMsg.typeAction!,
      parametres: actionMsg.parametres || {},
    });

    setShowSuggestions(true);
  };

  const handleRejectAction = (actionId: string) => {
    setMessages(prev => prev.filter(m => m.actionId !== actionId));
    addAssistantMessage('Action annulée. Comment puis-je vous aider autrement ?');
    setShowSuggestions(true);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        id="copilote-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 hover:scale-105 transition-all print:hidden"
        title="Copilote IA"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div
          id="copilote-drawer"
          className="fixed bottom-20 right-6 z-50 w-80 md:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[520px] overflow-hidden print:hidden text-xs"
        >
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Copilote Commercial IA</span>
                <span className="text-[9px] text-blue-400/70 flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  Gemini 2.5 Flash · SIRENE live
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
            {messages.map((m, idx) => {
              if (m.role === 'action_proposal') {
                const actionLabels: Record<string, string> = {
                  recherche_entreprise: '🔍 Recherche SIRENE',
                  inscrire_sequence: '📧 Inscrire dans une séquence',
                  envoyer_email: '✉️ Envoyer un email',
                  navigation: '🧭 Navigation',
                  ajouter_prospect: '📝 Ajouter un prospect',
                };
                return (
                  <div key={idx} className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl space-y-2 text-slate-300">
                    <div className="flex items-center gap-1.5 font-bold text-blue-400">
                      <AlertCircle className="h-4 w-4" />
                      Action proposée
                    </div>
                    <p className="text-[10px] leading-relaxed">
                      {actionLabels[m.typeAction!] || m.typeAction}
                      {m.parametres && Object.keys(m.parametres).length > 0 && (
                        <span className="text-slate-500 ml-1">
                          ({Object.entries(m.parametres).map(([k, v]) => `${k}: ${v}`).join(', ')})
                        </span>
                      )}
                    </p>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => handleRejectAction(m.actionId!)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[9px] font-medium text-slate-300"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleConfirmAction(m.actionId!)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[9px] font-bold text-white flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Confirmer
                      </button>
                    </div>
                  </div>
                );
              }

              const isBot = m.role === 'assistant';
              return (
                <div key={idx} className={`flex gap-2.5 ${isBot ? '' : 'flex-row-reverse'}`}>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs border ${
                    isBot ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-blue-600/10 border-blue-500/20 text-blue-400'
                  }`}>
                    {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl max-w-[78%] leading-relaxed whitespace-pre-wrap break-words ${
                    isBot ? 'bg-slate-900/50 border border-slate-800 text-slate-200' : 'bg-blue-600 text-white'
                  }`}>
                    {m.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2.5">
                <div className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-blue-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center gap-2 text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                  <span className="text-[10px]">Gemini analyse votre demande...</span>
                </div>
              </div>
            )}

            {/* Suggestion Bubbles */}
            {!loading && showSuggestions && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    id={`suggestion-${i}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(s.text)}
                    className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-950/20 text-slate-300 hover:text-white transition-all text-[10px] font-medium shadow-sm flex items-center gap-1.5"
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            {geminiError && (
              <div className="text-[9px] text-red-400 bg-red-950/20 border border-red-500/20 rounded-lg p-2">
                ⚠️ {geminiError}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              id="copilote-input"
              type="text"
              disabled={loading}
              placeholder={loading ? 'Gemini réfléchit...' : 'Écrivez votre commande...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-[11px]"
            />
            <button
              id="copilote-send-btn"
              type="submit"
              disabled={loading || !input.trim()}
              className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
