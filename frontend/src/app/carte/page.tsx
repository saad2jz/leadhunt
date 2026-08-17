'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import { MapPin } from 'lucide-react';

// Chargement dynamique du composant Leaflet uniquement côté client
const CarteComponent = dynamic(() => import('./CarteComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center bg-slate-900/20 border border-slate-800 rounded-2xl">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  ),
});

type ProspectMap = {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  statut: string;
  score: number | null;
  latitude: number | null;
  longitude: number | null;
};

export default function CartePage() {
  const [prospects, setProspects] = useState<ProspectMap[]>([]);

  useEffect(() => {
    fetch('/api/prospects')
      .then(r => r.json())
      .then(data => setProspects(data && Array.isArray(data.prospects) ? data.prospects : []))
      .catch(() => setProspects([]));
  }, []);

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Cartographie GPS</span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Carte des Prospects</h1>
            <p className="text-slate-400 text-sm mt-1">
              Visualisez la répartition de vos contacts cibles sur la carte et optimisez vos tournées sur le terrain.
            </p>
          </div>

          {/* Leaflet Dynamic Component */}
          <CarteComponent prospects={prospects} />

        </div>
      </main>
    </div>
  );
}
