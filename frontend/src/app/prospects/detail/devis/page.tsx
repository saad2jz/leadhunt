import React, { Suspense } from 'react';
import ClientPage from './ClientPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="bg-slate-950 text-slate-100 min-h-screen p-8">Chargement...</div>}>
      <ClientPage />
    </Suspense>
  );
}
