'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  Plus, Trash2, Mail, Save, Layers, Play, Settings, 
  X, Check, ChevronRight, FileText, ArrowRight 
} from 'lucide-react';

export default function SequencesSettingsPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'sequences'>('sequences');
  const [templates, setTemplates] = useState<any[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Form State: Template
  const [showTplForm, setShowTplForm] = useState(false);
  const [tplNom, setTplNom] = useState('');
  const [tplObjet, setTplObjet] = useState('');
  const [tplCorps, setTplCorps] = useState('');
  const [savingTpl, setSavingTpl] = useState(false);

  // Form State: Sequence
  const [showSeqForm, setShowSeqForm] = useState(false);
  const [seqNom, setSeqNom] = useState('');
  const [seqEtapes, setSeqEtapes] = useState<any[]>([]);
  const [savingSeq, setSavingSeq] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTpl, resSeq] = await Promise.all([
        fetch('/api/settings/templates'),
        fetch('/api/settings/sequences'),
      ]);

      if (resTpl.ok && resSeq.ok) {
        const dataTpl = await resTpl.json();
        const dataSeq = await resSeq.json();
        setTemplates(dataTpl.templates || []);
        setSequences(dataSeq.sequences || []);
      } else {
        setError('Erreur lors du chargement des données.');
      }
    } catch (e) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTpl(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/settings/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: tplNom,
          objet: tplObjet,
          corps: tplCorps,
        }),
      });

      if (res.ok) {
        setTplNom('');
        setTplObjet('');
        setTplCorps('');
        setShowTplForm(false);
        setMessage('Modèle d\'email créé avec succès.');
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la création du modèle.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setSavingTpl(false);
    }
  };

  const handleAddStepToForm = () => {
    if (templates.length === 0) {
      alert("Veuillez créer au moins un modèle d'email avant de configurer une séquence.");
      return;
    }
    setSeqEtapes([
      ...seqEtapes,
      {
        ordre: seqEtapes.length,
        delaiJours: seqEtapes.length === 0 ? 0 : 3, // immédiat par défaut pour étape 1, puis 3 jours
        templateId: templates[0]?.id || '',
        condition: 'toujours',
      }
    ]);
  };

  const handleRemoveStepFromForm = (index: number) => {
    const updated = seqEtapes.filter((_, idx) => idx !== index).map((step, idx) => ({
      ...step,
      ordre: idx
    }));
    setSeqEtapes(updated);
  };

  const handleUpdateStepInForm = (index: number, field: string, val: any) => {
    const updated = [...seqEtapes];
    updated[index] = { ...updated[index], [field]: val };
    setSeqEtapes(updated);
  };

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seqEtapes.length === 0) {
      alert("Ajoutez au moins une étape à la séquence.");
      return;
    }

    setSavingSeq(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/settings/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: seqNom,
          etapes: seqEtapes,
        }),
      });

      if (res.ok) {
        setSeqNom('');
        setSeqEtapes([]);
        setShowSeqForm(false);
        setMessage('Séquence d\'outreach créée avec succès.');
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la création de la séquence.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setSavingSeq(false);
    }
  };

  const triggerCronSequences = async () => {
    try {
      const res = await fetch('/api/cron/sequences');
      if (res.ok) {
        const data = await res.json();
        alert(`Cron exécuté ! Prospects traités: ${data.processed}, Emails envoyés: ${data.emailsSent}, Séquences stoppées: ${data.sequencesStopped}`);
        fetchData();
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
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Outreach & Séquences</span>
              <h1 className="text-3xl font-extrabold text-white mt-1">Modèles & Séquences d'Emails</h1>
              <p className="text-slate-400 text-sm mt-1">
                Concevez des modèles d'emails de prospection et automatisez des relances multi-étapes intelligentes.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={triggerCronSequences}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <Play className="h-4 w-4" />
                Déclencher envoi (Cron)
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'templates') {
                    setShowTplForm(true);
                  } else {
                    setShowSeqForm(true);
                  }
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                {activeTab === 'templates' ? 'Nouveau modèle' : 'Nouvelle séquence'}
              </button>
            </div>
          </div>

          {/* Feedback banners */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400">{message}</div>}

          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('sequences')}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-semibold transition-all ${
                activeTab === 'sequences' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-4 w-4" />
              Séquences de relances ({sequences.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-semibold transition-all ${
                activeTab === 'templates' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="h-4 w-4" />
              Modèles d'emails ({templates.length})
            </button>
          </div>

          {/* Tab Content: Séquences */}
          {activeTab === 'sequences' && (
            <div className="space-y-6">
              {sequences.length === 0 ? (
                <div className="h-40 flex flex-col justify-center items-center rounded-2xl border border-slate-800 bg-slate-900/20 text-slate-400 italic">
                  Aucune séquence configurée.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {sequences.map((seq) => (
                    <div key={seq.id} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-white text-lg">{seq.nom}</h3>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase">
                          Actif
                        </span>
                      </div>

                      {/* Séquence steps visual */}
                      <div className="flex items-center gap-4 overflow-x-auto py-2">
                        {seq.etapes.map((et: any, idx: number) => (
                          <React.Fragment key={et.id}>
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-1.5 shrink-0 min-w-[150px]">
                              <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                                <span>Étape {idx + 1}</span>
                                <span>+{et.delaiJours} jours</span>
                              </div>
                              <span className="text-xs font-semibold text-white block truncate">{et.template.nom}</span>
                              <span className="text-[9px] text-slate-400 block truncate">
                                Condition : {et.condition === 'si_pas_de_reponse' ? 'Si pas rép.' : 'Toujours'}
                              </span>
                            </div>
                            {idx < seq.etapes.length - 1 && (
                              <ArrowRight className="h-4 w-4 text-slate-600 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Templates */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.length === 0 ? (
                <div className="col-span-2 h-40 flex flex-col justify-center items-center rounded-2xl border border-slate-800 bg-slate-900/20 text-slate-400 italic">
                  Aucun modèle d'email configuré.
                </div>
              ) : (
                templates.map((tpl) => (
                  <div key={tpl.id} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-base">{tpl.nom}</h4>
                        <span className="text-xs text-slate-500">Objet: {tpl.objet}</span>
                      </div>
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-850 font-mono text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                      {tpl.corps}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Modale de création: Modèle d'email */}
          {showTplForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
              <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Créer un modèle d'email</h3>
                  <button onClick={() => setShowTplForm(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateTemplate} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Nom du modèle</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Premier contact - Accroche BTP"
                      value={tplNom}
                      onChange={(e) => setTplNom(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Objet du mail</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Optimisation de votre facturation BTP"
                      value={tplObjet}
                      onChange={(e) => setTplObjet(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Corps de l'email</label>
                    <textarea
                      required
                      placeholder="Bonjour [Nom], ..."
                      value={tplCorps}
                      onChange={(e) => setTplCorps(e.target.value)}
                      className="w-full h-32 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowTplForm(false)}
                      className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={savingTpl}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {savingTpl ? 'Création...' : 'Créer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modale de création: Séquence */}
          {showSeqForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
              <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Créer une séquence automatisée</h3>
                  <button onClick={() => setShowSeqForm(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateSequence} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Nom de la séquence</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Campagne Outreach - ESN Automne"
                      value={seqNom}
                      onChange={(e) => setSeqNom(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Étapes list builder */}
                  <div className="space-y-4 border-t border-slate-800/80 pt-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-300 uppercase">Configuration des étapes ({seqEtapes.length})</label>
                      <button
                        type="button"
                        onClick={handleAddStepToForm}
                        className="px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter étape
                      </button>
                    </div>

                    <div className="space-y-3">
                      {seqEtapes.map((step, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                          <span className="font-bold text-xs text-blue-400 shrink-0">Étape {idx + 1}</span>

                          <div className="grid grid-cols-3 gap-3 w-full md:w-auto flex-1">
                            {/* Template selector */}
                            <div className="space-y-1 col-span-2 md:col-span-1">
                              <select
                                value={step.templateId}
                                onChange={(e) => handleUpdateStepInForm(idx, 'templateId', e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                              >
                                {templates.map(tpl => (
                                  <option key={tpl.id} value={tpl.id}>{tpl.nom}</option>
                                ))}
                              </select>
                            </div>

                            {/* Delay */}
                            <div className="space-y-1">
                              <input
                                type="number"
                                required
                                min="0"
                                placeholder="Délai (jours)"
                                value={step.delaiJours}
                                onChange={(e) => handleUpdateStepInForm(idx, 'delaiJours', Number(e.target.value))}
                                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                              />
                            </div>

                            {/* Condition */}
                            <div className="space-y-1">
                              <select
                                value={step.condition}
                                onChange={(e) => handleUpdateStepInForm(idx, 'condition', e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                              >
                                <option value="toujours">Toujours</option>
                                <option value="si_pas_de_reponse">Si pas rép.</option>
                              </select>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveStepFromForm(idx)}
                            className="text-red-400 hover:text-red-300 p-1.5 border border-red-500/10 bg-red-950/10 rounded-lg shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-800/80 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSeqForm(false)}
                      className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={savingSeq}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {savingSeq ? 'Sauvegarde...' : 'Enregistrer'}
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
