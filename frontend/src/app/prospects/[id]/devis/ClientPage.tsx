'use client';


import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  FileText, Plus, Trash2, Save, Printer, ArrowLeft,
  X, Check, Edit3, CircleDollarSign 
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function DevisCreatorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [prospect, setProspect] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [devis, setDevis] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [devisId, setDevisId] = useState<string | null>(null);
  const [statut, setStatut] = useState<'brouillon' | 'envoyé' | 'accepté' | 'refusé'>('brouillon');
  const [tauxTVA, setTauxTVA] = useState<number>(20);
  const [lignes, setLignes] = useState<any[]>([
    { description: 'Licence SaaS Annuelle Pulsia - Plan Pro', quantite: 1, prixUnitaire: 1200 },
    { description: 'Sourcing & enrichissement de prospects qualifiés', quantite: 1, prixUnitaire: 500 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProspect();
  }, [id]);

  const fetchProspect = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prospects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProspect(data.prospect);
        fetchDevis();
      } else {
        setError('Impossible de charger le prospect.');
      }
    } catch (e) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevis = async () => {
    try {
      const res = await fetch(`/api/devis?prospectId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setDevis(data.devis || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLine = () => {
    setLignes([...lignes, { description: '', quantite: 1, prixUnitaire: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    setLignes(lignes.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, value: any) => {
    const nextLignes = [...lignes];
    const item = nextLignes[idx];
    if (item) {
      item[field] = value;
      setLignes(nextLignes);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(false);
    setError('');
    setMessage('');

    if (lignes.length === 0) {
      setError('Veuillez ajouter au moins une ligne au devis.');
      return;
    }

    try {
      const res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: devisId || undefined,
          prospectId: id,
          statut,
          tauxTVA,
          lignes,
        }),
      });

      if (res.ok) {
        setMessage('Devis enregistré avec succès.');
        setShowForm(false);
        setDevisId(null);
        fetchDevis();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la sauvegarde.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    }
  };

  const handleEditDevis = (dev: any) => {
    setDevisId(dev.id);
    setStatut(dev.statut);
    setTauxTVA(dev.tauxTVA);
    setLignes(dev.lignes.map((l: any) => ({
      description: l.description,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
    })));
    setShowForm(true);
  };

  // Calcule HT et TTC en temps réel pour l'UI
  const totalHT = lignes.reduce((acc, l) => acc + (l.quantite * l.prixUnitaire || 0), 0);
  const totalTTC = totalHT * (1 + tauxTVA / 100);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen print:bg-white print:text-black">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto px-8 py-10 print:p-0">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header print-hidden */}
          <div className="flex justify-between items-center print:hidden">
            <button 
              onClick={() => router.push(`/prospects/${id}`)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour au prospect
            </button>

            <button
              onClick={() => {
                setDevisId(null);
                setStatut('brouillon');
                setLignes([
                  { description: 'Licence SaaS Annuelle Pulsia - Plan Pro', quantite: 1, prixUnitaire: 1200 },
                  { description: 'Sourcing & enrichissement de prospects qualifiés', quantite: 1, prixUnitaire: 500 },
                ]);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Créer un devis
            </button>
          </div>

          {/* Title */}
          <div className="print:hidden">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Facturation & Closing</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Devis — {prospect?.nom}</h1>
          </div>

          {/* Feedback messages print-hidden */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400 print:hidden">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400 print:hidden">{message}</div>}

          {/* Liste devis */}
          {!showForm && (
            <div className="space-y-4 print:hidden">
              {devis.length === 0 ? (
                <div className="h-40 flex flex-col justify-center items-center text-slate-500 italic text-xs border border-slate-850 bg-slate-900/10 rounded-2xl">
                  Aucun devis créé pour ce prospect.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {devis.map((dev) => (
                    <div key={dev.id} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 flex justify-between items-center text-xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm text-white">{dev.numero}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                            dev.statut === 'accepté'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : dev.statut === 'envoyé'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-slate-950 text-slate-400 border-slate-850'
                          }`}>
                            {dev.statut}
                          </span>
                        </div>
                        <span className="text-slate-400 block">Créé le : {new Date(dev.dateCreation).toLocaleDateString('fr-FR')}</span>
                        <div className="text-[10px] text-slate-500">
                          {dev.lignes.map((l: any) => l.description).join(', ')}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="font-extrabold text-sm text-white block">{dev.montantTTC} €</span>
                          <span className="text-[9px] text-slate-500 uppercase font-semibold">Montant TTC</span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditDevis(dev)}
                            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              window.print();
                            }}
                            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form / Devis Sheet (Print Layout option) */}
          {showForm && (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-6 print:border-none print:bg-white print:text-black">
              <div className="flex justify-between items-center print:hidden">
                <h3 className="text-lg font-bold text-white">{devisId ? 'Éditer le devis' : 'Nouveau devis commercial'}</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Printable header info */}
              <div className="hidden print:block space-y-4 pb-6 border-b border-gray-300">
                <div className="flex justify-between">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-wider text-black">PROSPECT INTEL</h2>
                    <span className="text-xs text-gray-500">Solution SaaS B2B de Prospection</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-black block">DEVIS</span>
                    <span className="text-xs text-gray-500">N° : {devisId ? 'Mise à jour' : 'Génération à la sauvegarde'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 text-xs pt-4">
                  <div>
                    <span className="font-bold text-gray-700 block mb-1">Facturé à :</span>
                    <span className="font-bold text-black block">{prospect?.nom}</span>
                    <span>{prospect?.adresse}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-700 block mb-1">Date :</span>
                    <span>{new Date().toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>

              {/* Form body */}
              <form onSubmit={handleSubmit} className="space-y-6 text-xs print:space-y-4 print:text-black">
                {/* TVA & Status print-hidden */}
                <div className="grid grid-cols-2 gap-4 print:hidden">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Statut du devis</label>
                    <select
                      value={statut}
                      onChange={(e) => setStatut(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                    >
                      <option value="brouillon">Brouillon</option>
                      <option value="envoyé">Envoyé</option>
                      <option value="accepté">Accepté (Signé / Gagné)</option>
                      <option value="refusé">Refusé</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Taux de TVA (%)</label>
                    <input
                      type="number"
                      value={tauxTVA}
                      onChange={(e) => setTauxTVA(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-800 pb-2 print:text-gray-700 print:border-gray-300">
                    Lignes de facturation
                  </span>

                  <div className="space-y-3">
                    {lignes.map((line, idx) => (
                      <div key={idx} className="flex gap-4 items-end print:gap-2">
                        <div className="flex-1 space-y-1 print:space-y-0">
                          <label className="text-[9px] text-slate-500 uppercase font-bold print:hidden">Description</label>
                          <input
                            type="text"
                            required
                            placeholder="Libellé de la prestation..."
                            value={line.description}
                            onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white print:border-none print:bg-white print:text-black print:px-0"
                          />
                        </div>

                        <div className="w-20 space-y-1 print:space-y-0 print:w-16">
                          <label className="text-[9px] text-slate-500 uppercase font-bold print:hidden">Quantité</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={line.quantite}
                            onChange={(e) => handleLineChange(idx, 'quantite', Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white print:border-none print:bg-white print:text-black print:px-0"
                          />
                        </div>

                        <div className="w-28 space-y-1 print:space-y-0 print:w-24">
                          <label className="text-[9px] text-slate-500 uppercase font-bold print:hidden">P.U. HT (€)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={line.prixUnitaire}
                            onChange={(e) => handleLineChange(idx, 'prixUnitaire', Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white print:border-none print:bg-white print:text-black print:px-0 print:text-right"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-2 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded-xl transition-all shrink-0 print:hidden"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="mt-2 px-3 py-1.5 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg flex items-center gap-1 print:hidden"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une ligne
                  </button>
                </div>

                {/* Summary / Totals */}
                <div className="pt-4 border-t border-slate-800 flex justify-end print:border-gray-300 print:text-black">
                  <div className="w-64 space-y-2 text-right">
                    <div className="flex justify-between text-slate-400 print:text-gray-700">
                      <span>Total HT :</span>
                      <span className="font-semibold text-slate-200 print:text-black">{totalHT.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-slate-400 print:text-gray-700">
                      <span>TVA ({tauxTVA}%) :</span>
                      <span className="font-semibold text-slate-200 print:text-black">{(totalTTC - totalHT).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-slate-200 font-extrabold text-sm border-t border-slate-800 pt-2 print:border-gray-300 print:text-black">
                      <span>Total TTC :</span>
                      <span>{totalTTC.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 print:hidden">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    Enregistrer le devis
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
