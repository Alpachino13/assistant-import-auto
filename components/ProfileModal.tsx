'use client';

import { useState } from 'react';
import {
  X,
  HardDrives,
  Check,
  SignOut,
  SignIn,
  Sparkle,
  Database,
} from '@phosphor-icons/react';
import { DEFAULT_LOCAL_AI_URL, normalizeLocalUrl } from '@/lib/models';
import { isConvexActive, syncUserToConvex } from '@/lib/convexSync';

export type UserProfile = {
  username: string;
  email: string;
  avatarUrl: string;
  isLoggedIn: boolean;
  localAiUrl: string;
};

export const DEFAULT_PROFILE: UserProfile = {
  username: 'Alex',
  email: 'alex@buildhub.ai',
  avatarUrl:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
  isLoggedIn: true,
  localAiUrl: DEFAULT_LOCAL_AI_URL,
};

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80',
];

type Props = {
  profile: UserProfile;
  onUpdate: (updated: UserProfile) => void;
  onClose: () => void;
};

export default function ProfileModal({ profile, onUpdate, onClose }: Props) {
  const [tab, setTab] = useState<'profile' | 'server' | 'convex' | 'auth'>('profile');
  const [username, setUsername] = useState(profile.username);
  const [email, setEmail] = useState(profile.email);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [localAiUrl, setLocalAiUrl] = useState(profile.localAiUrl || DEFAULT_LOCAL_AI_URL);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profile,
      username: username.trim() || 'Alex',
      email: email.trim(),
      avatarUrl: avatarUrl.trim(),
      localAiUrl: normalizeLocalUrl(localAiUrl),
    };
    onUpdate(updated);
    syncUserToConvex(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const uname = loginUsername.trim() || 'Alex';
    const updated: UserProfile = {
      ...profile,
      username: uname,
      email: `${uname.toLowerCase()}@buildhub.ai`,
      isLoggedIn: true,
    };
    onUpdate(updated);
    syncUserToConvex(updated);
    setTab('profile');
  };

  const handleLogout = () => {
    onUpdate({
      ...profile,
      isLoggedIn: false,
    });
    setTab('auth');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-[#131317] border border-[#2b2b36] p-6 shadow-2xl text-left text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="rounded-full overflow-hidden ring-2 ring-amber-400 shrink-0"
            style={{ width: 44, height: 44 }}
          >
            <img
              src={avatarUrl}
              alt={username}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {profile.isLoggedIn ? username : 'Non connecté'}
              {profile.isLoggedIn && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Connecté
                </span>
              )}
            </h3>
            <p className="text-xs text-neutral-400">
              {profile.isLoggedIn ? email : 'Connectez-vous pour sauvegarder dans Convex'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#24242e] mb-4 gap-1 text-xs font-semibold overflow-x-auto pb-1">
          <button
            onClick={() => setTab('profile')}
            className={`pb-2 px-2 transition-colors relative whitespace-nowrap cursor-pointer ${
              tab === 'profile' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Profil
          </button>
          <button
            onClick={() => setTab('server')}
            className={`pb-2 px-2 transition-colors relative whitespace-nowrap cursor-pointer ${
              tab === 'server' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Home Server (Tailscale)
          </button>
          <button
            onClick={() => setTab('convex')}
            className={`pb-2 px-2 transition-colors relative whitespace-nowrap cursor-pointer ${
              tab === 'convex' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Convex DB
          </button>
          <button
            onClick={() => setTab('auth')}
            className={`pb-2 px-2 transition-colors relative whitespace-nowrap cursor-pointer ${
              tab === 'auth' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {profile.isLoggedIn ? 'Session' : 'Connexion'}
          </button>
        </div>

        {/* Tab 1: Profile Customization */}
        {tab === 'profile' && (
          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Nom d&apos;utilisateur (affiché dans le chat)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: Alex, Karim, Sarah..."
                className="w-full rounded-xl bg-[#1b1b22] border border-[#2c2c38] px-3.5 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-400/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Adresse e-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
                className="w-full rounded-xl bg-[#1b1b22] border border-[#2c2c38] px-3.5 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-400/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
                <span>Photo de profil</span>
                <span className="text-[10px] text-neutral-500 font-normal">Presets :</span>
              </label>
              <div className="flex items-center gap-2 mb-2">
                {AVATAR_PRESETS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatarUrl(url)}
                    className={`size-8 rounded-full overflow-hidden transition-transform cursor-pointer ${
                      avatarUrl === url ? 'ring-2 ring-amber-400 scale-105' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Preset ${i}`} className="size-full object-cover" />
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="URL d'image personnalisée"
                className="w-full rounded-xl bg-[#1b1b22] border border-[#2c2c38] px-3 py-1.5 text-[11px] text-neutral-300 placeholder-neutral-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {savedNotice ? (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <Check size={14} weight="bold" /> Enregistré !
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                className="rounded-full bg-amber-400 px-5 py-2 text-xs font-bold text-black hover:bg-amber-300 transition-colors shadow-md shadow-amber-400/20 cursor-pointer"
              >
                Sauvegarder
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Home Server & Local AI Agent Setup (Tailscale) */}
        {tab === 'server' && (
          <div className="space-y-3.5">
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                <HardDrives size={16} weight="fill" />
                <span>Tailscale Home Server (Qwen 2.5:3B)</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Connecté à votre réseau Tailscale. Les requêtes sont directement envoyées à votre serveur local.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Adresse Tailscale Ollama
              </label>
              <input
                type="text"
                value={localAiUrl}
                onChange={(e) => setLocalAiUrl(e.target.value)}
                placeholder="100.85.73.32:11434"
                className="w-full rounded-xl bg-[#1b1b22] border border-[#2c2c38] px-3.5 py-2 text-xs text-amber-300 placeholder-neutral-500 outline-none focus:border-amber-400/60 font-mono"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Adresse configurée : <code>{normalizeLocalUrl(localAiUrl)}</code>
              </p>
            </div>

            <div className="rounded-xl bg-[#18181f] p-3 border border-[#262630] text-[11px] text-neutral-400 space-y-1">
              <p className="font-semibold text-neutral-200">Commande sur votre serveur :</p>
              <code className="block bg-black/40 px-2.5 py-1.5 rounded text-emerald-300 font-mono text-[10px]">
                ollama run qwen2.5:3b
              </code>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-amber-400 px-5 py-2 text-xs font-bold text-black hover:bg-amber-300 transition-colors shadow-md shadow-amber-400/20 cursor-pointer"
              >
                Mettre à jour l&apos;adresse
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Convex Database & File Stockage */}
        {tab === 'convex' && (
          <div className="space-y-3.5">
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                <Database size={16} weight="fill" />
                <span>Base de données & Stockage Convex</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Convex stocke vos utilisateurs, conversations, messages, blueprints et documents dans le cloud.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#18181f] border border-[#262630]">
                <span className="text-neutral-400">Statut du backend Convex :</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isConvexActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                  }`}
                >
                  {isConvexActive ? 'En ligne & Synchronisé' : 'Schémas prêts (Local fallback)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#18181f] border border-[#262630] text-[11px] text-neutral-300 space-y-1">
                <p className="font-semibold text-white">Tables configurées :</p>
                <ul className="list-disc pl-4 text-neutral-400 space-y-0.5 text-[10px]">
                  <li><code>users</code> : Comptes, identifiants, profils</li>
                  <li><code>conversations</code> & <code>messages</code> : Historique complet</li>
                  <li><code>files</code> : Stockage de fichiers (plans, PDF, photos)</li>
                  <li><code>dossierDocs</code> : Analyses et pièces justificatives</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-neutral-400">
                <p className="text-white font-medium mb-1">Pour déployer votre backend Convex :</p>
                <code className="text-amber-300 font-mono text-[10px]">npx convex dev</code>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Login / Sign In / Switch Account */}
        {tab === 'auth' && (
          <div className="space-y-4">
            {profile.isLoggedIn ? (
              <div className="space-y-4 text-center py-2">
                <div className="size-16 rounded-full overflow-hidden mx-auto ring-2 ring-amber-400 shadow-lg">
                  <img src={profile.avatarUrl} alt={profile.username} className="size-full object-cover" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{profile.username}</h4>
                  <p className="text-xs text-neutral-400">{profile.email}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-neutral-300">
                  Connecté en tant que <strong>{profile.username}</strong>. Toutes les actions sont synchronisées.
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full rounded-full border border-red-500/40 bg-red-500/10 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
                >
                  <SignOut size={16} />
                  <span>Se déconnecter</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3">
                <p className="text-xs text-neutral-400">
                  Connectez-vous pour synchroniser votre session avec Convex DB.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Nom d&apos;utilisateur ou E-mail
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Ex: Alex"
                    className="w-full rounded-xl bg-[#1b1b22] border border-[#2c2c38] px-3.5 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-400/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-[#1b1b22] border border-[#2c2c38] px-3.5 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-400/60"
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 w-full rounded-full bg-amber-400 py-2.5 text-xs font-bold text-black hover:bg-amber-300 transition-colors shadow-md shadow-amber-400/20 mt-2 cursor-pointer"
                >
                  <SignIn size={16} weight="bold" />
                  <span>Se connecter</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
