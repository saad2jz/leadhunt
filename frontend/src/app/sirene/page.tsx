'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Search, Building2, User, Globe, MapPin, Import, ChevronRight, Check } from 'lucide-react';

export default function SireneSearchPage() {
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<any[]>([]);
  
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async (e?: React.FormEvent, targetPage = 1) => {
    if (e) e.preventDefault();
    if (!query || query.trim().length < 2) return;

    setSearching(true);
    setError('');
    setMessage('');
    setSelected([]);

    try {
      const res = await fetch(`/api/entreprises/search?q=${encodeURIComponent(query)}&departement=${dept}&page=${targetPage}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
      } else {
        setResults(data.results || []);
        setPage(targetPage);
      }
    } catch (err) {
      setError("Erreur réseau lors de la recherche.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(results.map(r => r.siren));
    } else {
      setSelected([]);
    }
  };

  const handleToggleSelect = (siren: string) => {
    if (selected.includes(siren)) {
      setSelected(selected.filter(id => id !== siren));
    } else {
      setSelected([...selected, siren]);
    }
  };

  const handleImport = async () => {
    if (selected.length === 0) return;
    setImporting(true);
    setError('');
    setMessage('');

    try {
      const toImport = results.filter(r => selected.includes(r.siren));
      const res = await fetch('/api/prospects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: toImport }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'import.");
      } else {
        setMessage(`${data.importedCount} prospect(s) ont été importé(s) avec succès.`);
        setSelected([]);
      }
    } catch (err) {
      setError("Une erreur est survenue lors de l'import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Sourcing National</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Recherche d'entreprises (SIRENE)</h1>
            <p className="text-slate-400 text-sm mt-1">Sourcing gratuit sans clé API sur les 10+ millions d'établissements français.</p>
          </div>

          {/* Formulaire de recherche */}
          <form onSubmit={(e) => handleSearch(e, 1)} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-10 pr-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  placeholder="Nom de l'entreprise, enseigne, dirigeant ou SIREN..."
                />
              </div>
              <div className="w-full md:w-48 relative">
                <input
                  type="text"
                  maxLength={3}
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950 py-3 px-3 text-white placeholder-slate-500 text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  placeholder="Département (Ex: 75)"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-blue-500/10 transition-all disabled:opacity-50"
              >
                {searching ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
          </form>

          {/* Feedback Messages */}
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

          {/* Tableau de résultats */}
          {results.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden">
              {/* Barre d'action d'importation */}
              <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.length === results.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0 h-4 w-4"
                  />
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    {selected.length} sélectionné(s) sur {results.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={selected.length === 0 || importing}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-blue-500/10"
                >
                  <Import className="h-4 w-4" />
                  {importing ? 'Importation...' : 'Importer en prospects'}
                </button>
              </div>

              {/* Liste de cartes / lignes */}
              <div className="divide-y divide-slate-800/60">
                {results.map((comp) => (
                  <div 
                    key={comp.siren} 
                    onClick={() => handleToggleSelect(comp.siren)}
                    className={`flex items-start md:items-center justify-between p-6 cursor-pointer hover:bg-slate-900/20 transition-all ${
                      selected.includes(comp.siren) ? 'bg-blue-600/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selected.includes(comp.siren)}
                        onChange={() => {}} // géré par clic ligne
                        className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0 h-4 w-4 mt-1"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">{comp.nom}</h3>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {comp.formeJuridique}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-500" />
                            {comp.adresse}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                            NAF {comp.codeNaf} • {comp.libelleSecteur}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-600" />
                            Dirigeant: {comp.dirigeantNom} ({comp.dirigeantRole})
                          </span>
                          <span>SIREN: {comp.siren}</span>
                          <span>Tranche d'effectif: {comp.trancheEffectif}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination simple */}
              <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-sm text-slate-400">
                <span>Page {page}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => handleSearch(undefined, page - 1)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/20 disabled:opacity-50 text-xs font-semibold transition-all"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSearch(undefined, page + 1)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/20 text-xs font-semibold transition-all"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
