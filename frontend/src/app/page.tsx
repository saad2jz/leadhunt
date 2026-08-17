'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { 
  Users, UserCheck, ShieldAlert, Sparkles, Plus, Search, 
  TrendingUp, BarChart3, Clock, AlertCircle, Phone, Mail, 
  Target, Award, Calendar, CheckCircle2, ChevronRight 
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Weekly Goals (sauvegardés en LocalStorage)
  const [weeklyCallGoal, setWeeklyCallGoal] = useState<number>(30);
  const [weeklyMtgGoal, setWeeklyMtgGoal] = useState<number>(5);

  useEffect(() => {
    // Restaure les objectifs depuis localStorage si présents
    const savedCalls = localStorage.getItem('goal_weekly_calls');
    const savedMeetings = localStorage.getItem('goal_weekly_meetings');
    if (savedCalls) setWeeklyCallGoal(Number(savedCalls));
    if (savedMeetings) setWeeklyMtgGoal(Number(savedMeetings));

    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const stats = await res.json();
        setData(stats);
      } else {
        setError('Impossible de charger les statistiques du tableau de bord.');
      }
    } catch (e) {
      setError('Erreur réseau lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = (key: string, val: number) => {
    localStorage.setItem(key, val.toString());
    if (key === 'goal_weekly_calls') setWeeklyCallGoal(val);
    if (key === 'goal_weekly_meetings') setWeeklyMtgGoal(val);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex bg-slate-950 text-slate-100 min-h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Une erreur est survenue</h2>
            <p className="text-slate-400 text-sm">{error || "Erreur réseau"}</p>
            <button 
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold text-white"
            >
              Réessayer
            </button>
          </div>
        </main>
      </div>
    );
  }

  const { metrics, activityGraphData, conversionFunnel, attentionPoints, recentProspects } = data;

  // Calcul du taux de conversion
  const totalLeads = conversionFunnel.aAppeler + conversionFunnel.rdvPris + conversionFunnel.client;
  const mtgConvRate = totalLeads > 0 ? Math.round((conversionFunnel.rdvPris / totalLeads) * 100) : 0;
  const clientConvRate = totalLeads > 0 ? Math.round((conversionFunnel.client / totalLeads) * 100) : 0;

  // Vérifier s'il y a des alertes de fuite actives
  const alertesActives = 
    attentionPoints.rdvPrisSansSuivi > 0 ||
    attentionPoints.fichesIncompletes > 0 ||
    attentionPoints.comptesDormants > 0 ||
    attentionPoints.sequencesBloquees > 0 ||
    attentionPoints.relancesEnRetard > 0;

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Tableau de bord intelligent</span>
              <h1 className="text-3xl font-extrabold text-white mt-1">Performances Commerciales</h1>
              <p className="text-slate-400 text-sm mt-1">
                Visualisez vos quotas réels d'appels, vos opportunités chaudes et configurez vos objectifs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/prospection"
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10"
              >
                <Search className="h-4 w-4" />
                Sourcing Prospect IA
              </Link>
            </div>
          </div>

          {/* Cartes Métriques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Base de Prospects */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between hover:border-slate-800 transition-all">
              <div className="space-y-1.5">
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Prospects</span>
                <h3 className="text-3xl font-bold text-white">{metrics.prospectsCount}</h3>
                <span className="text-[10px] text-slate-400 block">{metrics.contactsCount} décideurs rattachés</span>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6" />
              </div>
            </div>

            {/* Appels du Jour */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between hover:border-slate-800 transition-all">
              <div className="space-y-1.5">
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Appels Réels</span>
                <h3 className="text-3xl font-bold text-white">{metrics.callsToday}</h3>
                <span className="text-[10px] text-slate-400 block">{metrics.callsThisWeek} effectués cette semaine</span>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-600/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Phone className="h-6 w-6" />
              </div>
            </div>

            {/* Emails du Jour */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between hover:border-slate-800 transition-all">
              <div className="space-y-1.5">
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Emails Envoyés</span>
                <h3 className="text-3xl font-bold text-white">{metrics.emailsToday}</h3>
                <span className="text-[10px] text-slate-400 block">{metrics.emailsThisWeek} cette semaine via Resend</span>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-600/10 text-purple-500 flex items-center justify-center shrink-0">
                <Mail className="h-6 w-6" />
              </div>
            </div>

            {/* Taux de conversion global */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex items-center justify-between hover:border-slate-800 transition-all">
              <div className="space-y-1.5">
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Taux de closing</span>
                <h3 className="text-3xl font-bold text-white">{clientConvRate}%</h3>
                <span className="text-[10px] text-slate-400 block">{mtgConvRate}% en rendez-vous pris</span>
              </div>
              <div className="h-12 w-12 rounded-xl bg-yellow-600/10 text-yellow-500 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Section : Fuites détectées / Points d'attention */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Fuites détectées (Points d'attention)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Alertes opérationnelles calculées automatiquement sur votre pipeline.</p>
            </div>

            {!alertesActives ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Aucune fuite de pipeline détectée, félicitations ! Toutes vos relances et fiches prospects sont à jour. 👍</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {attentionPoints.rdvPrisSansSuivi > 0 && (
                  <Link 
                    href="/prospects"
                    className="flex justify-between items-center p-4 rounded-xl bg-red-950/20 border border-red-500/20 hover:border-red-500/40 transition-all"
                  >
                    <div>
                      <span className="font-bold text-red-400 block">{attentionPoints.rdvPrisSansSuivi} prospects en RDV sans suivi</span>
                      <span className="text-slate-400 text-[10px]">Aucun contact loggé depuis plus de 10 jours.</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-red-400" />
                  </Link>
                )}

                {attentionPoints.fichesIncompletes > 0 && (
                  <Link 
                    href="/prospects"
                    className="flex justify-between items-center p-4 rounded-xl bg-yellow-950/20 border border-yellow-500/20 hover:border-yellow-500/40 transition-all"
                  >
                    <div>
                      <span className="font-bold text-yellow-400 block">{attentionPoints.fichesIncompletes} fiches prospects incomplètes</span>
                      <span className="text-slate-400 text-[10px]">Absence d'emails, téléphones ou contacts qualifiés.</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-yellow-400" />
                  </Link>
                )}

                {attentionPoints.comptesDormants > 0 && (
                  <Link 
                    href="/prospects"
                    className="flex justify-between items-center p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <div>
                      <span className="font-bold text-slate-300 block">{attentionPoints.comptesDormants} prospects dormants</span>
                      <span className="text-slate-400 text-[10px]">Aucune interaction effectuée depuis plus de 21 jours.</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                )}

                {attentionPoints.sequencesBloquees > 0 && (
                  <Link 
                    href="/settings/sequences"
                    className="flex justify-between items-center p-4 rounded-xl bg-red-950/20 border border-red-500/20 hover:border-red-500/40 transition-all"
                  >
                    <div>
                      <span className="font-bold text-red-400 block">{attentionPoints.sequencesBloquees} prospects bloqués en séquence</span>
                      <span className="text-slate-400 text-[10px]">Date d'envoi dépassée (vérifiez vos crédits d'API Resend).</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-red-400" />
                  </Link>
                )}

                {attentionPoints.relancesEnRetard > 0 && (
                  <Link 
                    href="/relances"
                    className="flex justify-between items-center p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 hover:border-purple-500/40 transition-all"
                  >
                    <div>
                      <span className="font-bold text-purple-400 block">{attentionPoints.relancesEnRetard} relances clients en retard</span>
                      <span className="text-slate-400 text-[10px]">Date de rappel programmée dépassée.</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-purple-400" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Section centrale : Objectifs & Séquence d'activité */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Historique interactions - Bar Chart */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Activité des 14 derniers jours
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Nombre total d'interactions enregistrées quotidiennement.</p>
              </div>

              {/* Chart container */}
              <div className="h-48 flex items-end gap-2.5 pt-4 border-b border-slate-800/80 pb-2">
                {activityGraphData.map((day: any) => {
                  const maxCount = Math.max(...activityGraphData.map((d: any) => d.count), 1);
                  const heightPct = Math.max((day.count / maxCount) * 100, 5); // Au moins 5% pour être visible

                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <span className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-all bg-slate-950 text-white font-mono text-[9px] px-2 py-0.5 rounded border border-slate-800 pointer-events-none z-10">
                        {day.count} act.
                      </span>

                      {/* Bar */}
                      <div 
                        className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-indigo-500 group-hover:from-blue-500 group-hover:to-indigo-400 transition-all shadow-md shadow-blue-500/5 cursor-pointer"
                        style={{ height: `${heightPct}%` }}
                      />

                      {/* Label */}
                      <span className="text-[8px] text-slate-500 mt-2 font-bold tracking-tight text-center shrink-0 w-full truncate">
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Objectifs hebdomadaires (Linear Progress) */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Objectifs Hebdomadaires
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Ajustez vos quotas hebdomadaires de vente.</p>
              </div>

              <div className="space-y-6 text-xs">
                {/* Objectif Appels */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-300">Appels passés : {metrics.callsThisWeek} / {weeklyCallGoal}</span>
                    <span className="text-[10px] text-slate-400">{Math.round((metrics.callsThisWeek / weeklyCallGoal) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min((metrics.callsThisWeek / weeklyCallGoal) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={weeklyCallGoal}
                      onChange={(e) => handleSaveGoal('goal_weekly_calls', Number(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>

                {/* Objectif RDV pris */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-300">RDV obtenus : {conversionFunnel.rdvPris} / {weeklyMtgGoal}</span>
                    <span className="text-[10px] text-slate-400">{Math.round((conversionFunnel.rdvPris / weeklyMtgGoal) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min((conversionFunnel.rdvPris / weeklyMtgGoal) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={weeklyMtgGoal}
                      onChange={(e) => handleSaveGoal('goal_weekly_meetings', Number(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Section Inférieure : Prospects Récents */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Derniers prospects repérés
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Suivi des entreprises sourcing.</p>
            </div>

            {recentProspects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-slate-700" />
                <p className="text-slate-400 text-sm">Aucun prospect importé pour l'instant.</p>
                <Link href="/sirene" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                  Sourcing Sirene
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 text-xs">
                {recentProspects.map((prospect: any) => (
                  <div key={prospect.id} className="py-3 flex justify-between items-center">
                    <div>
                      <Link href={`/prospects/${prospect.id}`} className="font-bold text-white hover:text-blue-400 block">
                        {prospect.nom}
                      </Link>
                      <span className="text-slate-500 text-[10px] block mt-0.5">SIREN : {prospect.siren || 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {prospect.statut}
                      </span>
                      <span className="text-slate-500 font-semibold">
                        {prospect.contacts.length} décideurs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
