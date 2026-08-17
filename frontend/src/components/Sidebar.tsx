'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useModulesActifs } from '@/hooks/useModulesActifs';
import { 
  Building2, LayoutDashboard, Search, Users, ShieldAlert, CreditCard, 
  Settings, LogOut, ShieldCheck, UserCheck, Sparkles, Kanban, Calendar,
  MapPin, Eye, Compass, Link2
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { plan, aModuleActif, estSuperAdmin, role } = useModulesActifs();

  const menuItems = [
    {
      name: 'Tableau de bord',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
      show: true,
    },
    {
      name: 'Recherche SIRENE',
      href: '/sirene',
      icon: Search,
      active: pathname === '/sirene',
      show: aModuleActif('sirene') || aModuleActif('recherche_intelligente'),
    },
    {
      name: 'Recherche IA',
      href: '/prospection',
      icon: Sparkles,
      active: pathname === '/prospection',
      show: aModuleActif('recherche_intelligente') || plan === 'pro' || plan === 'business' || plan === 'entreprise',
    },
    {
      name: 'Veille Commerciale',
      href: '/veille',
      icon: Eye,
      active: pathname === '/veille',
      show: true,
    },
    {
      name: 'Leads Inbound',
      href: '/inbound',
      icon: Compass,
      active: pathname === '/inbound',
      show: true,
    },
    {
      name: 'Base Prospects',
      href: '/prospects',
      icon: Users,
      active: pathname === '/prospects' || pathname.startsWith('/prospects/'),
      show: true,
    },
    {
      name: 'Carte Prospects',
      href: '/carte',
      icon: MapPin,
      active: pathname === '/carte',
      show: true,
    },
    {
      name: 'Campagnes & Pipelines',
      href: '/campagnes',
      icon: Kanban,
      active: pathname.startsWith('/campagnes'),
      show: aModuleActif('pipeline') || plan === 'pro' || plan === 'business' || plan === 'entreprise',
    },
    {
      name: 'Relances du jour',
      href: '/relances',
      icon: Calendar,
      active: pathname === '/relances',
      show: true,
    },
    {
      name: 'Intégrations CRM',
      href: '/settings/integrations',
      icon: Link2,
      active: pathname === '/settings/integrations',
      show: true,
    },
    {
      name: 'Liste Noire (RGPD)',
      href: '/blacklist',
      icon: ShieldAlert,
      active: pathname === '/blacklist',
      show: aModuleActif('liste_noire'),
    },
    {
      name: 'Mon abonnement',
      href: '/settings/subscription',
      icon: CreditCard,
      active: pathname === '/settings/subscription',
      show: true,
    },
    {
      name: 'Administration',
      href: '/admin',
      icon: ShieldCheck,
      active: pathname === '/admin',
      show: estSuperAdmin,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 shrink-0">
      <div className="flex flex-col pt-6 overflow-y-auto">
        {/* En-tête / Logo */}
        <div className="px-6 mb-8 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/10">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-wide">Prospect Intel</h1>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{plan}</span>
          </div>
        </div>

        {/* Liens de Navigation */}
        <nav className="px-4 space-y-1">
          {menuItems
            .filter(item => item.show)
            .map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    item.active
                      ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 pl-3'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${item.active ? 'text-blue-400' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
        </nav>
      </div>

      {/* Profil de l'utilisateur & Déconnexion */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/20">
        <div className="flex items-center gap-3 px-2 py-1.5 mb-4">
          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700">
            {role.substring(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">{role}</p>
            <span className="text-[10px] text-slate-500">Actif</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/20 transition-all"
        >
          <LogOut className="h-4 w-4 text-red-400" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
