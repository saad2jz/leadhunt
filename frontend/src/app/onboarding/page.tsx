'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useModulesActifs } from '@/hooks/useModulesActifs';
import { 
  Building2, Users, Target, Database, Settings, ArrowLeft, ArrowRight, 
  CheckCircle2, AlertCircle, Search, Sparkles, Phone, Mail, FileText, Check 
} from 'lucide-react';

export default function OnboardingPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const modulesHook = useModulesActifs();

  // Rediriger si non connecté
  useEffect(() => {
    if (!session && !modulesHook.loading) {
      router.push('/login');
    }
  }, [session, modulesHook.loading, router]);

  // État de l'onboarding
  const [step, setStep] = useState(1);
  const [tailleEquipe, setTailleEquipe] = useState<'Seul' | '2-5' | '6+'>('Seul');
  const [crmActuel, setCrmActuel] = useState<'Aucun' | 'HubSpot' | 'Pipedrive' | 'Autre'>('Aucun');
  const [modeProspection, setModeProspection] = useState<'A distance' | 'Terrain' | 'Les deux'>('A distance');
  const [volumeProspects, setVolumeProspects] = useState(100);
  const [secteurs, setSecteurs] = useState<string[]>([]);
  const [planRecommande, setPlanRecommande] = useState<'starter' | 'pro' | 'business' | 'entreprise'>('starter');
  
  // Checklist réelle tirée de la BDD
  const [checklist, setChecklist] = useState({
    rechercheFaite: false,
    prospectsImportes: false,
    contactDecideurAjoute: false,
    campagneCreee: false,
  });

  // Widget recherche intégrée pour l'étape 3
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDept, setSearchDept] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  // Étape 4 choix d'automatisation
  const [activerSéquenceType, setActiverSéquenceType] = useState(true);
  const [preconfigurerCRM, setPreconfigurerCRM] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Charger l'état d'onboarding au démarrage et à chaque changement d'étape
  useEffect(() => {
    if (session) {
      fetchOnboardingState();
    }
  }, [session, step]);

  const fetchOnboardingState = async () => {
    try {
      const res = await fetch('/api/onboarding');
      if (res.ok) {
        const data = await res.json();
        if (data.onboarding) {
          setStep(data.onboarding.etapeActuelle || 1);
          const reponses = data.onboarding.reponsesDiagnostic || {};
          if (reponses.tailleEquipe) setTailleEquipe(reponses.tailleEquipe);
          if (reponses.crmActuel) setCrmActuel(reponses.crmActuel);
          if (reponses.modeProspection) setModeProspection(reponses.modeProspection);
          if (reponses.volumeProspects) setVolumeProspects(reponses.volumeProspects);
          if (reponses.secteurs) setSecteurs(reponses.secteurs);
          if (data.onboarding.planRecommande) setPlanRecommande(data.onboarding.planRecommande);
        }
        if (data.checklist) {
          setChecklist(data.checklist);
        }
      }
    } catch (err) {
      console.error("Erreur chargement onboarding:", err);
    }
  };

  // Enregistrer le diagnostic et passer à l'étape suivante
  const handleDiagnosticSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etapeActuelle: 2,
          reponsesDiagnostic: {
            tailleEquipe,
            crmActuel,
            modeProspection,
            volumeProspects,
            secteurs,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la sauvegarde.");
      } else {
        setStep(2);
      }
    } catch (err) {
      setError("Erreur de communication avec le serveur.");
    } finally {
      setLoading(false);
    }
  };

  // Choisir le plan et passer à l'étape suivante
  const handlePlanSelection = async (plan: 'starter' | 'pro' | 'business' | 'entreprise') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etapeActuelle: 3,
          planChoisi: plan,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la validation du plan.");
      } else {
        await updateSession(); // rafraîchir la session JWT
        setStep(3);
      }
    } catch (err) {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  // Lancer la recherche SIRENE depuis l'onboarding
  const handleSireneSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/entreprises/search?q=${encodeURIComponent(searchQuery)}&departement=${searchDept}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
        // Force refresh pour valider la première tâche "Faire sa recherche"
        fetchOnboardingState();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Importer les entreprises sélectionnées depuis l'onboarding
  const handleImport = async () => {
    if (selectedCompanies.length === 0) return;
    setImporting(true);
    try {
      const toImport = searchResults.filter(r => selectedCompanies.includes(r.siren));
      const res = await fetch('/api/prospects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: toImport }),
      });

      if (res.ok) {
        setSelectedCompanies([]);
        await fetchOnboardingState(); // rafraîchir la checklist
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  // Déclencher la création rapide d'une campagne de test (pour cocher la checklist)
  const handleCreateTestCampaign = async () => {
    try {
      // Simule la création d'une campagne
      const res = await fetch('/api/onboarding/creer-campagne-demo', { method: 'POST' });
      // Si la route demo n'existe pas, on peut juste appeler une route générique ou le faire via onboarding
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceCampagneCheck: true }) // géré ou mocké
      });
      // Pour forcer la checklist, on crée une campagne fictive en BDD ou on actualise
      fetchOnboardingState();
    } catch (err) {
      console.error(err);
    }
  };

  // Validation étape 3 (Checklist)
  const handleChecklistNext = () => {
    // On autorise à passer même si non terminé (onboarding souple)
    setStep(4);
  };

  // Configurer l'automatisation (étape 4)
  const handleAutomationSubmit = async () => {
    setLoading(true);
    try {
      // Si l'utilisateur choisit d'activer les séquences ou le CRM, on configure
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etapeActuelle: 5,
          configurationAutomatisation: {
            sequences: activerSéquenceType,
            crm: preconfigurerCRM && crmActuel !== 'Aucun',
          },
        }),
      });

      if (res.ok) {
        setStep(5);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Terminer l'onboarding et aller au tableau de bord
  const handleOnboardingComplete = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          termine: true,
        }),
      });

      if (res.ok) {
        await updateSession(); // actualiser les claims
        router.push('/'); // Redirige vers le dashboard d'accueil
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle tag de secteur
  const toggleSecteur = (sec: string) => {
    if (secteurs.includes(sec)) {
      setSecteurs(secteurs.filter(s => s !== sec));
    } else {
      setSecteurs([...secteurs, sec]);
    }
  };

  const listSecteurs = ['Technologie', 'Bâtiment / BTP', 'Conseil / Services', 'Santé', 'Industrie', 'Commerce', 'Finance', 'Autre'];

  if (modulesHook.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />

      {/* Barre de progression supérieure */}
      <div className="max-w-4xl w-full mx-auto z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-500" />
            <span className="font-bold text-lg">Prospect Intelligence</span>
          </div>
          <div className="text-sm font-semibold text-slate-400">
            Étape {step} sur 5
          </div>
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-12 border border-slate-800/30">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500" 
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* ÉTAPE 1 : DIAGNOSTIC */}
        {step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Créons votre stratégie de prospection</h1>
              <p className="mt-2 text-slate-400">Quelques questions rapides pour configurer l'outil selon vos besoins réels.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Question 1 */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <label className="text-base font-semibold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Taille de l'équipe commerciale
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Seul', '2-5', '6+'] as const).map(op => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setTailleEquipe(op)}
                      className={`py-3 rounded-xl font-semibold border text-sm transition-all ${
                        tailleEquipe === op 
                          ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                          : 'border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2 */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <label className="text-base font-semibold text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-500" />
                  CRM déjà utilisé aujourd'hui
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Aucun', 'HubSpot', 'Pipedrive', 'Autre'] as const).map(op => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setCrmActuel(op)}
                      className={`py-3 rounded-xl font-semibold border text-sm transition-all ${
                        crmActuel === op 
                          ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                          : 'border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3 */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <label className="text-base font-semibold text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Mode de prospection principal
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['A distance', 'Terrain', 'Les deux'] as const).map(op => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setModeProspection(op)}
                      className={`py-3 rounded-xl font-semibold border text-xs transition-all ${
                        modeProspection === op 
                          ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                          : 'border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 4 */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <label className="text-base font-semibold text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  Volume de prospects visé par mois
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="50"
                    max="5000"
                    step="50"
                    value={volumeProspects}
                    onChange={(e) => setVolumeProspects(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-sm font-semibold text-slate-300">
                    <span>50 / mois</span>
                    <span className="text-blue-400 text-lg font-bold">{volumeProspects} prospects</span>
                    <span>5000+ / mois</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Secteurs */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <label className="text-base font-semibold text-white">Secteurs cibles principaux</label>
              <div className="flex flex-wrap gap-2">
                {listSecteurs.map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => toggleSecteur(sec)}
                    className={`py-2 px-4 rounded-xl border text-sm font-medium transition-all ${
                      secteurs.includes(sec)
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleDiagnosticSubmit}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-600/10 transition-all"
              >
                Calculer la recommandation
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : STRATÉGIE ET RECOMMANDATION */}
        {step === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Notre recommandation stratégique</h1>
              <p className="mt-2 text-slate-400">Voici le plan et les modules optimisés par rapport à votre configuration.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Carte Plan Recommandé */}
              <div className="md:col-span-2 bg-slate-900/40 border-2 border-blue-500/50 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold uppercase px-3 py-1.5 rounded-bl-xl flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Conseillé
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-blue-400 tracking-wider">Plan d'action</span>
                  <h3 className="text-2xl font-bold text-white uppercase mt-1">Palier {planRecommande}</h3>
                  <p className="text-slate-400 text-sm mt-2">
                    Adapté pour {tailleEquipe === 'Seul' ? 'un commercial indépendant' : `une équipe de ${tailleEquipe}`} avec un volume mensuel de {volumeProspects} prospects.
                  </p>
                </div>

                <div className="border-t border-slate-800/80 pt-6 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Modules activés :</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Moteur SIRENE intégré
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      Pipeline de vente & Kanban
                    </div>
                    {planRecommande !== 'starter' && (
                      <>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          Scoring Fit & Timing
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          Séquences emails Resend
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          Synchronisation CRM
                        </div>
                      </>
                    )}
                    {['business', 'entreprise'].includes(planRecommande) && (
                      <>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          Enrichissement Waterfall
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          IA de Qualification
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Sélection alternative */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Ajuster le plan</h4>
                <div className="flex flex-col gap-2">
                  {(['starter', 'pro', 'business', 'entreprise'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlanRecommande(p)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium uppercase transition-all ${
                        planRecommande === p
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p}
                      {planRecommande === p && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white px-6 py-3.5 rounded-xl font-semibold transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
              <button
                type="button"
                onClick={() => handlePlanSelection(planRecommande)}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-600/10 transition-all"
              >
                Valider ce plan
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : MISE EN PLACE (CHECKLIST) */}
        {step === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Mise en place interactive</h1>
              <p className="mt-2 text-slate-400">Complétez ces tâches de configuration. Les statuts sont vérifiés en temps réel.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Checklist */}
              <div className="md:col-span-1 space-y-3">
                <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  checklist.rechercheFaite ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}>
                  <CheckCircle2 className={`h-5 w-5 shrink-0 mt-0.5 ${checklist.rechercheFaite ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <div>
                    <h4 className="font-semibold text-white text-sm">1. Recherche d'entreprise</h4>
                    <p className="text-xs text-slate-400 mt-1">Faites votre première recherche SIRENE.</p>
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  checklist.prospectsImportes ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}>
                  <CheckCircle2 className={`h-5 w-5 shrink-0 mt-0.5 ${checklist.prospectsImportes ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <div>
                    <h4 className="font-semibold text-white text-sm">2. Importation de prospects</h4>
                    <p className="text-xs text-slate-400 mt-1">Importez au moins 5 entreprises cibles.</p>
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  checklist.contactDecideurAjoute ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}>
                  <CheckCircle2 className={`h-5 w-5 shrink-0 mt-0.5 ${checklist.contactDecideurAjoute ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <div>
                    <h4 className="font-semibold text-white text-sm">3. Contact décideur rattaché</h4>
                    <p className="text-xs text-slate-400 mt-1">Ajoutez un décideur sur un prospect.</p>
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  checklist.campagneCreee ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-900/40 border-slate-800 text-slate-400'
                }`}>
                  <CheckCircle2 className={`h-5 w-5 shrink-0 mt-0.5 ${checklist.campagneCreee ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <div>
                    <h4 className="font-semibold text-white text-sm">4. Pipeline de campagne</h4>
                    <p className="text-xs text-slate-400 mt-1">Créez votre première séquence.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchOnboardingState}
                  className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/20 hover:bg-slate-900/40 text-xs font-semibold text-slate-400 hover:text-white transition-all"
                >
                  Actualiser les statuts
                </button>
              </div>

              {/* Module interactif (Recherche SIRENE intégrée) */}
              <div className="md:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Search className="h-5 w-5 text-blue-500" />
                    Tester le moteur de recherche
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Saisissez un nom d'entreprise ou secteur pour cocher la tâche 1 et 2.</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Google, Boulangerie, Paris..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Dept (Ex: 75)"
                    maxLength={3}
                    value={searchDept}
                    onChange={(e) => setSearchDept(e.target.value)}
                    className="w-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white text-center placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSireneSearch}
                    disabled={searching}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-xl font-semibold flex items-center justify-center text-sm disabled:opacity-50"
                  >
                    {searching ? 'Recherche...' : 'Rechercher'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {searchResults.map((company) => (
                      <div key={company.siren} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900/20 transition-all">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedCompanies.includes(company.siren)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCompanies([...selectedCompanies, company.siren]);
                              } else {
                                setSelectedCompanies(selectedCompanies.filter(id => id !== company.siren));
                              }
                            }}
                            className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0 h-4 w-4"
                          />
                          <div>
                            <h4 className="text-sm font-semibold text-white">{company.nom}</h4>
                            <p className="text-xs text-slate-500">{company.adresse} • SIREN {company.siren}</p>
                            <p className="text-xs text-slate-400 mt-1 font-medium">{company.formeJuridique} • Dirigeant: {company.dirigeantNom}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-slate-500">
                        {selectedCompanies.length} sélectionné(s)
                      </span>
                      <button
                        type="button"
                        onClick={handleImport}
                        disabled={selectedCompanies.length === 0 || importing}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        {importing ? 'Import...' : 'Importer en prospects'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white px-6 py-3.5 rounded-xl font-semibold transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
              <button
                type="button"
                onClick={handleChecklistNext}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-600/10 transition-all"
              >
                Continuer l'onboarding
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : AUTOMATISATION */}
        {step === 4 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Activer vos automatisations</h1>
              <p className="mt-2 text-slate-400">Préparez vos premiers modèles en un seul clic.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: Séquence email type */}
              <div 
                onClick={() => setActiverSéquenceType(!activerSéquenceType)}
                className={`cursor-pointer bg-slate-900/40 border rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all ${
                  activerSéquenceType ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-500">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="checkbox"
                    checked={activerSéquenceType}
                    onChange={() => {}} // géré par clic div
                    className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0 h-4 w-4"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Séquence email type</h3>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    Ajouter une séquence d'emails de relance type pré-remplie en français pour vos campagnes commerciales.
                  </p>
                </div>
              </div>

              {/* Option 2: Connexion CRM pré-sélectionnée */}
              {crmActuel !== 'Aucun' && (
                <div 
                  onClick={() => setPreconfigurerCRM(!preconfigurerCRM)}
                  className={`cursor-pointer bg-slate-900/40 border rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all ${
                    preconfigurerCRM ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-500">
                      <Settings className="h-5 w-5" />
                    </div>
                    <input
                      type="checkbox"
                      checked={preconfigurerCRM}
                      onChange={() => {}}
                      className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0 h-4 w-4"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Préconfigurer CRM ({crmActuel})</h3>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                      Préparer le connecteur d'intégration pour synchroniser automatiquement vos opportunités avec {crmActuel}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white px-6 py-3.5 rounded-xl font-semibold transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
              <button
                type="button"
                onClick={handleAutomationSubmit}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-600/10 transition-all"
              >
                Suivant
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 5 : OPTIMISATION & REDIRECTION */}
        {step === 5 && (
          <div className="space-y-8 text-center animate-fadeIn py-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 shadow-lg shadow-emerald-500/5 mb-6">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <h1 className="text-3xl font-extrabold text-white">Votre espace est prêt !</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Félicitations, l'onboarding et l'isolation de votre organisation ont été appliqués avec succès. Votre tableau de bord va s'optimiser au fur et à mesure de votre prospection.
              </p>
            </div>

            <div className="flex justify-center pt-8">
              <button
                type="button"
                onClick={handleOnboardingComplete}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Accéder au tableau de bord
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
