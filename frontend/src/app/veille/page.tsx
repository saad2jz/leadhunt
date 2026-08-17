'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  Building, Play, Plus, RefreshCw, X, Save, Eye, Check,
  AlertCircle, HelpCircle, Star, Search, ShieldAlert 
} from 'lucide-react';

export default function VeillePage() {
  const [alertes, setAlertes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [codeNaf, setCodeNaf] = useState('');
  const [departement, setDepartement] = useState('');
  const [formeJuridique, setFormeJuridique] = useState('');
  const [frequence, setFrequence] = useState<'quotidienne' | 'hebdomadaire'>('quotidienne');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAlertes();
  }, []);

  const fetchAlertes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/veille');
      if (res.ok) {
        const data = await res.json();
        setAlertes(data.alertes || []);
      } else {
        setError('Impossible de charger les alertes de veille.');
      }
    } catch (e) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlerte = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/veille', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom,
          codeNaf: codeNaf || null,
          departement: departement || null,
          formeJuridique: formeJuridique || null,
          frequence,
        }),
      });

      if (res.ok) {
        setNom('');
        setCodeNaf('');
        setDepartement('');
        setFormeJuridique('');
        setShowForm(false);
        setMessage('Alerte de veille commerciale ajoutée avec succès.');
        fetchAlertes();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l\'enregistrement.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  const triggerCronVeille = async () => {
    try {
      const res = await fetch('/api/cron/veille');
      if (res.ok) {
        const data = await res.json();
        alert(`Cron exécuté ! Alertes traitées : ${data.alertesTraitees}, Nouvelles entreprises détectées : ${data.entreprisesDetectees}`);
        fetchAlertes();
      }
    } catch (e) {
      alert("Erreur d'exécution du cron.");
    }
  };

  const handleImportProspect = async (id: string) => {
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/veille/importer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setMessage('Entreprise importée avec succès dans votre base de prospects.');
        fetchAlertes();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l\'importation.');
      }
    } catch (e) {
      setError('Erreur réseau.');
    }
  };

  // Regroupe toutes les entreprises détectées pour toutes les alertes
  const allDetected = alertes.reduce((acc: any[], alerte: any) => {
    const list = alerte.entreprises.map((ent: any) => ({
      ...ent,
      alerteNom: alerte.nom,
    }));
    return [...acc, ...list];
  }, []);

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
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Sourcing & Veille</span>
              <h1 className="text-3xl font-extrabold text-white mt-1">Veille Commerciale SIRENE</h1>
              <p className="text-slate-400 text-sm mt-1">
                Monitorez les créations d'entreprises locales en temps réel et importez des leads ultra-récents.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={triggerCronVeille}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                Lancer la veille (Cron)
              </button>

              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Nouvelle alerte
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400">{message}</div>}

          {/* Configuration alertes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-blue-500" />
                  Vos Alertes Actives ({alertes.length})
                </h3>

                {alertes.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">Aucune alerte configurée.</p>
                ) : (
                  <div className="space-y-3">
                    {alertes.map((al) => (
                      <div key={al.id} className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white block">{al.nom}</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-bold uppercase">
                            {al.frequence}
                          </span>
                        </div>
                        <div className="space-y-1 text-slate-400 text-[10px]">
                          {al.codeNaf && <div>Code NAF: <span className="text-slate-200">{al.codeNaf}</span></div>}
                          {al.departement && <div>Dép: <span className="text-slate-200">{al.departement}</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Liste des détections */}
            <div className="md:col-span-2 p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <Building className="h-4.5 w-4.5 text-blue-500" />
                  Entreprises créées détectées
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Leads nés dans les 7 derniers jours correspondant à vos filtres.</p>
              </div>

              {allDetected.length === 0 ? (
                <div className="h-40 flex flex-col justify-center items-center text-slate-500 italic text-xs">
                  Aucune création d'entreprise détectée pour le moment.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/40 text-xs max-h-[60vh] overflow-y-auto pr-2">
                  {allDetected.map((ent: any) => (
                    <div key={ent.id} className="py-3.5 flex justify-between items-center gap-4">
                      <div>
                        <span className="font-bold text-white block text-sm">{ent.nom}</span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
                          <span>SIREN : {ent.siren}</span>
                          <span>•</span>
                          <span>Créé le : {new Date(ent.dateCreation).toLocaleDateString('fr-FR')}</span>
                          <span>•</span>
                          <span className="text-blue-400 font-semibold">{ent.alerteNom}</span>
                        </div>
                      </div>

                      <div>
                        {ent.statut === 'Importée' ? (
                          <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-850 text-slate-500 text-[10px] font-bold uppercase">
                            Importé
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleImportProspect(ent.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-bold text-white transition-all shrink-0"
                          >
                            Importer en prospect
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modale d'ajout */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Créer une alerte de veille</h3>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleAddAlerte} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Nom de l'alerte</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Startups BTP IdF"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 uppercase">Code NAF</label>
                      <input
                        type="text"
                        placeholder="Ex: 62.01Z"
                        value={codeNaf}
                        onChange={(e) => setCodeNaf(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 uppercase">Département</label>
                      <input
                        type="text"
                        placeholder="Ex: 75, 92"
                        value={departement}
                        onChange={(e) => setDepartement(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Fréquence de scan</label>
                    <select
                      value={frequence}
                      onChange={(e) => setFrequence(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white"
                    >
                      <option value="quotidienne">Quotidienne</option>
                      <option value="hebdomadaire">Hebdomadaire</option>
                    </select>
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
                      {saving ? 'Création...' : 'Créer'}
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
