'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  Calendar, User, AlertCircle, Phone, Mail, Kanban, 
  Check, Save, Clock, HelpCircle, X, ChevronRight 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RelancesPage() {
  const router = useRouter();
  const [relances, setRelances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Modale de log rapide
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [reportNotes, setReportNotes] = useState('');
  const [interType, setInterType] = useState<'Appel' | 'Email' | 'LinkedIn' | 'RDV'>('Appel');
  const [interResult, setInterResult] = useState('Répondu');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRelances();
  }, []);

  const fetchRelances = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campagnes/relance/du-jour');
      if (res.ok) {
        const data = await res.json();
        setRelances(data.relances || []);
      } else {
        setError('Impossible de charger les relances.');
      }
    } catch (e) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleActionRelance = async (action: 'demain' | '3_jours' | 'semaine' | 'fait') => {
    if (!activeTask) return;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      // 1. Log l'interaction si un compte rendu est rédigé
      if (reportNotes.trim()) {
        await fetch('/api/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospectId: activeTask.prospectId,
            type: interType,
            resultat: interResult,
            notes: reportNotes,
          }),
        });
      }

      // 2. Détermine la nouvelle date de relance
      let newDate: Date | null = null;
      if (action !== 'fait') {
        newDate = new Date();
        if (action === 'demain') newDate.setDate(newDate.getDate() + 1);
        else if (action === '3_jours') newDate.setDate(newDate.getDate() + 3);
        else if (action === 'semaine') newDate.setDate(newDate.getDate() + 7);
      }

      // 3. Met à jour la tâche de relance en base
      const res = await fetch('/api/campagnes/relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectCampagneId: activeTask.id,
          relanceProgrammee: newDate ? newDate.toISOString() : null,
          notes: reportNotes || activeTask.notes,
        }),
      });

      if (res.ok) {
        setReportNotes('');
        setActiveTask(null);
        setMessage("Rappel mis à jour avec succès.");
        fetchRelances();
      } else {
        setError("Erreur lors de la mise à jour de la relance.");
      }
    } catch (err) {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
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
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Tâches quotidiennes</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Mes Relances du Jour</h1>
            <p className="text-slate-400 text-sm mt-1">
              Traitez vos relances prioritaires programmées pour aujourd'hui ou en retard.
            </p>
          </div>

          {/* Feedbacks */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400">{message}</div>}

          {/* Liste des relances */}
          {relances.length === 0 ? (
            <div className="h-60 flex flex-col justify-center items-center rounded-2xl border border-slate-800 bg-slate-900/20 text-slate-400 space-y-3">
              <Check className="h-10 w-10 text-emerald-500" />
              <div className="text-center">
                <span className="block font-bold text-slate-300">Félicitations !</span>
                <span className="text-xs text-slate-500">Toutes vos relances du jour sont à jour.</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-850">
                {relances.map((rel) => {
                  const delayDays = Math.floor((new Date().getTime() - new Date(rel.relanceProgrammee).getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = delayDays > 0;

                  return (
                    <div 
                      key={rel.id} 
                      className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-slate-900/10 transition-all cursor-pointer group"
                      onClick={() => setActiveTask(rel)}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-white text-base group-hover:text-blue-400 transition-colors">
                            {rel.prospect.nom}
                          </span>
                          
                          {/* Overdue Badge */}
                          {isOverdue ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold uppercase flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              En retard de {delayDays} jour{delayDays > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold uppercase">
                              Aujourd'hui
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex gap-4 items-center text-xs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-300">
                            <Kanban className="h-3.5 w-3.5 text-blue-500" />
                            {rel.campagne.nom} • {rel.etape.nom}
                          </span>
                          {rel.prospect.contacts?.[0] && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-slate-500" />
                              {rel.prospect.contacts[0].nom} ({rel.prospect.contacts[0].fonction})
                            </span>
                          )}
                        </div>

                        {rel.notes && (
                          <p className="text-xs text-slate-500 italic max-w-2xl bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                            Note de rappel : "{rel.notes}"
                          </p>
                        )}
                      </div>

                      {/* Action trigger button */}
                      <button
                        type="button"
                        className="px-4 py-2 border border-slate-800 group-hover:border-slate-700 bg-slate-950 text-xs font-semibold text-slate-300 group-hover:text-white rounded-lg flex items-center gap-1.5 shrink-0 transition-all"
                      >
                        Traiter
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modale de traitement relance */}
          {activeTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
              <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-lg">Traiter la relance : {activeTask.prospect.nom}</h3>
                    <span className="text-xs text-slate-500">Pipeline : {activeTask.campagne.nom} • {activeTask.etape.nom}</span>
                  </div>
                  <button onClick={() => setActiveTask(null)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Direct info contacts */}
                {activeTask.prospect.contacts?.[0] && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 space-y-2 text-xs">
                    <div className="font-semibold text-slate-300 flex items-center gap-1">
                      <User className="h-4 w-4 text-blue-500" />
                      {activeTask.prospect.contacts[0].nom} ({activeTask.prospect.contacts[0].fonction})
                    </div>
                    <div className="flex items-center gap-4 text-slate-400 flex-wrap">
                      {activeTask.prospect.contacts[0].telephone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {activeTask.prospect.contacts[0].telephone}
                        </span>
                      )}
                      {activeTask.prospect.contacts[0].email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {activeTask.prospect.contacts[0].email}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Formulaire log rapide */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Canal de contact</label>
                      <select
                        value={interType}
                        onChange={(e) => setInterType(e.target.value as any)}
                        className="w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-1.5 text-xs text-white"
                      >
                        <option value="Appel">Appel</option>
                        <option value="Email">Email</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="RDV">RDV</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Résultat de l'échange</label>
                      <input
                        type="text"
                        value={interResult}
                        placeholder="Ex: Répondu, N'a pas répondu..."
                        onChange={(e) => setInterResult(e.target.value)}
                        className="w-full rounded-lg border border-slate-850 bg-slate-950 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Notes du compte rendu</label>
                    <textarea
                      value={reportNotes}
                      placeholder="Indiquez le résumé de l'appel pour l'historique..."
                      onChange={(e) => setReportNotes(e.target.value)}
                      className="w-full h-20 rounded-lg border border-slate-850 bg-slate-950 px-3 py-1.5 text-xs text-white resize-none"
                    />
                  </div>
                </div>

                {/* Quick actions buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Actions & Prochaine étape</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleActionRelance('demain')}
                      className="py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950 text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      Demain
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleActionRelance('3_jours')}
                      className="py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950 text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      Dans 3 jours
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleActionRelance('semaine')}
                      className="py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950 text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      Dans 1 semaine
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleActionRelance('fait')}
                      className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                    >
                      Clore / Fait
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
