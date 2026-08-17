'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  Building, ShieldCheck, Play, Plus, RefreshCw, X, Save, 
  HelpCircle, CheckCircle2, AlertTriangle, ArrowRight, Settings 
} from 'lucide-react';

export default function OutreachSettingsPage() {
  const [boites, setBoites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBoites();
  }, []);

  const fetchBoites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/outreach');
      if (res.ok) {
        const data = await res.json();
        setBoites(data.boites || []);
      } else {
        setError('Erreur lors du chargement des boîtes.');
      }
    } catch (e) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/settings/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adresseEmail: email }),
      });

      if (res.ok) {
        setEmail('');
        setShowForm(false);
        setMessage('Boîte mail d\'outreach ajoutée avec succès.');
        fetchBoites();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l\'ajout.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  const triggerCronWarming = async () => {
    try {
      const res = await fetch('/api/cron/warming');
      if (res.ok) {
        const data = await res.json();
        alert(`Cron exécuté ! Boîtes en chauffe traitées : ${data.processed}, Mises à jour : ${data.updated}`);
        fetchBoites();
      }
    } catch (e) {
      alert("Erreur d'exécution du cron.");
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
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Délivrabilité & SPF</span>
              <h1 className="text-3xl font-extrabold text-white mt-1">Chauffage de Domaines (Domain Warming)</h1>
              <p className="text-slate-400 text-sm mt-1">
                Gérez vos boîtes mail outreach dédiées et monitorez leur réputation pour éviter les filtres anti-spams.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={triggerCronWarming}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                Simuler un jour de chauffe (Cron)
              </button>

              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Ajouter une boîte mail
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400">{message}</div>}

          {/* Liste des boîtes */}
          {boites.length === 0 ? (
            <div className="h-60 flex flex-col justify-center items-center rounded-2xl border border-slate-800 bg-slate-900/20 text-slate-400 space-y-3">
              <ShieldCheck className="h-10 w-10 text-slate-600" />
              <div className="text-center">
                <span className="block font-bold text-slate-300">Aucune boîte outreach configurée</span>
                <span className="text-xs text-slate-500">Ajoutez une boîte d'envoi secondaire pour chauffer sa réputation DNS.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {boites.map((boite) => (
                <div key={boite.id} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Profil boîte */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Adresse Outreach</span>
                      <span className="font-bold text-white text-base block">{boite.adresseEmail}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">Domaine : {boite.domaine}</span>
                    </div>

                    <div className="flex gap-2">
                      <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase border ${
                        boite.statutChauffage === 'pret' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : boite.statutChauffage === 'en_pause'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {boite.statutChauffage === 'pret' ? 'Prête' : boite.statutChauffage === 'en_pause' ? 'Suspendue' : 'En chauffe'}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-850 text-[9px] font-bold text-slate-400 uppercase">
                        Score Réputation : {boite.scoreReputation}%
                      </span>
                    </div>
                  </div>

                  {/* Volume Chauffage */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Progression du Warm-up</span>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">Volume quotidien</span>
                        <span className="text-white">{boite.volumeJournalierActuel} / {boite.volumeJournalierMax} mails</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min((boite.volumeJournalierActuel / boite.volumeJournalierMax) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      * Le volume quotidien maximal augmente automatiquement chaque jour de chauffage (+2 emails/jour) jusqu'à un plafond stable de 50 emails/jour.
                    </p>
                  </div>

                  {/* DNS Checklist */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Sécurisation DNS (SPF/DKIM/DMARC)</span>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 rounded bg-slate-950/40 border border-slate-850">
                        <span className="font-semibold text-slate-300">SPF Record (TXT)</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Validé
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-slate-950/40 border border-slate-850">
                        <span className="font-semibold text-slate-300">DKIM Key (TXT)</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Validé
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-slate-950/40 border border-slate-850">
                        <span className="font-semibold text-slate-300">DMARC Policy (TXT)</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Validé
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* Modale d'ajout */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Ajouter une boîte mail</h3>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleAddMailbox} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Adresse Email outreach dédiée</label>
                    <input
                      type="email"
                      required
                      placeholder="Ex: hello@outreach-mon-entreprise.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Ajout...' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
