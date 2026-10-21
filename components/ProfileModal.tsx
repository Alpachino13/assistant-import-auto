'use client';

import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@/convex/_generated/api';
import { X, Check, SignOut, SignIn, User } from '@phosphor-icons/react';
import { DEFAULT_LOCAL_AI_URL } from '@/lib/models';

export type UserProfile = {
  username: string;
  email: string;
  avatarUrl: string;
  isLoggedIn: boolean;
  localAiUrl: string;
};

// Profil affiché pour un visiteur non connecté
export const DEFAULT_PROFILE: UserProfile = {
  username: 'Invité',
  email: '',
  avatarUrl:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
  isLoggedIn: false,
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
  /** 'upload' : la fenêtre s'ouvre parce qu'un envoi de document exige un compte */
  reason?: 'upload' | null;
  onClose: () => void;
};

const inputClass =
  'w-full rounded-xl bg-[#1b1b22] border border-[#2c2c38] px-3.5 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-400/60';

export default function ProfileModal({ profile, reason = null, onClose }: Props) {
  const { signIn, signOut } = useAuthActions();
  const updateProfile = useMutation(api.users.updateProfile);

  const [tab, setTab] = useState<'profile' | 'session'>('profile');

  // Formulaire de profil
  const [username, setUsername] = useState(profile.username);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Formulaire de connexion / inscription
  const [mode, setMode] = useState<'signIn' | 'signUp'>(reason === 'upload' ? 'signUp' : 'signIn');
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Le profil arrive de façon asynchrone depuis Convex : on resynchronise le formulaire.
  useEffect(() => {
    setUsername(profile.username);
    setAvatarUrl(profile.avatarUrl);
  }, [profile.username, profile.avatarUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await updateProfile({
        username: username.trim() || profile.username,
        avatarUrl: avatarUrl.trim() || profile.avatarUrl,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } catch {
      setSaveError("Impossible d'enregistrer le profil. Vérifiez le nom et l'URL de l'image.");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setBusy(true);
    try {
      await signIn('password', {
        flow: mode,
        email: authEmail.trim(),
        password: authPassword,
        ...(mode === 'signUp' ? { username: authUsername.trim() } : {}),
      });
      setAuthPassword('');
      setTab('profile');
    } catch {
      setAuthError(
        mode === 'signIn'
          ? 'E-mail ou mot de passe incorrect.'
          : "Impossible de créer le compte : e-mail déjà utilisé ou mot de passe trop court (8 caractères minimum)."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
  };

  const tabClass = (active: boolean) =>
    `pb-2 px-2 transition-colors relative whitespace-nowrap cursor-pointer ${
      active ? 'text-amber-400 border-b-2 border-amber-400' : 'text-neutral-400 hover:text-white'
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-[#131317] border border-[#2b2b36] p-6 shadow-2xl text-left text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        {/* En-tête */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="rounded-full overflow-hidden ring-2 ring-amber-400 shrink-0 flex items-center justify-center bg-[#1b1b22]"
            style={{ width: 44, height: 44 }}
          >
            {profile.isLoggedIn ? (
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <User size={22} className="text-neutral-400" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {profile.isLoggedIn ? profile.username : 'Non connecté'}
              {profile.isLoggedIn && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Connecté
                </span>
              )}
            </h3>
            <p className="text-xs text-neutral-400">
              {profile.isLoggedIn ? profile.email : 'Discutez librement, un compte sert à analyser vos documents'}
            </p>
          </div>
        </div>

        {/* ───────── Visiteur : connexion / inscription ───────── */}
        {!profile.isLoggedIn && (
          <form onSubmit={handleAuth} className="space-y-3">
            {reason === 'upload' && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-neutral-200 leading-relaxed">
                Connectez-vous ou créez un compte pour analyser vos documents (PDF, photos). Votre conversation en
                cours est conservée et l&apos;envoi reprendra automatiquement.
              </div>
            )}

            {mode === 'signUp' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nom d&apos;utilisateur
                </label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="Ex: Karim"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Adresse e-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            {authError && <p className="text-xs text-red-400">{authError}</p>}

            <button
              type="submit"
              disabled={busy}
              className="flex items-center justify-center gap-2 w-full rounded-full bg-amber-400 py-2.5 text-xs font-bold text-black hover:bg-amber-300 transition-colors shadow-md shadow-amber-400/20 mt-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <SignIn size={16} weight="bold" />
              <span>{busy ? 'Un instant…' : mode === 'signIn' ? 'Se connecter' : 'Créer mon compte'}</span>
            </button>

            <p className="text-center text-[11px] text-neutral-400">
              {mode === 'signIn' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                  setAuthError(null);
                }}
                className="font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                {mode === 'signIn' ? 'Créer un compte' : 'Se connecter'}
              </button>
            </p>
          </form>
        )}

        {/* ───────── Utilisateur connecté ───────── */}
        {profile.isLoggedIn && (
          <>
            <div className="flex border-b border-[#24242e] mb-4 gap-1 text-xs font-semibold pb-1">
              <button onClick={() => setTab('profile')} className={tabClass(tab === 'profile')}>
                Profil
              </button>
              <button onClick={() => setTab('session')} className={tabClass(tab === 'session')}>
                Session
              </button>
            </div>

            {tab === 'profile' && (
              <form onSubmit={handleSave} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Nom d&apos;utilisateur (affiché dans le chat)
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: Alex, Karim, Sarah..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Adresse e-mail</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className={`${inputClass} opacity-60 cursor-not-allowed`}
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

                {saveError && <p className="text-xs text-red-400">{saveError}</p>}

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

            {tab === 'session' && (
              <div className="space-y-4 text-center py-2">
                <div className="size-16 rounded-full overflow-hidden mx-auto ring-2 ring-amber-400 shadow-lg">
                  <img src={profile.avatarUrl} alt={profile.username} className="size-full object-cover" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{profile.username}</h4>
                  <p className="text-xs text-neutral-400">{profile.email}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-neutral-300">
                  Connecté en tant que <strong>{profile.username}</strong>. Vos conversations et documents sont
                  synchronisés.
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
            )}
          </>
        )}
      </div>
    </div>
  );
}