'use client';

import { SessionProvider } from 'next-auth/react';
import React, { useEffect } from 'react';
import { initMockApi } from '@/lib/mock-api';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Enable client-side API mocking only on GitHub Pages static deployment
    if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
      initMockApi();
    }
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
