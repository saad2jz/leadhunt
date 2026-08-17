'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useModulesActifs } from '@/hooks/useModulesActifs';
import { ShieldCheck, Building, Users, Calendar, Save, Settings, X, Plus, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const { estSuperAdmin, loading: loadingHook } = useModulesActifs();

  const [organisations, setOrganisations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Organisation en cours d'édition
  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editPlan, setEditPlan] = useState<'starter' | 'pro' | 'business' | 'entreprise'>('starter');
  const [editModules, setEditModules] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loadingHook && !estSuperAdmin) {
      router.push('/');
    } else if (estSuperAdmin) {
      fetchOrganisations();
    }
  }, [estSuperAdmin, loadingHook, router]);

  const fetchOrganisations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/organisations');
      if (res.ok) {
        const data = await res.json();
        setOrganisations(data.organisations || []);
      } else {
        setError('Erreur lors du chargement des organisations.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (org: any) => {
    setEditingOrg(org);
    setEditNom(org.nom);
    setEditPlan(org.plan);
    try {
      setEditModules(JSON.parse(org.modulesActifs || '[]'));
    } catch (e) {
      setEditModules([]);
    }
  };

  const handleToggleModule = (mod: string) => {
    if (editModules.includes(mod)) {
      setEditModules(editModules.filter(m => m !== mod));
    } else {
      setEditModules([...editModules, mod]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOrg.id,
          nom: editNom,
          plan: editPlan,
          modulesActifs: editModules,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Organisation enregistrée avec succès.');
        setEditingOrg(null);
        fetchOrganisations();
      } else {
        setError(data.error || 'Erreur lors de l\'enregistrement.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  const allModules = [
    'sirene', 'pipeline', 'dashboard', 'liste_noire',
    'recherche_intelligente', 'veille_commerciale', 'sequences_email', 
    'crm_externe', 'carte_geo', 'scoring_auto', 
    'enrichissement_waterfall', 'telephonie', 'delivrabilite', 
    'chatbot_ia_public', 'whatsapp', 'intake_leads', 'devis',
    'SSO', 'roles_avances', 'marketplace_templates', 'app_mobile', 'cles_perso'
  ];

  if (loadingHook || loading) {
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
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Console d'administration</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Gestion des Organisations (Tenants)</h1>
            <p className="text-slate-400 text-sm mt-1">
              Gérez les forfaits clients, activez ou désactivez des fonctionnalités et supervisez les comptes.
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-sm text-red-400">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-sm text-emerald-400">
              {message}
            </div>
          )}

          {/* Liste des organisations */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase">
                    <th className="py-4 px-6">Organisation</th>
                    <th className="py-4 px-6">Plan actuel</th>
                    <th className="py-4 px-6">Utilisateurs</th>
                    <th className="py-4 px-6">Créée le</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {organisations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-900/10">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Building className="h-5 w-5 text-slate-500" />
                          <div>
                            <span className="font-bold text-white block">{org.nom}</span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-xs">{org.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded ${
                          org.plan === 'starter' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                          org.plan === 'pro' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          org.plan === 'business' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {org.plan}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Users className="h-4 w-4 text-slate-500" />
                          {org.utilisateurs.length} membre(s)
                          <span className="text-slate-500">({org.utilisateurs[0]?.email || 'Aucun'})</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500">
                        {new Date(org.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(org)}
                          className="text-blue-400 hover:text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/20 transition-all"
                        >
                          Configurer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal d'édition */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Éditer l'organisation</h3>
                <span className="text-xs text-slate-500">{editingOrg.id}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingOrg(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Nom de l'organisation</label>
                  <input
                    type="text"
                    required
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Forfait (Plan)</label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value as any)}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="business">Business</option>
                    <option value="entreprise">Entreprise</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes de Modules Actifs */}
              <div className="space-y-2 border-t border-slate-800/80 pt-4">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Modules et Fonctionnalités Actifs</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {allModules.map(mod => (
                    <div 
                      key={mod}
                      onClick={() => handleToggleModule(mod)}
                      className={`cursor-pointer flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                        editModules.includes(mod)
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                          : 'border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="capitalize">{mod.replace(/_/g, ' ')}</span>
                      {editModules.includes(mod) && <Check className="h-3.5 w-3.5" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
                  className="px-4 py-2 border border-slate-800 rounded-lg hover:border-slate-700 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
