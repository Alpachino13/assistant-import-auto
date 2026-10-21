'use client';

import { ReactNode } from 'react';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Instanciation hors du composant pour éviter les problèmes de pré-rendu (SSR) de Next.js.
let convexClient: ConvexReactClient | null = null;

if (convexUrl && /^https?:\/\//i.test(convexUrl)) {
  try {
    convexClient = new ConvexReactClient(convexUrl);
  } catch (e) {
    console.warn('Convex client init error:', e);
  }
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convexClient) return <>{children}</>;
  return <ConvexAuthProvider client={convexClient}>{children}</ConvexAuthProvider>;
}
