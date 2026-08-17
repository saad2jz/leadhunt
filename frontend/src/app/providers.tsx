'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';
import { initMockApi } from '@/lib/mock-api';

// Initialize mock API interceptor immediately on client-side loading to catch all early fetch calls
if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
  initMockApi();
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
