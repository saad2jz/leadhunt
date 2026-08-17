'use client';


import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  ArrowLeft, ChevronRight, ChevronLeft, Calendar, User, 
  MapPin, Clock, Plus, X, Search, FileText, Check, Save, ArrowRight
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function KanbanBoardPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campagne, setCampagne] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Modale pour ajouter des prospects
  const [showAddProspectsModal, setShowAddProspectsModal] = useState(false);
  const [dbProspects, setDbProspects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProspectIds, setSelectedProspectIds] = useState<string[]>([]);
  const [loadingAdd, setLoadingAdd] = useState(false);

  // Drawer de détails / relance
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [relanceDate, setRelanceDate] = useState('');
  const [relanceNotes, setRelanceNotes] = useState('');
  const [savingRelance, setSavingRelance] = useState(false);

  useEffect(() => {
    fetchCampagne();
  }, [id]);

  const fetchCampagne = async () => {
    try {
      const res = await fetch(`/api/campagnes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCampagne(data.campagne);
      } else {
        setError('Impossible de charger la campagne.');
      }
    } catch (e) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDbProspects = async () => {
    try {
      const res = await fetch('/api/prospects');
      if (res.ok) {
        const data = await res.json();
        // Filtre les prospects qui ne sont pas déjà dans la campagne
        const existingIds = campagne?.etapes.flatMap((e: any) => e.prospects.map((p: any) => p.prospectId)) || [];
        setDbProspects((data.prospects || []).filter((p: any) => !existingIds.includes(p.id)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAddModal = () => {
    fetchDbProspects();
    setShowAddProspectsModal(true);
  };

  const handleAddProspects = async () => {
    if (selectedProspectIds.length === 0) return;

    setLoadingAdd(true);
    try {
      const res = await fetch('/api/campagnes/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campagneId: id,
          prospectIds: selectedProspectIds,
        }),
      });

      if (res.ok) {
        setSelectedProspectIds([]);
        setShowAddProspectsModal(false);
        setMessage("Prospects ajoutés à la campagne.");
        fetchCampagne();
      } else {
        setError("Erreur lors de l'ajout.");
      }
    } catch (e) {
      setError("Erreur réseau.");
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleMoveStage = async (prospectCampagneId: string, toEtapeId: string) => {
    try {
      const res = await fetch('/api/campagnes/drag-and-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectCampagneId, toEtapeId }),
      });

      if (res.ok) {
        fetchCampagne();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveRelance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;

    setSavingRelance(true);
    try {
      const res = await fetch('/api/campagnes/relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectCampagneId: selectedCard.id,
          relanceProgrammee: relanceDate || null,
          notes: relanceNotes || null,
        }),
      });

      if (res.ok) {
        setMessage("Relance enregistrée.");
        setSelectedCard(null);
        fetchCampagne();
      } else {
        setError("Erreur de programmation.");
      }
    } catch (err) {
      setError("Erreur réseau.");
    } finally {
      setSavingRelance(false);
    }
  };

  const handleToggleSelectProspect = (pId: string) => {
    if (selectedProspectIds.includes(pId)) {
      setSelectedProspectIds(selectedProspectIds.filter(x => x !== pId));
    } else {
      setSelectedProspectIds([...selectedProspectIds, pId]);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!campagne) {
    return (
      <div className="flex bg-slate-950 text-slate-100 min-h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col justify-center items-center">
          <h2 className="font-bold text-white text-lg">Campagne introuvable</h2>
          <button onClick={() => router.push('/campagnes')} className="text-blue-500 hover:underline mt-4 text-xs">Retour</button>
        </main>
      </div>
    );
  }

  // Calcul du taux de conversion rapide
  const totalLeads = campagne.etapes.reduce((acc: number, et: any) => acc + et.prospects.length, 0);

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen relative overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Back link */}
          <button 
            onClick={() => router.push('/campagnes')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à mes campagnes
          </button>

          {/* Header */}
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-extrabold text-white">{campagne.nom}</h1>
              <p className="text-xs text-slate-400 mt-1">{campagne.description || 'Pipeline visuel de suivi des opportunités.'}</p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Ajouter des prospects
            </button>
          </div>

          {/* Feedback banners */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400">{message}</div>}

          {/* Statistiques de conversion */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 text-xs flex items-center gap-4 overflow-x-auto">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] shrink-0">Entonnoir :</span>
            <div className="flex items-center gap-3">
              {campagne.etapes.map((et: any, idx: number) => (
                <React.Fragment key={et.id}>
                  <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 shrink-0">
                    <span className="font-bold text-white">{et.prospects.length}</span>
                    <span className="text-slate-500 text-[10px]">{et.nom}</span>
                  </div>
                  {idx < campagne.etapes.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-slate-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Kanban Board Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start min-h-[500px] overflow-x-auto pb-4">
            {campagne.etapes.map((etape: any, eIdx: number) => {
              const prevEtape = campagne.etapes[eIdx - 1];
              const nextEtape = campagne.etapes[eIdx + 1];

              return (
                <div key={etape.id} className="p-3 rounded-2xl bg-slate-900/20 border border-slate-800/80 space-y-3 shrink-0 min-w-[200px]">
                  
                  {/* Column Header */}
                  <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: etape.couleur || '#555' }}
                      />
                      <span className="font-bold text-xs text-white uppercase tracking-wider truncate max-w-[120px]">
                        {etape.nom}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-850 text-[10px] font-bold text-slate-400">
                      {etape.prospects.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {etape.prospects.length === 0 ? (
                      <div className="text-[10px] text-slate-500 py-6 text-center italic">Colonne vide</div>
                    ) : (
                      etape.prospects.map((card: any) => {
                        const isOverdue = card.relanceProgrammee && new Date(card.relanceProgrammee) <= new Date();

                        return (
                          <div 
                            key={card.id}
                            className="p-3 rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-700/80 transition-all space-y-3 cursor-pointer group"
                            onClick={() => {
                              setSelectedCard(card);
                              setRelanceDate(card.relanceProgrammee ? card.relanceProgrammee.substring(0, 10) : '');
                              setRelanceNotes(card.notes || '');
                            }}
                          >
                            <div className="space-y-1">
                              <span className="font-bold text-xs text-white block group-hover:text-blue-400 transition-colors">
                                {card.prospect.nom}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {card.prospect.secteur || 'Sans secteur'}
                              </span>
                            </div>

                            {/* Contact principal */}
                            {card.prospect.contacts?.[0] && (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <User className="h-3 w-3 shrink-0" />
                                <span className="truncate">{card.prospect.contacts[0].nom}</span>
                              </div>
                            )}

                            {/* Relance Badge */}
                            {card.relanceProgrammee && (
                              <div className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-bold uppercase w-fit ${
                                isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                              }`}>
                                <Calendar className="h-2.5 w-2.5" />
                                {new Date(card.relanceProgrammee).toLocaleDateString('fr-FR')}
                              </div>
                            )}

                            {/* Shift Arrow buttons for quick move */}
                            <div className="flex justify-between items-center border-t border-slate-800/80 pt-2 text-[10px] text-slate-500" onClick={e => e.stopPropagation()}>
                              {prevEtape ? (
                                <button
                                  onClick={() => handleMoveStage(card.id, prevEtape.id)}
                                  className="p-1 rounded bg-slate-900 border border-slate-850 hover:text-white"
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </button>
                              ) : <div />}

                              <span className="text-[9px] text-slate-600 font-bold uppercase">Actions</span>

                              {nextEtape ? (
                                <button
                                  onClick={() => handleMoveStage(card.id, nextEtape.id)}
                                  className="p-1 rounded bg-slate-900 border border-slate-850 hover:text-white"
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              ) : <div />}
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </main>

      {/* Drawer latéral de détails / reprogrammation relance */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between h-full overflow-y-auto">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{selectedCard.prospect.nom}</h3>
                  <button 
                    onClick={() => {
                      setSelectedCard(null);
                      router.push(`/prospects/${selectedCard.prospect.id}`);
                    }}
                    className="text-xs text-blue-400 hover:underline mt-1 block"
                  >
                    Consulter la fiche 360° 🔗
                  </button>
                </div>
                <button onClick={() => setSelectedCard(null)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Formulaire programmer relance */}
              <form onSubmit={handleSaveRelance} className="space-y-4">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Planifier un rappel / relance
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Date de relance</label>
                  <input
                    type="date"
                    value={relanceDate}
                    onChange={(e) => setRelanceDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Objectif ou notes de relance</label>
                  <textarea
                    value={relanceNotes}
                    placeholder="Ex: Le recontacter pour fixer le RDV..."
                    onChange={(e) => setRelanceNotes(e.target.value)}
                    className="w-full h-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingRelance}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingRelance ? 'Sauvegarde...' : 'Enregistrer la relance'}
                </button>
              </form>
            </div>

            <div className="pt-6 border-t border-slate-850 text-[10px] text-slate-500 leading-relaxed">
              * Programmer une relance affichera automatiquement cette fiche dans l'écran de relance quotidien des commerciaux de l'organisation.
            </div>
          </div>
        </div>
      )}

      {/* Modale d'ajout de prospects en lot */}
      {showAddProspectsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-h-[85vh] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Ajouter des prospects au pipeline</h3>
                <button onClick={() => setShowAddProspectsModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Liste de prospects */}
              <div className="divide-y divide-slate-800/40 overflow-y-auto max-h-[40vh] pr-1">
                {dbProspects
                  .filter(p => p.nom.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => handleToggleSelectProspect(p.id)}
                      className={`py-2.5 px-3 flex justify-between items-center rounded-xl cursor-pointer transition-all ${
                        selectedProspectIds.includes(p.id) ? 'bg-blue-600/10 border border-blue-500/30' : 'hover:bg-slate-900/40 border border-transparent'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs text-white block">{p.nom}</span>
                        <span className="text-[10px] text-slate-500 block">{p.secteur || 'Sans secteur'} • {p.ville || 'Sans ville'}</span>
                      </div>
                      {selectedProspectIds.includes(p.id) && (
                        <Check className="h-4 w-4 text-blue-500 shrink-0" />
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800/80 pt-4">
              <button
                onClick={() => setShowAddProspectsModal(false)}
                className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleAddProspects}
                disabled={loadingAdd || selectedProspectIds.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              >
                {loadingAdd ? 'Ajout...' : `Ajouter ${selectedProspectIds.length} prospects`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
