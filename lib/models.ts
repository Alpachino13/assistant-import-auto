export type ModelOption = {
  id: string;
  label: string;
  provider: 'gemini' | 'local';
  badge: string;
  description: string;
  category: 'Gemini (Google)' | 'Local Agent (Home Server)';
};

export const MODELS: ModelOption[] = [
  // Gemini 3.x Flagship Models (Live on API)
  {
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    provider: 'gemini',
    badge: 'Recommandé & Stable',
    description: 'Vitesse instantanée, multimodal et haute disponibilité',
    category: 'Gemini (Google)',
  },
  {
    id: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    provider: 'gemini',
    badge: 'Dernière Génération',
    description: 'Dernière avancée IA Google pour les analyses complexes',
    category: 'Gemini (Google)',
  },
  {
    id: 'gemini-3.7-flash',
    label: 'Gemini 3.7 Flash',
    provider: 'gemini',
    badge: 'Avancé',
    description: 'Performances optimisées pour code et documents',
    category: 'Gemini (Google)',
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro',
    provider: 'gemini',
    badge: 'Expert Raisonnement',
    description: 'Grande fenêtre de contexte et déductions poussées',
    category: 'Gemini (Google)',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    provider: 'gemini',
    badge: 'Ultra-Rapide',
    description: 'Idéal pour requêtes légères sans latence',
    category: 'Gemini (Google)',
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    provider: 'gemini',
    badge: 'Preview',
    description: 'Génération 3 Flash',
    category: 'Gemini (Google)',
  },
  {
    id: 'gemini-flash-latest',
    label: 'Gemini Flash (Dernière)',
    provider: 'gemini',
    badge: 'Auto-update',
    description: 'Pointe vers la dernière release Flash',
    category: 'Gemini (Google)',
  },

  // Local Home Server via Tailscale
  {
    id: 'qwen2.5:3b',
    label: 'Qwen 2.5:3B (Local Agent)',
    provider: 'local',
    badge: 'Tailscale',
    description: 'Auto-hébergé sur votre Home Server (100.85.73.32:11434)',
    category: 'Local Agent (Home Server)',
  },
];

export const ALLOWED_MODEL_IDS: string[] = MODELS.map((m) => m.id);

// Stable live default model
export const DEFAULT_MODEL = 'gemini-3.6-flash';

// Home server Tailscale default endpoint
export const DEFAULT_LOCAL_AI_URL = ' https://isolated-aptitude-obtain.ngrok-free.dev';

// Helper to normalize any local URL (adds http:// if omitted)
export function normalizeLocalUrl(url?: string): string {
  const raw = (url || DEFAULT_LOCAL_AI_URL).trim();
  if (!raw) return DEFAULT_LOCAL_AI_URL;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
  return `http://${raw}`.replace(/\/+$/, '');
}
