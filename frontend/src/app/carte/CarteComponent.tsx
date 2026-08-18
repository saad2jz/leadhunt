'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Star, MapPin, Compass, Navigation } from 'lucide-react';
import Link from 'next/link';

// Résout le bug célèbre des icônes de marqueurs Leaflet avec Next.js / Webpack
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Prospect {
  id: string;
  nom: string;
  adresse: string | null;
  ville: string | null;
  statut: string;
  score: number | null;
  latitude: number | null;
  longitude: number | null;
}

export default function CarteComponent({ prospects }: { prospects: Prospect[] }) {
  // Filtre les prospects géocodés
  const geoProspects = prospects.filter(p => p.latitude !== null && p.longitude !== null) as (Prospect & { latitude: number; longitude: number })[];
  const [tour, setTour] = useState<Prospect[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  // Calcule la distance de Haversine (en km) entre deux coordonnées GPS
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Algorithme de tri glouton pour optimiser la tournée (TSP heuristique simple)
  const optimiserTournee = () => {
    if (geoProspects.length === 0) return;

    const unvisited = [...geoProspects];
    const path: Prospect[] = [];
    
    // On commence arbitrairement avec le premier prospect
    let current = unvisited.shift()!;
    path.push(current);

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const nextCandidate = unvisited[i];
        if (nextCandidate) {
          const dist = getDistance(
            current.latitude!, current.longitude!,
            nextCandidate.latitude!, nextCandidate.longitude!
          );
          if (dist < minDistance) {
            minDistance = dist;
            nearestIndex = i;
          }
        }
      }

      current = unvisited.splice(nearestIndex, 1)[0]!;
      path.push(current);
    }

    setTour(path);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[70vh]">
      {/* Colonne Carte */}
      <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden relative min-h-[400px]">
        <MapContainer 
          center={[46.2276, 2.2137]} 
          zoom={6} 
          style={{ height: '100%', width: '100%', background: '#020617' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {geoProspects.map((p) => (
            <Marker 
              key={p.id} 
              position={[p.latitude, p.longitude]}
              eventHandlers={{
                click: () => setSelectedProspect(p),
              }}
            >
              <Popup>
                <div className="text-slate-900 p-1.5 space-y-2">
                  <h4 className="font-bold text-sm block">{p.nom}</h4>
                  <span className="text-[10px] text-slate-500 block">{p.adresse}, {p.ville}</span>
                  <div className="flex gap-2 items-center">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-bold uppercase">
                      {p.statut}
                    </span>
                    <span className="text-xs font-bold text-yellow-600 flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-current text-yellow-500" /> {p.score}/100
                    </span>
                  </div>
                  <Link 
                    href={`/prospects/detail/?id=${p.id}`}
                    className="block text-center mt-2 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold"
                  >
                    Voir la fiche
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Colonne Optimisation Tournée */}
      <div className="lg:col-span-1 p-5 rounded-2xl border border-slate-800 bg-slate-900/20 flex flex-col justify-between space-y-4">
        <div className="space-y-4 flex-1 overflow-y-auto">
          <div>
            <h3 className="text-sm font-bold text-white uppercase flex items-center gap-1.5">
              <Compass className="h-4.5 w-4.5 text-blue-500" />
              Optimisation de Tournée
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Triez vos rendez-vous par proximité géographique gloutonne.</p>
          </div>

          <button
            type="button"
            onClick={optimiserTournee}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 transition-all"
          >
            <Navigation className="h-4 w-4" />
            Optimiser le parcours ({geoProspects.length} pins)
          </button>

          {tour.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500">Étapes recommandées :</span>
              <div className="relative border-l border-slate-850 pl-4 ml-2 space-y-3 text-xs">
                {tour.map((p, idx) => (
                  <div key={p.id} className="relative">
                    {/* Dot step index */}
                    <div className="absolute -left-[24px] top-0.5 h-4 w-4 rounded-full bg-slate-950 border border-blue-500 flex items-center justify-center text-[8px] font-bold text-blue-400">
                      {idx + 1}
                    </div>
                    <div>
                      <span className="font-bold text-white block truncate">{p.nom}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{p.ville}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info footer */}
        <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center gap-2.5 text-[10px] text-slate-400">
          <MapPin className="h-4.5 w-4.5 text-blue-500 shrink-0" />
          <span>{prospects.length - geoProspects.length} prospects n'ont pas d'adresse géocodée et sont exclus.</span>
        </div>
      </div>
    </div>
  );
}
