'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Play, Plus, Kanban, Calendar, Layers, FolderHeart, X, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CampagnesListPage() {
  const router = useRouter();
  const [campagnes, setCampagnes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Modale de création
  const [showModal, setShowModal] = useState(false);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCampagnes();
  }, []);

  const fetchCampagnes = async () => {
    try {
      const res = await fetch('/api/campagnes');
      if (res.ok) {
        const data = await res.json();
        setCampagnes(data.campagnes || []);
      } else {
        setError('Erreur lors du chargement des campagnes.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampagne = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/campagnes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, description }),
      });

      if (res.ok) {
        setNom('');
        setDescription('');
        setShowModal(false);
        setMessage('Campagne créée avec succès.');
        fetchCampagnes();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la création.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setSaving(false);
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
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Pipelines commerciaux</span>
              <h1 className="text-3xl font-extrabold text-white mt-1">Mes Campagnes</h1>
              <p className="text-slate-400 text-sm mt-1">
                Gérez vos séquences de prospection et suivez l'avancement de vos deals.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Nouvelle campagne
            </button>
          </div>

          {/* Feedback banners */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400">{message}</div>}

          {/* Liste des campagnes */}
          {campagnes.length === 0 ? (
            <div className="h-60 flex flex-col justify-center items-center rounded-2xl border border-slate-800 bg-slate-900/20 text-slate-400 space-y-3">
              <Kanban className="h-10 w-10 text-slate-600" />
              <div className="text-center">
                <span className="block font-bold text-slate-300">Aucune campagne configurée</span>
                <span className="text-xs text-slate-500">Créez votre premier pipeline commercial en 1 clic.</span>
              </div>
              <button 
                onClick={() => setShowModal(true)}
                className="px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl text-xs font-bold text-blue-400"
              >
                Commencer
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campagnes.map((camp) => (
                <div 
                  key={camp.id} 
                  onClick={() => router.push(`/campagnes/${camp.id}`)}
                  className="cursor-pointer p-6 rounded-2xl border border-slate-800 bg-slate-900/20 hover:border-slate-700/80 transition-all duration-300 flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-white text-lg">{camp.nom}</h3>
                      <Kanban className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {camp.description || "Aucune description fournie."}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-slate-800/80 pt-4 text-slate-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-slate-500" />
                        {camp.etapes.length} étapes
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderHeart className="h-3.5 w-3.5 text-slate-500" />
                        {camp.prospects.length} prospects
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px]">
                      <Calendar className="h-3.5 w-3.5" />
                      Créée le {new Date(camp.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modale de création */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Créer une campagne</h3>
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateCampagne} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Nom de la campagne</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Vente Directe - ESN Paris"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Description (Optionnel)</label>
                    <textarea
                      placeholder="Objectifs, ciblage..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full h-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-slate-800 rounded-lg hover:border-slate-700 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Création...' : 'Créer'}
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
