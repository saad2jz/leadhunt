'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  CreditCard, Save, RefreshCw, Layers, ShieldCheck, Check, 
  Settings, Key, Link2, HelpCircle, Activity 
} from 'lucide-react';

export default function IntegrationsSettingsPage() {
  const [fournisseur, setFournisseur] = useState<'hubspot' | 'pipedrive' | 'webhook'>('hubspot');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [actif, setActif] = useState(true);

  // Field Mapping State
  const [mapping, setMapping] = useState<any>({
    nom: 'name',
    telephone: 'phone',
    email: 'email',
    ville: 'city',
    secteur: 'industry',
  });

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fournisseur]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/integrations');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        
        // Trouve les paramètres existants pour ce fournisseur
        const existing = data.connexions?.find((c: any) => c.fournisseur === fournisseur);
        if (existing) {
          setApiKey(existing.apiKey || '');
          setBaseUrl(existing.baseUrl || '');
          setActif(existing.actif);
          try {
            setMapping(JSON.parse(existing.mappingChamps));
          } catch (e) {
            console.error(e);
          }
        } else {
          // Defaults if new
          setApiKey('');
          setBaseUrl('');
          setActif(true);
          if (fournisseur === 'hubspot') {
            setMapping({ nom: 'name', telephone: 'phone', email: 'email', ville: 'city', secteur: 'industry' });
          } else if (fournisseur === 'pipedrive') {
            setMapping({ nom: 'name', telephone: 'phone', email: 'email', ville: 'address_subpremise', secteur: 'industry' });
          } else {
            setMapping({ nom: 'nom', telephone: 'telephone', email: 'email', ville: 'ville', secteur: 'secteur' });
          }
        }
      } else {
        setError('Impossible de charger les configurations.');
      }
    } catch (e) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fournisseur,
          apiKey: apiKey || null,
          baseUrl: baseUrl || null,
          mappingChamps: JSON.stringify(mapping),
          actif,
        }),
      });

      if (res.ok) {
        setMessage(`Configuration ${fournisseur.toUpperCase()} enregistrée avec succès.`);
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

  const handleMappingChange = (localField: string, crmValue: string) => {
    setMapping({
      ...mapping,
      [localField]: crmValue,
    });
  };

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Intégrations Externes</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Connexions CRM</h1>
            <p className="text-slate-400 text-sm mt-1">
              Synchronisez automatiquement ou manuellement vos prospects qualifiés vers vos CRM commerciaux de production.
            </p>
          </div>

          {/* Feedback messages */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400">{message}</div>}

          {/* Tabs */}
          <div className="flex border-b border-slate-800 gap-6 text-xs font-bold uppercase tracking-wider pb-px">
            <button
              onClick={() => setFournisseur('hubspot')}
              className={`pb-3 transition-colors ${fournisseur === 'hubspot' ? 'border-b-2 border-blue-500 text-white font-extrabold' : 'text-slate-500 hover:text-slate-350'}`}
            >
              HubSpot
            </button>
            <button
              onClick={() => setFournisseur('pipedrive')}
              className={`pb-3 transition-colors ${fournisseur === 'pipedrive' ? 'border-b-2 border-blue-500 text-white font-extrabold' : 'text-slate-500 hover:text-slate-350'}`}
            >
              Pipedrive
            </button>
            <button
              onClick={() => setFournisseur('webhook')}
              className={`pb-3 transition-colors ${fournisseur === 'webhook' ? 'border-b-2 border-blue-500 text-white font-extrabold' : 'text-slate-500 hover:text-slate-350'}`}
            >
              Webhook Générique
            </button>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <Settings className="h-4.5 w-4.5 text-blue-500" />
                  Configuration {fournisseur.toUpperCase()}
                </h3>
              </div>

              <form onSubmit={handleSave} className="space-y-5 text-xs">
                {fournisseur !== 'webhook' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Key className="h-3.5 w-3.5" />
                      Clé d'API Privée ({fournisseur === 'hubspot' ? 'Private App Token' : 'API Token'})
                    </label>
                    <input
                      type="password"
                      placeholder="Ex: pat-eu1-xxxxxxx ou token..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Link2 className="h-3.5 w-3.5" />
                      URL du Webhook cible
                    </label>
                    <input
                      type="url"
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Mapping de champs */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-850 pb-2">
                    Mapping de champs (Prospect local → CRM cible)
                  </span>

                  <div className="space-y-2">
                    {Object.keys(mapping).map((localKey) => (
                      <div key={localKey} className="grid grid-cols-2 gap-4 items-center">
                        <span className="font-semibold text-slate-400">{localKey}</span>
                        <input
                          type="text"
                          required
                          value={mapping[localKey]}
                          onChange={(e) => handleMappingChange(localKey, e.target.value)}
                          className="rounded-lg border border-slate-850 bg-slate-950 px-2.5 py-1 text-slate-200"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-850">
                  <div className="space-y-0.5">
                    <span className="font-bold text-white block">Activer la synchronisation</span>
                    <span className="text-[10px] text-slate-400 block">Autorise les pushs sur ce connecteur.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={actif}
                    onChange={(e) => setActif(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 transition-all disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Enregistrement...' : 'Sauvegarder les paramètres'}
                </button>
              </form>
            </div>

            {/* Sync History Logs */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-blue-500" />
                  Historique de Synchronisation (20 derniers)
                </h3>
              </div>

              {logs.length === 0 ? (
                <div className="h-40 flex flex-col justify-center items-center text-slate-500 italic text-xs border border-slate-850 bg-slate-950 rounded-xl">
                  Aucun log de synchronisation.
                </div>
              ) : (
                <div className="divide-y divide-slate-850 text-xs overflow-y-auto max-h-[60vh] pr-2">
                  {logs.map((log) => (
                    <div key={log.id} className="py-3 flex justify-between items-start gap-4">
                      <div>
                        <span className="font-bold text-white block truncate">{log.prospect?.nom || 'Prospect Supprimé'}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{log.message}</span>
                        <span className="text-[9px] text-slate-500 block mt-0.5">
                          {new Date(log.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 border ${
                        log.statut === 'succès'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {log.statut}
                      </span>
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
