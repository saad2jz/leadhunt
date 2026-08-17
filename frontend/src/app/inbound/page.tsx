'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  Users, Plus, Trash2, ShieldAlert, Check, X, 
  Settings, Key, Link2, Compass, Play, Save 
} from 'lucide-react';

export default function InboundLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [commerciaux, setCommerciaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Routing Rule Form State
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleNom, setRuleNom] = useState('');
  const [ruleScoreMin, setRuleScoreMin] = useState<number>(50);
  const [ruleSecteur, setRuleSecteur] = useState('');
  const [ruleAssignee, setRuleAssignee] = useState('');
  const [savingRule, setSavingRule] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchRules();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/settings/autonomie'); // Contains leads lists or other variables, but wait: let's fetch leads directly
      // Let's create an API endpoint to list leads or we can retrieve leads inside settings autonomie
      // Wait, let's write a quick API route `/api/leads` to list leads!
      const resLeads = await fetch('/api/leads');
      if (resLeads.ok) {
        const data = await resLeads.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/routage');
      if (res.ok) {
        const data = await res.json();
        setRules(data.regles || []);
        setCommerciaux(data.commerciaux || []);
        if (data.commerciaux?.length > 0) {
          setRuleAssignee(data.commerciaux[0].id);
        }
      }
    } catch (e) {
      setError('Erreur lors du chargement des règles.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRule(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/settings/routage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: ruleNom,
          condition: JSON.stringify({
            scoreMin: ruleScoreMin,
            secteur: ruleSecteur || null,
          }),
          assigneAId: ruleAssignee,
          ordre: rules.length + 1,
        }),
      });

      if (res.ok) {
        setRuleNom('');
        setRuleSecteur('');
        setShowRuleForm(false);
        setMessage('Règle de routage ajoutée avec succès.');
        fetchRules();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l\'ajout.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Supprimer cette règle de routage ?')) return;
    try {
      const res = await fetch(`/api/settings/routage?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage('Règle supprimée.');
        fetchRules();
      }
    } catch (e) {
      setError('Erreur réseau.');
    }
  };

  const simulateLeadInbound = async () => {
    setError('');
    setMessage('');
    try {
      // Pour simuler, on a besoin de l'ID d'organisation
      const resOrg = await fetch('/api/settings/autonomie');
      if (!resOrg.ok) return;
      const dataOrg = await resOrg.json();
      const orgId = dataOrg.params?.organisationId;

      if (!orgId) {
        alert("Erreur d'organisation.");
        return;
      }

      const res = await fetch('/api/leads/capturer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationId: orgId,
          source: 'formulaire_site',
          nom: 'Marc Dupond',
          email: `marc.dupond.${Math.floor(Math.random() * 1000)}@batitech.fr`,
          telephone: '0677889900',
          entreprise: 'BatiTech SAS',
          reponsesFormulaire: JSON.stringify({ budget: '2000', secteur: 'BTP', urgence: 'immédiat' }),
        }),
      });

      if (res.ok) {
        const resData = await res.json();
        setMessage(`Lead simulé avec succès ! Assigné à : ${resData.assigneAId}, Score : ${resData.score}/100.`);
        fetchLeads();
      }
    } catch (e) {
      setError('Erreur réseau lors de la simulation.');
    }
  };

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Inbound & Distribution</span>
              <h1 className="text-3xl font-extrabold text-white mt-1">Intake & Routage Leads</h1>
              <p className="text-slate-400 text-sm mt-1">
                Monitorez les leads entrants et automatisez leur routage vers les bons commerciaux.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={simulateLeadInbound}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-350 flex items-center gap-1.5"
              >
                <Play className="h-4 w-4" />
                Simuler une capture (Inbound)
              </button>

              <button
                type="button"
                onClick={() => setShowRuleForm(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Nouvelle Règle
              </button>
            </div>
          </div>

          {/* Feedback banners */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400">{message}</div>}

          {/* Core panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Rules list Column 1 */}
            <div className="md:col-span-1 space-y-6">
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <Compass className="h-4.5 w-4.5 text-blue-500" />
                  Règles de Routage actives ({rules.length})
                </h3>

                {rules.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">Aucune règle active. Routage par défaut round-robin appliqué.</p>
                ) : (
                  <div className="space-y-3 text-xs">
                    {rules.map((rule, idx) => {
                      let cond: any = {};
                      try {
                        cond = JSON.parse(rule.condition || '{}');
                      } catch (e) {}

                      return (
                        <div key={rule.id} className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl space-y-2 relative">
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="absolute right-3 top-3 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <span className="font-bold text-white block truncate pr-6">{rule.nom}</span>
                          
                          <div className="space-y-1 text-slate-400 text-[10px] leading-relaxed">
                            {cond.scoreMin !== undefined && (
                              <div>Score qualif min : <span className="text-slate-200">{cond.scoreMin}/100</span></div>
                            )}
                            {cond.secteur && (
                              <div>Secteur cible : <span className="text-slate-200">{cond.secteur}</span></div>
                            )}
                            <div className="pt-1.5 border-t border-slate-900 mt-1.5 text-blue-400 font-bold">
                              Assigné à ID : {rule.assigneAId.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Inbound leads log Column 2-3 */}
            <div className="md:col-span-2 p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-blue-500" />
                  Flux des Leads Entrants Capturés
                </h3>
              </div>

              {leads.length === 0 ? (
                <div className="h-40 flex flex-col justify-center items-center text-slate-500 italic text-xs">
                  Aucun lead entrant n'a été capturé pour le moment.
                </div>
              ) : (
                <div className="divide-y divide-slate-850 text-xs overflow-y-auto max-h-[60vh] pr-2">
                  {leads.map((l) => (
                    <div key={l.id} className="py-3.5 flex justify-between items-center gap-4">
                      <div>
                        <span className="font-bold text-white block text-sm">{l.nom || 'Inconnu'}</span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
                          {l.entreprise && <span>Entreprise : {l.entreprise}</span>}
                          {l.entreprise && <span>•</span>}
                          <span>Source : <span className="text-blue-400 font-semibold uppercase">{l.source}</span></span>
                          <span>•</span>
                          <span>Créé le : {new Date(l.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                            l.scoreQualification >= 50
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}>
                            Qualif : {l.scoreQualification}/100
                          </span>
                          {l.assigneA && (
                            <span className="text-[9px] text-slate-500 block mt-0.5">
                              Agent: {l.assigneA.email.split('@')[0]}
                            </span>
                          )}
                        </div>

                        <span className="px-2 py-1 rounded bg-slate-950 border border-slate-850 text-slate-400 text-[10px] font-bold uppercase shrink-0">
                          {l.statutIntake}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add Rule Modal */}
          {showRuleForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Créer une Règle de Routage</h3>
                  <button onClick={() => setShowRuleForm(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleAddRule} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-350">Nom de la règle</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Routage Grands Comptes BTP"
                      value={ruleNom}
                      onChange={(e) => setRuleNom(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-350">Score Qualif Min</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={ruleScoreMin}
                        onChange={(e) => setRuleScoreMin(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-350">Secteur Cible</label>
                      <input
                        type="text"
                        placeholder="Ex: SaaS, BTP"
                        value={ruleSecteur}
                        onChange={(e) => setRuleSecteur(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-350">Assigner au Commercial</label>
                    <select
                      value={ruleAssignee}
                      onChange={(e) => setRuleAssignee(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white"
                    >
                      {commerciaux.map((c) => (
                        <option key={c.id} value={c.id}>{c.email}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRuleForm(false)}
                      className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={savingRule}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {savingRule ? 'Création...' : 'Créer'}
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
