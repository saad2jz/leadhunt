'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  Cpu, Compass, Save, CheckCircle2, AlertTriangle, 
  HelpCircle, RefreshCw, Star, Settings, ChevronRight 
} from 'lucide-react';

export default function AutonomieSettingsPage() {
  const [params, setParams] = useState<any>({
    reponseAutonomeActive: false,
    bookingAutonomeActive: false,
    seuilConfianceMin: 85,
  });
  const [optimisations, setOptimisations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/autonomie');
      if (res.ok) {
        const data = await res.json();
        if (data.params) setParams(data.params);
        setOptimisations(data.optimisations || []);
      } else {
        setError('Impossible de charger les paramètres.');
      }
    } catch (e) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveParams = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/settings/autonomie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        setMessage('Paramètres d\'autonomie sauvegardés avec succès.');
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur de sauvegarde.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  const triggerCronOptimisation = async () => {
    try {
      const res = await fetch('/api/cron/optimisation');
      if (res.ok) {
        const data = await res.json();
        alert(`Cron d'optimisation exécuté ! Segments analysés : ${data.segmentsAnalyses}`);
        fetchData();
      }
    } catch (e) {
      alert("Erreur lors de l'exécution du cron d'optimisation.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Agent IA Autonome</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Autonomie & Optimisation</h1>
            <p className="text-slate-400 text-sm mt-1">
              Configurez le niveau d'autonomie accordé à vos agents IA et optimisez les coûts par lead de vos campagnes.
            </p>
          </div>

          {/* Feedback messages */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400">{message}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Colonne 1 : Paramètres autonomie */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white uppercase flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-blue-500" />
                  Paramètres de l'Agent Autonome
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Donnez le contrôle à l'IA pour traiter les prospects réactifs.</p>
              </div>

              {/* Warning box */}
              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-[11px] text-yellow-400 leading-relaxed">
                <AlertTriangle className="h-4.5 w-4.5 text-yellow-500 inline mr-1.5 shrink-0" />
                <span className="font-semibold">Attention :</span> Les réponses autonomes contournent la validation humaine.
                Assurez-vous que vos modèles de relance soient parfaitements testés.
              </div>

              <form onSubmit={handleSaveParams} className="space-y-6 text-xs">
                {/* Reponse Autonome */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-850">
                  <div className="space-y-0.5 pr-4">
                    <span className="font-bold text-white block">Réponse d'emails autonome</span>
                    <span className="text-[10px] text-slate-400 block">L'IA répond seule aux objections simples des prospects réactifs.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={params.reponseAutonomeActive}
                    onChange={(e) => setParams({ ...params, reponseAutonomeActive: e.target.checked })}
                    className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Booking Autonome */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-850">
                  <div className="space-y-0.5 pr-4">
                    <span className="font-bold text-white block">Prise de RDV automatique</span>
                    <span className="text-[10px] text-slate-400 block">L'IA insère directement votre lien de calendrier en cas de réponse positive.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={params.bookingAutonomeActive}
                    onChange={(e) => setParams({ ...params, bookingAutonomeActive: e.target.checked })}
                    className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Confidence threshold */}
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-300">Seuil de confiance minimal (IA)</span>
                    <span className="text-blue-400">{params.seuilConfianceMin}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={params.seuilConfianceMin}
                    onChange={(e) => setParams({ ...params, seuilConfianceMin: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    * En dessous de ce seuil de confiance de classification sémantique, l'agent autonome transfère immédiatement l'interaction à un commercial humain.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 disabled:opacity-50 transition-all"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Enregistrement...' : 'Sauvegarder les paramètres'}
                </button>
              </form>
            </div>

            {/* Colonne 2 : Optimisations */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-white uppercase flex items-center gap-2">
                    <Compass className="h-5 w-5 text-blue-500" />
                    Auto-optimisation des Campagnes
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Indicateurs de coûts réels par leads qualifiés (CPL) par segment.</p>
                </div>

                <button
                  type="button"
                  onClick={triggerCronOptimisation}
                  className="p-2 bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {optimisations.length === 0 ? (
                <div className="h-40 flex flex-col justify-center items-center text-slate-500 italic text-xs border border-slate-850 bg-slate-950 rounded-xl">
                  Aucun segment analysé.
                </div>
              ) : (
                <div className="divide-y divide-slate-850 text-xs">
                  {optimisations.map((opt) => (
                    <div key={opt.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">{opt.segment}</span>
                        <span className="text-[9px] text-slate-500 block">
                          Dernier calcul : {new Date(opt.derniereEvaluation).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-bold text-slate-200 block">{opt.coutParLead} €</span>
                          <span className="text-[9px] text-slate-500 block uppercase font-semibold">CPL Qualifié</span>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                          opt.statut === 'scaling'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : opt.statut === 'en_pause'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-slate-950 text-slate-400 border-slate-850'
                        }`}>
                          {opt.statut === 'scaling' ? '📈 Scaling' : opt.statut === 'en_pause' ? '⏸️ Suspendu' : '⚖️ En test'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
