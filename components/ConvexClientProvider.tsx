'use client';

import { ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// L'instanciation est sortie du composant pour éviter que Next.js 
// n'analyse le Math.random() interne de Convex pendant le pré-rendu (SSR).
let convexClient: ConvexReactClient | null = null;

if (convexUrl && /^https?:\/\//i.test(convexUrl)) {
  try {
    convexClient = new ConvexReactClient(convexUrl);
  } catch (e) {
    console.warn('Convex client init error:', e);
  }
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convexClient) {
    // If NEXT_PUBLIC_CONVEX_URL is not yet connected to a live deployment,
    // the app continues seamlessly with browser storage while Convex schemas are ready.
    return <>{children}</>;
  }

  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}