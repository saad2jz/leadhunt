'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck, Mail, Lock, Building, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomOrganisation, setNomOrganisation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // Mode connexion
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError(result.error);
        } else {
          router.push('/onboarding');
          router.refresh();
        }
      } else {
        // Mode inscription
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nomOrganisation, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Une erreur est survenue lors de l'inscription.");
        } else {
          setSuccess("Votre compte a été créé avec succès ! Connectez-vous maintenant.");
          setIsLogin(true);
          // Préremplit les champs pour simplifier
          setNomOrganisation('');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: 'google' | 'azure-ad') => {
    signIn(provider, { callbackUrl: '/onboarding' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Gradients d'arrière-plan décoratifs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white bg-clip-text">
            Prospect Intelligence
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isLogin 
              ? "Connectez-vous pour accéder à votre espace de prospection" 
              : "Créez votre organisation et commencez à sourcer"}
          </p>
        </div>

        {/* Onglets */}
        <div className="grid w-full grid-cols-2 gap-1 rounded-xl bg-slate-900/50 p-1 border border-slate-800/80">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ${
              isLogin 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ${
              !isLogin 
                ? 'bg-slate-800 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            S'enregistrer
          </button>
        </div>

        {/* Message d'erreur / succès */}
        {error && (
          <div className="rounded-lg bg-red-950/40 border border-red-500/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/30 p-4 text-sm text-emerald-400">
            {success}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <label htmlFor="org-name" className="block text-sm font-medium text-slate-300">
                Nom de l'organisation
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Building className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="org-name"
                  name="org-name"
                  type="text"
                  required
                  value={nomOrganisation}
                  onChange={(e) => setNomOrganisation(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 pl-10 pr-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  placeholder="Acme France SAS"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Adresse email
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 pl-10 pr-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="dirigeant@entreprise.fr"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Mot de passe
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 pl-10 pr-10 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-slate-500 hover:text-slate-300" />
                ) : (
                  <Eye className="h-5 w-5 text-slate-500 hover:text-slate-300" />
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-blue-500/10"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span className="flex items-center gap-1.5">
                  {isLogin ? 'Se connecter' : 'Créer mon organisation'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </button>
          </div>
        </form>

        {isLogin && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-slate-950 px-2 text-slate-500">Ou continuer avec</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthSignIn('google')}
                className="inline-flex w-full justify-center rounded-xl border border-slate-800 bg-slate-900/40 py-2.5 px-4 text-sm font-semibold text-slate-300 shadow-sm transition-all hover:bg-slate-900"
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuthSignIn('azure-ad')}
                className="inline-flex w-full justify-center rounded-xl border border-slate-800 bg-slate-900/40 py-2.5 px-4 text-sm font-semibold text-slate-300 shadow-sm transition-all hover:bg-slate-900"
              >
                Microsoft
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
