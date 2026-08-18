'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  Building, Sparkles, BarChart2, Users, FileText, Check, 
  ThumbsUp, ThumbsDown, ArrowRight, Loader2, Play, Sliders, Globe, Download
} from 'lucide-react';

export default function ProspectionSearchPage() {
  const [rechercheId, setRechercheId] = useState<string | null>(null);
  const [statut, setStatut] = useState<string>('idle'); // idle, loading, success, error
  const [activeTab, setActiveTab] = useState<'entreprises' | 'decideurs' | 'buyer' | 'approche'>('entreprises');

  // ICP Domain fields
  const [siteUrl, setSiteUrl] = useState('');
  const [loadingIcp, setLoadingIcp] = useState(false);

  // Form fields
  const [entryType, setEntryType] = useState<'entreprise' | 'motscles'>('motscles');
  const [entryValue, setEntryValue] = useState('');
  const [solutionType, setSolutionType] = useState('');
  const [tailleMin, setTailleMin] = useState(1);
  const [tailleMax, setTailleMax] = useState(100);
  const [zonesGeo, setZonesGeo] = useState<string[]>([]);
  const [secteurs, setSecteurs] = useState<string[]>([]);
  const [budgetType, setBudgetType] = useState('Moyen');
  const [signauxAchat, setSignauxAchat] = useState<string[]>([]);
  const [rolesDecideurs, setRolesDecideurs] = useState<string[]>([]);
  const [maxEntitesIA, setMaxEntitesIA] = useState(5);

  // Custom weights
  const [poidsFit, setPoidsFit] = useState({ secteur: 30, taille: 25, geo: 20, decideur: 25 });
  const [poidsTiming, setPoidsTiming] = useState({ signal: 30, recrutement: 30, technique: 25, fraicheur: 15 });
  const [showWeights, setShowWeights] = useState(false);

  // Results
  const [results, setResults] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<Record<string, 'pertinent' | 'pas_pertinent'>>({});
  const [importedStatus, setImportedStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPoids();
  }, []);

  const fetchPoids = async () => {
    try {
      const res = await fetch('/api/prospection/poids');
      if (res.ok) {
        const data = await res.json();
        setPoidsFit(data.poidsFit);
        setPoidsTiming(data.poidsTiming);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const savePoids = async () => {
    try {
      await fetch('/api/prospection/poids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poidsFit, poidsTiming }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDiscoverIcp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteUrl) return;

    setLoadingIcp(true);
    try {
      const res = await fetch('/api/icp/decouvrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        const icp = data.icp;
        setSolutionType(icp.besoinGenere.solutionType || '');
        setTailleMin(icp.besoinGenere.tailleMin || 1);
        setTailleMax(icp.besoinGenere.tailleMax || 100);
        setZonesGeo(icp.besoinGenere.zonesGeo || []);
        setSecteurs(icp.besoinGenere.secteurs || []);
        setBudgetType(icp.besoinGenere.budgetType || 'Moyen');
        setSignauxAchat(icp.besoinGenere.signauxAchat || []);
        setRolesDecideurs(icp.besoinGenere.rolesDecideurs || []);
        // Pré-remplir aussi le point d'entrée avec les mots-clés suggérés
        if (icp.besoinGenere.motsClesSuggeres) {
          setEntryType('motscles');
          setEntryValue(icp.besoinGenere.motsClesSuggeres);
        }
      } else {
        alert("Impossible d'analyser l'ICP de ce domaine.");
      }
    } catch (err) {
      alert("Erreur réseau lors de la découverte de l'ICP.");
    } finally {
      setLoadingIcp(false);
    }
  };

  const handleLaunchSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatut('loading');
    setResults(null);

    // Sauvegarde les poids ajustés
    await savePoids();

    try {
      const res = await fetch('/api/prospection/lancer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryType,
          entryValue,
          besoin: {
            solutionType,
            tailleMin,
            tailleMax,
            zonesGeo,
            secteurs,
            budgetType,
            signauxAchat,
            rolesDecideurs,
            maxEntitesIA,
          }
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRechercheId(data.rechercheId);
        pollStatus(data.rechercheId);
      } else {
        setStatut('error');
      }
    } catch (err) {
      setStatut('error');
    }
  };

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/prospection/lancer?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.recherche.statut === 'terminee') {
            clearInterval(interval);
            setResults(data.recherche);
            setStatut('success');
          } else if (data.recherche.statut === 'erreur') {
            clearInterval(interval);
            setStatut('error');
          }
        }
      } catch (e) {
        clearInterval(interval);
        setStatut('error');
      }
    }, 2000);
  };

  const handleVote = async (entiteId: string, type: 'entreprise' | 'decideur', vote: 'pertinent' | 'pas_pertinent', detail: any) => {
    setFeedbacks(prev => ({ ...prev, [entiteId]: vote }));
    try {
      await fetch('/api/prospection/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entiteId,
          typeEntite: type,
          vote,
          scoreDetailAuVote: detail,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportToCRM = async (company: any) => {
    try {
      const res = await fetch('/api/prospects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: [{
            nom: company.nom,
            siren: company.siren || `MOCK-${Date.now()}`,
            dirigeantNom: company.decideurs[0]?.nom || 'Non renseigné',
            dirigeantRole: company.decideurs[0]?.fonction || 'Dirigeant',
            adresse: company.codePostal ? `${company.codePostal} ${company.ville}` : company.ville,
            ville: company.ville || 'Paris',
            libelleSecteur: company.secteurLabel || company.secteur || 'Services',
            trancheEffectif: company.effectif || 'NC',
            score: company.fitScore || 75,
            latitude: company.latitude,
            longitude: company.longitude,
          }]
        }),
      });

      if (res.ok) {
        setImportedStatus(prev => ({ ...prev, [company.id]: true }));
      } else {
        alert("Erreur lors de l'importation.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTag = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    if (list.includes(val)) {
      setList(list.filter(x => x !== val));
    } else {
      setList([...list, val]);
    }
  };

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Prospection intelligente</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Moteur de recherche IA</h1>
            <p className="text-slate-400 text-sm mt-1">
              Ciblez des entreprises qualifiées, découvrez des décideurs et générez des approches personnalisées.
            </p>
          </div>

          {/* ICP Discovery Banner */}
          {statut === 'idle' && (
            <div className="p-6 rounded-2xl border border-blue-500/20 bg-blue-950/10 space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-white">Découverte automatique d'ICP par site</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                Saisissez le site web de votre propre entreprise. L'IA analysera vos offres pour déduire automatiquement votre cible (secteurs, taille d'entreprise et décideurs).
              </p>
              <form onSubmit={handleDiscoverIcp} className="flex gap-2 max-w-md">
                <input
                  type="url"
                  placeholder="https://mon-entreprise.com"
                  required
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={loadingIcp}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loadingIcp && <Loader2 className="h-3 w-3 animate-spin" />}
                  Découvrir ICP
                </button>
              </form>
            </div>
          )}

          {/* Formulaire de recherche */}
          {statut === 'idle' && (
            <form onSubmit={handleLaunchSearch} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Entrée */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase">1. Point d'entrée de prospection</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEntryType('motscles')}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        entryType === 'motscles' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      Mots-clés sectoriels
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryType('entreprise')}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        entryType === 'entreprise' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      Nom d'entreprise / Groupe
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={entryType === 'motscles' ? "Ex: Experts comptables, Boulangeries Paris..." : "Ex: Payfit, Alan..."}
                    value={entryValue}
                    onChange={(e) => setEntryValue(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Solution vendue */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase">2. Votre solution vendue</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Logiciel de facturation SaaS, Services de recrutement IT..."
                    value={solutionType}
                    onChange={(e) => setSolutionType(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Sliders effectifs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-300 uppercase">
                    <span>Taille min effectif</span>
                    <span className="text-blue-400">{tailleMin} pers.</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    value={tailleMin}
                    onChange={(e) => setTailleMin(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-300 uppercase">
                    <span>Taille max effectif</span>
                    <span className="text-blue-400">{tailleMax} pers.</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    value={tailleMax}
                    onChange={(e) => setTailleMax(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              {/* Tags cibles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-800/80 pt-6">
                {/* Rôles décideurs */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase">Décideurs cibles</label>
                  <div className="flex flex-wrap gap-2">
                    {['Gérant', 'CTO', 'DAF', 'Responsable achats', 'Directeur technique', 'Responsable RH'].map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleTag(rolesDecideurs, setRolesDecideurs, role)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          rolesDecideurs.includes(role)
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Signaux d'achat */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase">Signaux d'achat</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'recrutement', label: 'En Recrutement' },
                      { key: 'levees_fonds', label: 'Levée de fonds récente' },
                      { key: 'refonte_site', label: 'Refonte de site' },
                      { key: 'changement_stack', label: 'Technologie modifiée' }
                    ].map(sig => (
                      <button
                        key={sig.key}
                        type="button"
                        onClick={() => toggleTag(signauxAchat, setSignauxAchat, sig.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          signauxAchat.includes(sig.key)
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {sig.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sliders de pondération */}
              <div className="border-t border-slate-800/80 pt-6">
                <button
                  type="button"
                  onClick={() => setShowWeights(!showWeights)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  <Sliders className="h-4 w-4" />
                  {showWeights ? "Masquer les coefficients de scoring" : "Personnaliser les coefficients de scoring"}
                </button>

                {showWeights && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-4 rounded-xl bg-slate-950/40 border border-slate-850">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-blue-400 uppercase">Critères Fit (Adéquation)</h4>
                      {Object.keys(poidsFit).map(k => (
                        <div key={k} className="flex items-center justify-between text-xs">
                          <span className="capitalize">{k}</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={(poidsFit as any)[k]}
                            onChange={(e) => setPoidsFit({ ...poidsFit, [k]: Number(e.target.value) })}
                            className="w-1/2 accent-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-purple-400 uppercase">Critères Timing (Opportunité)</h4>
                      {Object.keys(poidsTiming).map(k => (
                        <div key={k} className="flex items-center justify-between text-xs">
                          <span className="capitalize">{k}</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={(poidsTiming as any)[k]}
                            onChange={(e) => setPoidsTiming({ ...poidsTiming, [k]: Number(e.target.value) })}
                            className="w-1/2 accent-purple-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Options IA et Soumission */}
              <div className="flex justify-between items-center border-t border-slate-800/80 pt-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Nb max d'entités qualifiées par l'IA :</span>
                  <select
                    value={maxEntitesIA}
                    onChange={(e) => setMaxEntitesIA(Number(e.target.value))}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value={3}>3 entreprises cibles</option>
                    <option value={5}>5 entreprises cibles</option>
                    <option value={10}>10 entreprises cibles</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-2"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Lancer la recherche intelligente
                </button>
              </div>

            </form>
          )}

          {/* Écran de Chargement asynchrone */}
          {statut === 'loading' && (
            <div className="h-[400px] flex flex-col justify-center items-center space-y-4 bg-slate-900/20 border border-slate-800 rounded-2xl">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <div className="text-center space-y-1">
                <h3 className="font-bold text-white text-sm">Traitement IA en cours...</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Nous recherchons les entreprises Sirene, analysons leur pertinence, et lançons la cascade waterfall d'enrichissement.
                </p>
              </div>
              <div className="w-[300px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* Écran de Résultats */}
          {statut === 'success' && results && (
            <div className="space-y-6">
              
              {/* Onglets */}
              <div className="flex border-b border-slate-800">
                {[
                  { key: 'entreprises', label: 'Entreprises cibles', icon: Building },
                  { key: 'decideurs', label: 'Décideurs identifiés', icon: Users },
                  { key: 'buyer', label: 'Buyer Persona', icon: BarChart2 },
                  { key: 'approche', label: 'Plan d\'approche', icon: FileText }
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-semibold transition-all ${
                      activeTab === t.key 
                        ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Contenu de l'onglet : Entreprises */}
              {activeTab === 'entreprises' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.entreprises.map((comp: any) => (
                    <div key={comp.id} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 flex flex-col justify-between space-y-4">
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white">{comp.nom}</h4>
                          <span className="text-[10px] text-slate-500 block">{comp.secteur} • {comp.ville}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                            Fit: {comp.fitScore}%
                          </span>
                          <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20">
                            Timing: {comp.timingScore}%
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        {/* Vote Feedback */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleVote(comp.id, 'entreprise', 'pertinent', comp.fitDetail)}
                            className={`p-2 rounded-lg border transition-all ${
                              feedbacks[comp.id] === 'pertinent' 
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                                : 'border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVote(comp.id, 'entreprise', 'pas_pertinent', comp.fitDetail)}
                            className={`p-2 rounded-lg border transition-all ${
                              feedbacks[comp.id] === 'pas_pertinent' 
                                ? 'bg-red-500/10 border-red-500/50 text-red-400' 
                                : 'border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Import CRM button */}
                        {importedStatus[comp.id] || comp.statutCRM === 'deja_en_pipe' ? (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                            Déjà en Pipeline
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleImportToCRM(comp)}
                            className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950 text-xs font-semibold text-slate-300 hover:text-white transition-all"
                          >
                            Importer en prospect
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}

              {/* Contenu de l'onglet : Décideurs */}
              {activeTab === 'decideurs' && (
                <div className="space-y-4">
                  {results.entreprises.map((comp: any) => (
                    <div key={comp.id} className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/10 space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{comp.nom}</h4>
                      <div className="divide-y divide-slate-800/60">
                        {comp.decideurs.map((dec: any) => (
                          <div key={dec.id} className="py-3 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold text-white block">{dec.nom}</span>
                              <span className="text-slate-500 block">{dec.fonction}</span>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Confidence Badges */}
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                dec.confiance === 'haute' ? 'bg-emerald-500/10 text-emerald-400' :
                                dec.confiance === 'moyenne' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-yellow-500/10 text-yellow-400'
                              }`}>
                                Confiance : {dec.confiance}
                              </span>

                              {/* LinkedIn Direct Link */}
                              {dec.linkedinUrl && (
                                <a 
                                  href={dec.linkedinUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-blue-400 hover:text-blue-300 hover:underline"
                                >
                                  LinkedIn 🔗
                                </a>
                              )}

                              {/* Email/Phone Resolved via Waterfall */}
                              <div>
                                <span className="block font-semibold text-slate-300">{dec.emailTrouve || 'Email non trouvé'}</span>
                                <span className="block text-slate-500 text-[10px]">{dec.telephoneTrouve || 'Tel non trouvé'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contenu de l'onglet : Buyer Persona */}
              {activeTab === 'buyer' && results.buyerPersonas && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results.buyerPersonas.map((bp: any) => (
                    <div key={bp.id} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-6">
                      <div>
                        <span className="text-xs font-semibold text-blue-400 uppercase">Cible générée</span>
                        <h3 className="text-lg font-bold text-white mt-1">{bp.roleTarget}</h3>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Motivations clés</h4>
                          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                            {JSON.parse(bp.motivations || '[]').map((x: string, idx: number) => (
                              <li key={idx}>{x}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Traitement des objections</h4>
                          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                            {JSON.parse(bp.objections || '[]').map((x: string, idx: number) => (
                              <li key={idx}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contenu de l'onglet : Plan d'approche */}
              {activeTab === 'approche' && (
                <div className="space-y-6">
                  {results.entreprises.map((comp: any) => (
                    <div key={comp.id} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-white">{comp.nom}</h4>
                        <span className="text-xs text-blue-400">Canal recommandé : {comp.planApproche?.canalRecommande}</span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                          <span>Séquence d'approche</span>
                          <span className="text-blue-400">Fit score: {comp.fitScore}%</span>
                        </div>
                        <ul className="text-xs space-y-2 text-slate-300">
                          {JSON.parse(comp.planApproche?.etapesSequence || '[]').map((seq: any, idx: number) => (
                            <li key={idx} className="flex gap-2 items-center">
                              <span className="font-bold text-blue-500">Jour {seq.jour} :</span>
                              <span>{seq.action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                          <span>Modèle de message (Pitch)</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(comp.planApproche?.messageDraft || '');
                              alert("Message copié dans le presse-papiers !");
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-bold"
                          >
                            Copier
                          </button>
                        </div>
                        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-850 font-mono text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                          {comp.planApproche?.messageDraft}
                        </pre>
                      </div>

                    </div>
                  ))}
                </div>
              )}

              {/* Bouton de reset */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStatut('idle')}
                  className="px-4 py-2 border border-slate-800 rounded-lg hover:border-slate-700 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Nouvelle recherche de prospection
                </button>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
