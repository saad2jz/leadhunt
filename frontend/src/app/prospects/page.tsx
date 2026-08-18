'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { 
  Users, Plus, ShieldAlert, Trash2, Mail, Phone, User, 
  Check, X, ShieldOff, ChevronRight, Save, Eye, Star 
} from 'lucide-react';

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Modale pour ajouter un contact manuel
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState('');
  const [contactNom, setContactNom] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRole, setContactRole] = useState('Directeur');
  const [addingContact, setAddingContact] = useState(false);

  // Modale pour ajouter un prospect manuel
  const [showAddProspectModal, setShowAddProspectModal] = useState(false);
  const [prospectNom, setProspectNom] = useState('');
  const [prospectSecteur, setProspectSecteur] = useState('');
  const [prospectVille, setProspectVille] = useState('');
  const [prospectAdresse, setProspectAdresse] = useState('');
  const [prospectSiteWeb, setProspectSiteWeb] = useState('');
  const [prospectEmail, setProspectEmail] = useState('');
  const [prospectPhone, setProspectPhone] = useState('');
  const [prospectScore, setProspectScore] = useState<number>(70);
  const [addingProspect, setAddingProspect] = useState(false);

  // Filtres actifs
  const [searchSecteur, setSearchSecteur] = useState('');
  const [searchVille, setSearchVille] = useState('');
  const [minScore, setMinScore] = useState<number>(0);

  // Vues Sauvegardées
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [selectedViewId, setSelectedViewId] = useState('');
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [savingView, setSavingView] = useState(false);

  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospectNom.trim()) return;
    setAddingProspect(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: prospectNom,
          secteur: prospectSecteur || null,
          ville: prospectVille || null,
          adresse: prospectAdresse || null,
          siteWeb: prospectSiteWeb || null,
          email: prospectEmail || null,
          telephone: prospectPhone || null,
          score: Number(prospectScore),
        }),
      });

      if (res.ok) {
        setShowAddProspectModal(false);
        setProspectNom('');
        setProspectSecteur('');
        setProspectVille('');
        setProspectAdresse('');
        setProspectSiteWeb('');
        setProspectEmail('');
        setProspectPhone('');
        setProspectScore(70);
        setMessage('Prospect ajouté manuellement avec succès.');
        fetchProspects();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l\'ajout du prospect.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setAddingProspect(false);
    }
  };

  useEffect(() => {
    fetchProspects();
    fetchSavedViews();
  }, []);

  const fetchProspects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prospects');
      if (res.ok) {
        const data = await res.json();
        setProspects(data.prospects || []);
      } else {
        setError('Erreur lors de la récupération des prospects.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedViews = async () => {
    try {
      const res = await fetch('/api/views');
      if (res.ok) {
        const data = await res.json();
        setSavedViews(data.vues || []);
      }
    } catch (err) {
      console.error('Erreur chargement des vues:', err);
    }
  };

  const handleApplyView = (viewId: string) => {
    setSelectedViewId(viewId);
    if (!viewId) {
      setSearchSecteur('');
      setSearchVille('');
      setMinScore(0);
      return;
    }

    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      try {
        const filtres = JSON.parse(view.filtres);
        setSearchSecteur(filtres.searchSecteur || '');
        setSearchVille(filtres.searchVille || '');
        setMinScore(filtres.minScore || 0);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSaveView = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingView(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: newViewName,
          filtres: JSON.stringify({
            searchSecteur,
            searchVille,
            minScore,
          }),
        }),
      });

      if (res.ok) {
        setNewViewName('');
        setShowSaveViewModal(false);
        setMessage('Vue de filtres sauvegardée avec succès.');
        fetchSavedViews();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la sauvegarde.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setSavingView(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, statut: newStatus }),
      });

      if (res.ok) {
        fetchProspects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prospect ?')) return;

    try {
      const res = await fetch(`/api/prospects?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage('Prospect supprimé avec succès.');
        fetchProspects();
      }
    } catch (err) {
      setError('Erreur lors de la suppression.');
    }
  };

  const handleBlacklist = async (prospect: any) => {
    const motif = prompt('Entrez le motif du blocage (Demande RGPD / Opposition demarchage / Autre) :', 'Demande RGPD');
    if (motif === null) return; // Annulé

    try {
      const res = await fetch('/api/liste-noire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siren: prospect.siren,
          email: prospect.contacts?.[0]?.email || null,
          telephone: prospect.contacts?.[0]?.telephone || null,
          motif: ['Demande RGPD', 'Opposition demarchage', 'Autre'].includes(motif) ? motif : 'Demande RGPD',
        }),
      });

      if (res.ok) {
        setMessage('Prospect et contacts associés ajoutés à la liste noire et désactivés.');
        fetchProspects();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors du blocage.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingContact(true);
    setError('');

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: selectedProspectId,
          nom: contactNom,
          email: contactEmail || null,
          telephone: contactPhone || null,
          role: contactRole,
        }),
      });

      if (res.ok) {
        setShowContactModal(false);
        setContactNom('');
        setContactEmail('');
        setContactPhone('');
        setContactRole('Décideur');
        fetchProspects();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l\'ajout du contact.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setAddingContact(false);
    }
  };

  const columns = [
    { name: 'Nouveau', status: 'À appeler', bg: 'border-blue-500/30 bg-blue-950/5' },
    { name: 'En cours', status: 'En cours', bg: 'border-yellow-500/30 bg-yellow-950/5' },
    { name: 'Qualifié / RDV', status: 'RDV pris', bg: 'border-emerald-500/30 bg-emerald-950/5' },
    { name: 'Client', status: 'Client', bg: 'border-purple-500/30 bg-purple-950/5' },
  ];

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Pipeline de vente</span>
              <h1 className="text-3xl font-extrabold text-white mt-1">Prospects & Contacts</h1>
              <p className="text-slate-400 text-sm mt-1">Gérez votre pipeline de vente et qualifiez vos décideurs.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddProspectModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10"
            >
              <Plus className="h-4 w-4" />
              Ajouter un prospect
            </button>
          </div>

          {/* Feedback Messages */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-sm text-red-400">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-sm text-emerald-400">{message}</div>}

          {/* Barre de filtres et Vues sauvegardées */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/20 grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Filtrer par Secteur</label>
              <input
                type="text"
                placeholder="Ex: Logiciel, BTP..."
                value={searchSecteur}
                onChange={(e) => {
                  setSearchSecteur(e.target.value);
                  setSelectedViewId('');
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Filtrer par Ville</label>
              <input
                type="text"
                placeholder="Ex: Paris, Lyon..."
                value={searchVille}
                onChange={(e) => {
                  setSearchVille(e.target.value);
                  setSelectedViewId('');
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Score minimal</label>
              <input
                type="number"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => {
                  setMinScore(Number(e.target.value));
                  setSelectedViewId('');
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Vues de filtre</label>
                <select
                  value={selectedViewId}
                  onChange={(e) => handleApplyView(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="">-- Aucune vue active --</option>
                  {savedViews.map(v => (
                    <option key={v.id} value={v.id}>{v.nom}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowSaveViewModal(true)}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center shrink-0"
              >
                <Save className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Kanban Board */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {columns.map(col => {
                const colProspects = prospects.filter(p => {
                  if (p.statut !== col.status) return false;
                  if (searchSecteur && !p.secteur?.toLowerCase().includes(searchSecteur.toLowerCase())) return false;
                  if (searchVille && !p.ville?.toLowerCase().includes(searchVille.toLowerCase())) return false;
                  if (minScore && p.score < minScore) return false;
                  return true;
                });

                return (
                  <div key={col.status} className={`border rounded-2xl p-4 flex flex-col h-[600px] ${col.bg}`}>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
                      <span className="font-bold text-sm text-slate-200 uppercase">{col.name}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                        {colProspects.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {colProspects.map(prospect => (
                        <div 
                          key={prospect.id} 
                          className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3 shadow-md hover:border-slate-700 transition-all group"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <Link 
                              href={`/prospects/${prospect.id}`}
                              className="font-bold text-sm text-white hover:text-blue-400 transition-colors block truncate"
                            >
                              {prospect.nom}
                            </Link>

                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border shrink-0 ${
                              prospect.score < 30
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : prospect.score <= 60
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {prospect.score}
                            </span>
                          </div>

                          {prospect.siren && (
                            <span className="text-[10px] text-slate-500 block">
                              SIREN: {prospect.siren} {prospect.ville ? `• ${prospect.ville}` : ''}
                            </span>
                          )}

                          {/* Liste des contacts du prospect */}
                          {prospect.contacts?.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                              {prospect.contacts.map((c: any) => (
                                <div key={c.id} className="text-xs text-slate-400 space-y-0.5">
                                  <div className="flex items-center gap-1 font-semibold text-slate-300">
                                    <User className="h-3 w-3 text-slate-500" />
                                    {c.nom} <span className="text-[9px] text-slate-500">({c.fonction || 'Décideur'})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Actions rapides */}
                          <div className="flex items-center justify-between gap-1 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProspectId(prospect.id);
                                setShowContactModal(true);
                              }}
                              className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-0.5 bg-blue-950/20 px-2 py-1 rounded"
                            >
                              <Plus className="h-3 w-3" />
                              Contact
                            </button>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleBlacklist(prospect)}
                                title="Inscrire sur liste noire (RGPD)"
                                className="p-1 rounded bg-slate-950 text-red-500 hover:bg-red-950/20"
                              >
                                <ShieldAlert className="h-3 w-3" />
                              </button>

                              {col.status !== 'RDV pris' && col.status !== 'Client' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(prospect.id, 'RDV pris')}
                                  title="Marquer RDV pris"
                                  className="p-1 rounded bg-slate-950 text-emerald-500 hover:bg-emerald-950/20"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              )}

                              {col.status !== 'En cours' && col.status !== 'Client' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(prospect.id, 'En cours')}
                                  title="En Cours"
                                  className="p-1 rounded bg-slate-950 text-yellow-500 hover:bg-yellow-950/20"
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDelete(prospect.id)}
                                title="Supprimer"
                                className="p-1 rounded bg-slate-950 text-slate-500 hover:bg-red-950/20 hover:text-red-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Ajout de Contact */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Ajouter un contact décideur</h3>
              <button 
                type="button" 
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Nom complet</label>
                <input
                  type="text"
                  required
                  value={contactNom}
                  onChange={(e) => setContactNom(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="Jean Dupont"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Email (optionnel)</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="jean.dupont@entreprise.fr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Téléphone (optionnel)</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="0612345678"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Rôle / Poste</label>
                <select
                  required
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Directeur">Directeur</option>
                  <option value="Responsable Achat">Responsable Achat</option>
                  <option value="Vice Président">Vice Président</option>
                  <option value="Directeur Général / CEO">Directeur Général / CEO</option>
                  <option value="Directeur Commercial / VP Sales">Directeur Commercial / VP Sales</option>
                  <option value="Directeur Technique / CTO">Directeur Technique / CTO</option>
                  <option value="Responsable Commercial">Responsable Commercial</option>
                  <option value="Directeur Marketing / CMO">Directeur Marketing / CMO</option>
                  <option value="Directeur Financier / CFO">Directeur Financier / CFO</option>
                  <option value="Autre Décideur">Autre Décideur</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 border border-slate-800 rounded-lg hover:border-slate-700 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addingContact}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                >
                  {addingContact ? 'Ajout...' : 'Ajouter le décideur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sauvegarde de vue */}
      {showSaveViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Sauvegarder la vue de filtres</h3>
              <button type="button" onClick={() => setShowSaveViewModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveView} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Nom de la vue</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Leads IDF BTP > 50"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSaveViewModal(false)}
                  className="px-3 py-1.5 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingView}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                >
                  {savingView ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajout Prospect Manuel */}
      {showAddProspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Ajouter un Prospect Manuellement</h3>
              <button type="button" onClick={() => setShowAddProspectModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddProspect} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Nom de l'entreprise *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Google France"
                  value={prospectNom}
                  onChange={(e) => setProspectNom(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Secteur</label>
                  <input
                    type="text"
                    placeholder="Ex: Logiciel"
                    value={prospectSecteur}
                    onChange={(e) => setProspectSecteur(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Ville</label>
                  <input
                    type="text"
                    placeholder="Ex: Paris"
                    value={prospectVille}
                    onChange={(e) => setProspectVille(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Adresse</label>
                <input
                  type="text"
                  placeholder="Ex: 8 Rue de Londres, 75009 Paris"
                  value={prospectAdresse}
                  onChange={(e) => setProspectAdresse(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Téléphone</label>
                  <input
                    type="text"
                    placeholder="Ex: 0140000000"
                    value={prospectPhone}
                    onChange={(e) => setProspectPhone(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Score Initial (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={prospectScore}
                    onChange={(e) => setProspectScore(Number(e.target.value))}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Email de contact</label>
                  <input
                    type="email"
                    placeholder="Ex: contact@google.fr"
                    value={prospectEmail}
                    onChange={(e) => setProspectEmail(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Site Web</label>
                  <input
                    type="text"
                    placeholder="Ex: https://google.fr"
                    value={prospectSiteWeb}
                    onChange={(e) => setProspectSiteWeb(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProspectModal(false)}
                  className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addingProspect}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                >
                  {addingProspect ? 'Ajout...' : 'Créer le prospect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
