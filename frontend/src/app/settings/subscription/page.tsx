'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useModulesActifs } from '@/hooks/useModulesActifs';
import { CreditCard, Check, Sparkles, Building2, HelpCircle, ArrowUpRight, BarChart3 } from 'lucide-react';

export default function SubscriptionPage() {
  const { plan, modules, estStarter, estPro, estBusiness, estEntreprise } = useModulesActifs();
  const [usages, setUsages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsages();
  }, []);

  const fetchUsages = async () => {
    try {
      const res = await fetch('/api/settings/subscription/usages');
      if (res.ok) {
        const data = await res.json();
        setUsages(data.usages || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pricingTiers = [
    {
      name: 'starter',
      price: '0€',
      description: 'Sourcing Sirene de base pour indépendants.',
      features: ['Recherche Sirene standard', 'Fiche prospect & contact', 'Pipeline Kanban simple', 'Export CSV', 'Registre Ne plus contacter'],
      active: estStarter,
      color: 'border-slate-800 bg-slate-900/20',
    },
    {
      name: 'pro',
      price: '49€',
      description: 'Prospection intelligente et CRM pour petites structures.',
      features: ['Tout Starter', 'Recherche Fit & Timing', 'Séquences emails Resend', 'Synchronisation CRM', 'Carte géographique des leads', 'Scoring automatique'],
      active: estPro,
      color: estPro ? 'border-blue-500/80 bg-blue-950/10 shadow-lg shadow-blue-500/5' : 'border-slate-800 bg-slate-900/20',
    },
    {
      name: 'business',
      price: '149€',
      description: 'Enrichissement waterfall, téléphonie et IA commerciale.',
      features: ['Tout Pro', 'Enrichissement Waterfall', 'Téléphonie clic-to-call', 'Délivrabilité & warming', 'Chatbot IA de capture', 'Intake & qualification leads', 'Générateur de devis'],
      active: estBusiness,
      color: estBusiness ? 'border-purple-500/80 bg-purple-950/10 shadow-lg shadow-purple-500/5' : 'border-slate-800 bg-slate-900/20',
    },
    {
      name: 'entreprise',
      price: '499€',
      description: ' SSO, quota dédié et agents IA entièrement autonomes.',
      features: ['Tout Business', 'SSO (Google/Microsoft)', 'Rôles & Territoires avancés', 'App mobile Expo', ' Marketplace de templates', 'Option clés API perso'],
      active: estEntreprise,
      color: estEntreprise ? 'border-indigo-500/80 bg-indigo-950/10 shadow-lg shadow-indigo-500/5' : 'border-slate-800 bg-slate-900/20',
    },
  ];

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Facturation & Quotas</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Mon abonnement</h1>
            <p className="text-slate-400 text-sm mt-1">
              Gérez votre plan tarifaire et suivez vos quotas de consommation d'API.
            </p>
          </div>

          {/* Section centrale : Consommation API */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Consommation de l'organisation
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Suivi de consommation mensuel réinitialisé au 1er du mois.
              </p>
            </div>

            {loading ? (
              <div className="h-16 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : usages.length === 0 ? (
              <div className="text-slate-400 text-xs py-4">Aucun appel d'API enregistré ce mois-ci.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {usages.map((usage) => (
                  <div key={usage.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300 uppercase">{usage.apiName.replace('_', ' ')}</span>
                      <span className="text-slate-500">Reset le {new Date(usage.resetAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-white">{usage.count}</span>
                      <span className="text-xs text-slate-500">/ {usage.limit || 'Illimité'}</span>
                    </div>
                    {usage.limit && (
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500"
                          style={{ width: `${Math.min((usage.count / usage.limit) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grille Tarifs */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Plans disponibles</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {pricingTiers.map((tier) => (
                <div 
                  key={tier.name}
                  className={`border rounded-2xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden transition-all duration-300 ${tier.color} ${
                    tier.active ? 'scale-[1.02]' : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  {tier.active && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-bl-xl flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Actif
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">{tier.name}</h4>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-extrabold text-white">{tier.price}</span>
                        {tier.price !== '0€' && <span className="text-xs text-slate-500">/ mois</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-2 min-h-[32px]">{tier.description}</p>
                    </div>

                    <ul className="space-y-2 text-xs border-t border-slate-800/80 pt-4">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {!tier.active ? (
                    <button
                      type="button"
                      onClick={() => alert('V1 Démo : Pour changer de plan, veuillez contacter le support commercial.')}
                      className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/40 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1"
                    >
                      Choisir ce plan
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  ) : (
                    <div className="w-full text-center py-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-xs font-bold text-blue-400">
                      Votre forfait actuel
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Commentaire de Stripe à venir */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-xs text-slate-500 leading-relaxed">
            * Note d'implémentation : L'intégration avec la passerelle Stripe pour gérer les abonnements récurrents réels, les factures et les modes de paiement sera déployée dans une prochaine itération de l'infrastructure de paiement. Le forfait est actuellement ajustable manuellement ou via contact commercial.
          </div>

        </div>
      </main>
    </div>
  );
}
