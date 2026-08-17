'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { ShieldAlert, Plus, Trash2, Mail, Phone, Building2, HelpCircle } from 'lucide-react';

export default function BlacklistPage() {
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Formulaire d'ajout
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [siren, setSiren] = useState('');
  const [motif, setMotif] = useState<'Demande RGPD' | 'Opposition demarchage' | 'Autre'>('Demande RGPD');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const fetchBlacklist = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/liste-noire');
      if (res.ok) {
        const data = await res.json();
        setBlacklist(data.blacklist || []);
      } else {
        setError('Erreur lors du chargement de la liste noire.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone && !siren) {
      setError('Veuillez spécifier au moins un identifiant (Email, Téléphone ou SIREN).');
      return;
    }

    setAdding(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/liste-noire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || null,
          telephone: phone || null,
          siren: siren || null,
          motif,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Opposition enregistrée avec succès.');
        setEmail('');
        setPhone('');
        setSiren('');
        fetchBlacklist();
      } else {
        setError(data.error || 'Erreur lors de l\'enregistrement.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment retirer cette entrée de la liste noire ? La personne ou l\'entreprise pourra de nouveau être contactée.')) return;

    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/liste-noire?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage('Entrée retirée avec succès.');
        fetchBlacklist();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la suppression.');
      }
    } catch (err) {
      setError('Erreur réseau.');
    }
  };

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Conformité légale</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Registre "Ne plus contacter"</h1>
            <p className="text-slate-400 text-sm mt-1">
              Garantissez votre conformité RGPD et Naegelen. Tout contact figurant dans cette liste bloque automatiquement les emails et appels.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulaire d'ajout */}
            <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6 h-fit">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-500" />
                  Ajouter une opposition
                </h3>
                <p className="text-xs text-slate-500 mt-1">Bloquez un email, un téléphone ou un SIREN d'entreprise complet.</p>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Email à bloquer</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="contact@exemple.fr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Téléphone à bloquer</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="0612345678"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">SIREN à bloquer</label>
                  <input
                    type="text"
                    maxLength={9}
                    value={siren}
                    onChange={(e) => setSiren(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="9 chiffres (Ex: 123456789)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Motif légal</label>
                  <select
                    value={motif}
                    onChange={(e) => setMotif(e.target.value as any)}
                    className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Demande RGPD">Demande de suppression (RGPD)</option>
                    <option value="Opposition demarchage">Opposition au démarchage (Naegelen)</option>
                    <option value="Autre">Autre motif commercial</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={adding}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md shadow-blue-500/10 transition-all disabled:opacity-50"
                >
                  {adding ? 'Enregistrement...' : 'Bloquer le contact'}
                </button>
              </form>
            </div>

            {/* Liste de la liste noire */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  Liste noire de l'organisation
                </h3>
                <p className="text-xs text-slate-500 mt-1">Liste des oppositions actives. Les suppressions restaurent l'autorisation de contact.</p>
              </div>

              {/* Feedback messages inside col */}
              {error && (
                <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400">
                  {message}
                </div>
              )}

              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : blacklist.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Aucun contact ou entreprise inscrit sur la liste noire.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                        <th className="py-3 px-4">Cible bloquée</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Motif</th>
                        <th className="py-3 px-4">Date d'ajout</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-sm">
                      {blacklist.map((entry) => {
                        let value = '';
                        let type = '';
                        let Icon = HelpCircle;

                        if (entry.email) {
                          value = entry.email;
                          type = 'Email';
                          Icon = Mail;
                        } else if (entry.telephone) {
                          value = entry.telephone;
                          type = 'Téléphone';
                          Icon = Phone;
                        } else if (entry.siren) {
                          value = `SIREN ${entry.siren}`;
                          type = 'Entreprise';
                          Icon = Building2;
                        }

                        return (
                          <tr key={entry.id} className="hover:bg-slate-900/10">
                            <td className="py-3 px-4 font-semibold text-slate-200">
                              <span className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-slate-500" />
                                {value}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-400">{type}</td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                entry.motif === 'Demande RGPD' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                entry.motif === 'Opposition demarchage' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {entry.motif}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">
                              {new Date(entry.dateAjout).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-950/20 transition-all"
                                title="Débloquer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
