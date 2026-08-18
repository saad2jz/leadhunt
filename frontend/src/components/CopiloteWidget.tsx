'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, User, Check, AlertCircle } from 'lucide-react';

export default function CopiloteWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: "Bonjour ! Je suis votre copilote commercial IA. Je peux lancer des recherches SIRENE, inscrire des prospects à des campagnes, ou vérifier vos statistiques. Que puis-je faire pour vous ?" }
  ]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const SUGGESTIONS = [
    { label: 'Recherche SIRENE', icon: '🔍', text: 'Lancer une recherche SIRENE' },
    { label: 'Inscrire à une séquence', icon: '📋', text: 'Inscrire mes prospects à une séquence' },
    { label: 'Consulter mes statistiques', icon: '📊', text: 'Voir mes statistiques CRM' },
    { label: 'Envoyer des relances', icon: '✉️', text: 'Envoyer mes relances du jour' },
  ];

  const handleSelectSuggestion = async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    if (text === 'Lancer une recherche SIRENE') {
      setShowSuggestions(false);
    }

    try {
      const res = await fetch('/api/ia/copilote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversationId);
        if (data.messages) {
          setMessages(data.messages);
          const lastMsg = data.messages[data.messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content.includes('Quel secteur')) {
            setShowSuggestions(false);
          } else {
            setShowSuggestions(true);
          }
        }
        if (data.proposedAction) {
          setMessages(prev => [
            ...prev,
            {
              role: 'action_proposal',
              actionId: data.proposedAction.id,
              typeAction: data.proposedAction.typeAction,
              parametres: JSON.parse(data.proposedAction.parametres || '{}'),
            }
          ]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, je rencontre des difficultés." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Erreur de connexion." }]);
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
    setLoading(true);

    try {
      const res = await fetch('/api/ia/copilote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, conversationId }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversationId);
        
        // Remplace les messages par l'historique complet
        if (data.messages) {
          setMessages(data.messages);
          const lastMsg = data.messages[data.messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content.includes('Quel secteur')) {
            setShowSuggestions(false);
          } else {
            setShowSuggestions(true);
          }
        }

        // Si une action est proposée, on l'ajoute comme élément spécial
        if (data.proposedAction) {
          setMessages(prev => [
            ...prev,
            {
              role: 'action_proposal',
              actionId: data.proposedAction.id,
              typeAction: data.proposedAction.typeAction,
              parametres: JSON.parse(data.proposedAction.parametres || '{}'),
            }
          ]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, je rencontre des difficultés pour analyser votre requête." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Erreur de connexion réseau." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (actionId: string) => {
    setExecutingActionId(actionId);
    try {
      const res = await fetch('/api/ia/copilote/executer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });

      if (res.ok) {
        const data = await res.json();
        // Supprime la proposition d'action et affiche le résultat
        setMessages(prev => [
          ...prev.filter(m => m.actionId !== actionId),
          { role: 'assistant', content: `✅ **Action exécutée** : ${data.resultat}` }
        ]);
        setShowSuggestions(true);
      } else {
        alert("Erreur lors de l'exécution de l'action.");
      }
    } catch (e) {
      alert("Erreur réseau.");
    } finally {
      setExecutingActionId(null);
    }
  };

  return (
    <>
      {/* Bouton Flottant (Bottom-Right) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 hover:scale-105 transition-all print:hidden"
      >
        {isOpen ? <X className="h-5.5 w-5.5 animate-spin-once" /> : <Sparkles className="h-5.5 w-5.5" />}
      </button>

      {/* Drawer de Chat */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-80 md:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[500px] overflow-hidden print:hidden text-xs">
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Copilote Commercial IA</span>
                <span className="text-[9px] text-slate-500">Pilotage par langage naturel</span>
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
                return (
                  <div key={idx} className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl space-y-2 text-slate-300">
                    <div className="flex items-center gap-1.5 font-bold text-blue-400">
                      <AlertCircle className="h-4 w-4" />
                      Validation requise
                    </div>
                    <p className="text-[10px] leading-relaxed">
                      L'IA propose d'exécuter : **{m.typeAction}** avec les paramètres {JSON.stringify(m.parametres)}.
                    </p>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => handleConfirmAction(m.actionId)}
                        disabled={executingActionId === m.actionId}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[9px] font-bold text-white flex items-center gap-1 disabled:opacity-50"
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

                  <div className={`p-3 rounded-2xl max-w-[75%] leading-relaxed whitespace-pre-wrap ${
                    isBot ? 'bg-slate-900/50 border border-slate-850 text-slate-200' : 'bg-blue-600 text-white'
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
                <div className="p-3 bg-slate-900/50 border border-slate-850 rounded-2xl flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce delay-75" />
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce delay-150" />
                </div>
              </div>
            {!loading && showSuggestions && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSuggestion(s.text)}
                    className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-blue-950/20 text-slate-300 hover:text-white transition-all text-[10px] font-medium shadow-sm flex items-center gap-1.5 text-left"
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              required
              disabled={loading}
              placeholder="Écrivez votre commande..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-850 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white shrink-0 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
