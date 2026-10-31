'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';
import DossierPanel from './DossierPanel';
import PolicyGate from './PolicyGate';
import ProfileModal, { DEFAULT_PROFILE, type UserProfile } from './ProfileModal';
import { buildContext, evaluateDossier, summarizeAnalysis } from '@/lib/checklist';
import { DEFAULT_LOCAL_AI_URL, DEFAULT_MODEL, MODELS } from '@/lib/models';
import { makeId, usePersistentState } from '@/lib/storage';
import { uploadStockFileToConvex } from '@/lib/convexSync';
import type { AnalyzeResult, AnalyzedDoc, Conversation, Memory, Message } from '@/lib/types';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

const EMPTY_DOCS: AnalyzedDoc[] = [];
const EMPTY_MEMORY: Memory = { vehicule: '', paysAchat: '', budget: '', wilaya: '', notes: '' };

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 6;
const MAX_CONVERSATIONS = 50;

const REVIEW_PROMPT =
  "Vérifie mon dossier d'importation : dis-moi ce qui manque, ce qui pose problème et ce que je dois faire ensuite.";

const titleFrom = (text: string) => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 40 ? `${t.slice(0, 39)}…` : t;
};

export default function AppShell() {
  // ───────── Authentification (optionnelle : on peut discuter en invité) ─────────
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const me = useQuery(api.users.current, isAuthenticated ? {} : 'skip');

  const profile = useMemo<UserProfile>(
    () =>
      me
        ? {
            username: me.username,
            email: me.email,
            avatarUrl: me.avatarUrl,
            localAiUrl: me.localAiUrl ?? DEFAULT_LOCAL_AI_URL,
            isLoggedIn: true,
          }
        : { ...DEFAULT_PROFILE, isLoggedIn: isAuthenticated },
    [me, isAuthenticated]
  );

  // IMPORTANT : pas de "?? []" sur useQuery (nouvelle référence à chaque rendu = boucle infinie)
  const convexConversations = useQuery(api.chat.list, isAuthenticated ? {} : 'skip');
  const addMessageMut = useMutation(api.chat.addMessage);
  const deleteConversationMut = useMutation(api.chat.deleteConversation);
  const clearAllMut = useMutation(api.chat.clearAll);
  const generateUploadUrlMut = useMutation(api.files.generateUploadUrl);
  const saveFileMut = useMutation(api.files.saveFile);

  // ───────── État local ─────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [memory, setMemory] = usePersistentState<Memory>('iua:memory', EMPTY_MEMORY);
  const [docs, setDocs] = usePersistentState<AnalyzedDoc[]>('iua:docs', EMPTY_DOCS);
  const [storedModel, setModel] = usePersistentState<string>('iua:model', DEFAULT_MODEL);
  const model = MODELS.some((m) => m.id === storedModel) ? storedModel : DEFAULT_MODEL;

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [authReason, setAuthReason] = useState<'upload' | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Conversations créées localement et pas encore revenues de Convex (évite qu'elles disparaissent)
  const pendingIdsRef = useRef<Set<string>>(new Set());
  // Fichiers choisis par un invité : analysés automatiquement après sa connexion
  const pendingUploadRef = useRef<{ files: File[]; fromChat: boolean } | null>(null);
  const wasAuthRef = useRef<boolean | null>(null);

  // Miroirs "dernière valeur" pour les effets / callbacks asynchrones
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const isAuthRef = useRef(isAuthenticated);
  isAuthRef.current = isAuthenticated;

  // ───────── Synchronisation Convex → interface ─────────
  useEffect(() => {
    if (!isAuthenticated || convexConversations === undefined) return;

    const remote = convexConversations as unknown as Conversation[];
    const remoteIds = new Set(remote.map((c) => c.id));
    remoteIds.forEach((id) => pendingIdsRef.current.delete(id));

    setConversations((prev) => {
      // Conversations locales encore en cours d'envoi vers Convex
      const localOnly = prev.filter((c) => !remoteIds.has(c.id) && pendingIdsRef.current.has(c.id));
      // Si la version locale a plus de messages (optimiste), on la garde
      const merged = remote.map((r) => {
        const local = prev.find((c) => c.id === r.id);
        return local && local.messages.length > r.messages.length ? local : r;
      });
      return [...localOnly, ...merged].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS);
    });
  }, [isAuthenticated, convexConversations]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];
  const evaluation = useMemo(() => evaluateDossier(docs), [docs]);

  const addMessages = (id: string, msgs: Message[], title?: string) =>
    setConversations((prev) => {
      const now = Date.now();
      const exists = prev.some((c) => c.id === id);
      const next = exists
        ? prev.map((c) => (c.id === id ? { ...c, messages: [...c.messages, ...msgs], updatedAt: now } : c))
        : [
            { id, title: title ?? 'Nouvelle conversation', createdAt: now, updatedAt: now, messages: msgs },
            ...prev,
          ];
      return [...next].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS);
    });

  // Envoie un message vers Convex (uniquement si connecté ; les invités restent en local)
  const syncMessage = (convId: string, msg: Message, title?: string) => {
    if (!isAuthRef.current) return;
    addMessageMut({
      messageId: msg.id,
      conversationId: convId,
      role: msg.role,
      text: msg.text,
      title,
      error: msg.error,
      attachments: msg.attachments?.map((a) => ({ name: a.name })),
    }).catch(console.error);
  };

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    stop();
    setActiveId(null);
    setInput('');
    setDrawer(false);
  };

  const selectChat = (id: string) => {
    stop();
    setActiveId(id);
    setDrawer(false);
  };

  const deleteChat = (id: string) => {
    if (id === activeId) {
      stop();
      setActiveId(null);
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    pendingIdsRef.current.delete(id);
    if (isAuthenticated) deleteConversationMut({ conversationId: id }).catch(console.error);
  };

  const clearAll = () => {
    if (!window.confirm('Clear all conversation history and stored browser data?')) return;
    stop();
    setActiveId(null);
    setConversations([]);
    pendingIdsRef.current.clear();
    if (isAuthenticated) clearAllMut().catch(console.error);
    setDocs([]);
    setMemory(EMPTY_MEMORY);
    setDrawer(false);
  };

  // ───────── Transitions connexion / déconnexion ─────────
  useEffect(() => {
    if (authLoading) return;
    const was = wasAuthRef.current;
    wasAuthRef.current = isAuthenticated;

    // Déconnexion : on vide tout ce qui appartenait au compte (appareil partagé)
    if (was === true && !isAuthenticated) {
      setConversations([]);
      setActiveId(null);
      setDocs([]);
      setMemory(EMPTY_MEMORY);
      pendingIdsRef.current.clear();
      pendingUploadRef.current = null;
    }

    // Connexion depuis le mode invité
    if (was === false && isAuthenticated) {
      // 1. On enregistre dans le compte les conversations tenues en invité (idempotent côté serveur)
      for (const conv of conversationsRef.current) {
        pendingIdsRef.current.add(conv.id);
        conv.messages.forEach((m, i) => syncMessage(conv.id, m, i === 0 ? conv.title : undefined));
      }
      // 2. On reprend l'envoi de document qui a déclenché la connexion
      const pending = pendingUploadRef.current;
      if (pending) {
        pendingUploadRef.current = null;
        setProfileModalOpen(false);
        setAuthReason(null);
        void analyzeRef.current(pending.files, pending.fromChat);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  const closeProfile = () => {
    setProfileModalOpen(false);
    setAuthReason(null);
    pendingUploadRef.current = null;
  };

  // ───────── Chat (ouvert aux invités) ─────────
  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || streaming) return;

    const convId = activeId ?? makeId();
    if (!activeId) setActiveId(convId);

    const userMsg: Message = { id: makeId(), role: 'user', text };
    const existing = conversations.find((c) => c.id === convId);
    const previous = existing?.messages ?? [];
    const history = [...previous, userMsg].filter((m) => !m.error);

    const convTitle = titleFrom(text);

    addMessages(convId, [userMsg], convTitle);
    if (isAuthenticated) {
      if (!existing) pendingIdsRef.current.add(convId);
      syncMessage(convId, userMsg, convTitle);
    }

    setInput('');
    setDraft('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = '';
    let failure: string | null = null;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history.map(({ role, text }) => ({ role, text })),
          model,
          localUrl: profile.localAiUrl,
          context: buildContext(memory, docs),
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error((await res.text().catch(() => '')) || `Erreur ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setDraft(acc);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        failure = e instanceof Error ? e.message : 'Erreur inconnue';
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
      setDraft('');
    }

    if (acc.trim()) {
      const aiMsg: Message = {
        id: makeId(),
        role: 'ai',
        text: failure ? `${acc}\n\n*Response interrupted.*` : acc,
        error: false,
      };
      addMessages(convId, [aiMsg]);
      syncMessage(convId, aiMsg);
    } else if (failure) {
      const errAiMsg: Message = { id: makeId(), role: 'ai', text: failure, error: true };
      addMessages(convId, [errAiMsg]);
      syncMessage(convId, errAiMsg);
    }
  };

  // ───────── Analyse de documents (compte requis) ─────────
  const analyze = async (files: File[], fromChat: boolean) => {
    if (analyzing || files.length === 0 || authLoading) return;

    if (!isAuthenticated) {
      // On garde les fichiers, on demande de se connecter, puis l'analyse reprend toute seule.
      pendingUploadRef.current = { files, fromChat };
      setAuthReason('upload');
      setProfileModalOpen(true);
      return;
    }

    setNotice(null);

    const valid = files.filter((f) => ACCEPTED.includes(f.type) && f.size <= MAX_BYTES).slice(0, MAX_FILES);
    const ignored = files.length - valid.length;
    if (valid.length === 0) {
      setNotice('Unsupported format or size. Use JPG, PNG, WebP or PDF under 8 MB.');
      return;
    }

    valid.forEach((f) => {
      uploadStockFileToConvex(
        f,
        { generateUploadUrl: generateUploadUrlMut, saveFile: saveFileMut },
        'dossier_uploads'
      ).catch(console.error);
    });

    setAnalyzing(true);
    try {
      const fd = new FormData();
      valid.forEach((f) => fd.append('files', f));
      fd.append('model', model);
      const res = await fetch('/api/analyze', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Error ${res.status}`);

      const data = (await res.json()) as { results: AnalyzeResult[] };
      const now = Date.now();
      const created: AnalyzedDoc[] = data.results.map((r) => ({
        id: makeId(),
        fileName: r.fileName,
        status: r.ok ? 'ok' : 'error',
        error: r.error,
        type: r.type ?? 'autre',
        confidence: r.confidence ?? 'moyenne',
        summary: r.summary ?? '',
        fields: r.fields ?? {},
        issues: r.issues ?? [],
        addedAt: now,
      }));
      setDocs((prev) => [...created, ...prev].slice(0, 30));
      if (ignored > 0) setNotice(`${ignored} file(s) ignored.`);

      if (fromChat) {
        const convId = activeId ?? makeId();
        const isNew = !conversationsRef.current.some((c) => c.id === convId);
        if (!activeId) setActiveId(convId);
        const ev = evaluateDossier([...created, ...docs]);

        const userMsg: Message = {
          id: makeId(),
          role: 'user',
          text: 'Documents submitted for analysis.',
          attachments: valid.map((f) => ({ name: f.name })),
        };
        const aiMsg: Message = { id: makeId(), role: 'ai', text: summarizeAnalysis(created, ev) };

        addMessages(convId, [userMsg, aiMsg], 'Document Analysis');
        if (isNew) pendingIdsRef.current.add(convId);
        syncMessage(convId, userMsg, 'Document Analysis');
        syncMessage(convId, aiMsg);
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Toujours la dernière version de analyze (utilisée par l'effet de connexion)
  const analyzeRef = useRef(analyze);
  analyzeRef.current = analyze;

  return (
    <div className="relative min-h-dvh w-full bg-[#14120a] overflow-hidden font-sans md:select-none flex flex-col justify-center items-center">
      <div className="max-md:hidden absolute inset-0 bg-gradient-to-b from-[#7a6f20]/75 via-[#2b270a]/90 to-[#0c0c0f] pointer-events-none" />
      <div className="max-md:hidden absolute -top-32 -right-20 w-[800px] h-[800px] bg-gradient-to-bl from-yellow-200/40 via-amber-400/20 to-transparent blur-3xl pointer-events-none" />
      <div className="max-md:hidden absolute top-1/4 right-0 w-80 h-96 bg-horizontal-scanlines opacity-15 pointer-events-none" />
      <div className="max-md:hidden absolute inset-0 bg-grid-gold opacity-35 pointer-events-none" />

      <div
        className="max-md:hidden absolute top-12 inset-x-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-25"
        aria-hidden="true"
      >
        <span className="text-[15vw] font-black tracking-tight text-[#fffae0] whitespace-nowrap drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          AI Agent
        </span>
      </div>

      <div className="relative z-20 flex w-full h-dvh pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:h-[92vh] md:min-h-[620px] md:max-h-[880px] md:max-w-[1280px] md:px-6 md:py-2">
        <div className="relative flex h-full w-full rounded-none md:rounded-[32px] border-0 md:border border-[#2e2e38] bg-[#0e0e12] shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden">

          <div className="hidden md:block w-72 shrink-0 h-full border-r border-[#222228]">
            <Sidebar
              conversations={conversations}
              activeId={activeId}
              onNew={newChat}
              onSelect={selectChat}
              onDelete={deleteChat}
              onClearAll={clearAll}
            />
          </div>

          {drawer && (
            <div
              className="fixed inset-0 z-50 md:hidden"
              role="dialog"
              aria-modal="true"
              onKeyDown={(e) => e.key === 'Escape' && setDrawer(false)}
            >
              <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={() => setDrawer(false)}
              />
              <div className="relative h-full w-[85%] max-w-xs shadow-2xl">
                <Sidebar
                  conversations={conversations}
                  activeId={activeId}
                  onNew={newChat}
                  onSelect={selectChat}
                  onDelete={deleteChat}
                  onClearAll={clearAll}
                  onClose={() => setDrawer(false)}
                />
              </div>
            </div>
          )}

          <main className="relative flex min-w-0 flex-1 flex-col h-full overflow-hidden">
            <ChatPanel
              title={active?.title ?? 'Nouvelle conversation'}
              messages={messages}
              draft={draft}
              streaming={streaming}
              analyzing={analyzing}
              input={input}
              onInput={setInput}
              onSend={() => send()}
              onStop={stop}
              onFiles={(files) => analyze(files, true)}
              onSuggest={(t) => send(t)}
              model={model}
              onModel={setModel}
              onMenu={() => setDrawer(true)}
              onNew={newChat}
              onOpenDossier={() => setDossierOpen(!dossierOpen)}
              dossierScore={evaluation.score}
              profile={profile}
              onOpenProfile={() => setProfileModalOpen(true)}
            />
          </main>

          {dossierOpen && (
            <aside
              className="absolute right-0 top-0 bottom-0 z-40 w-full sm:w-[400px] border-l border-[#24242c] shadow-2xl animate-in slide-in-from-right duration-200 bg-[#111114]"
              aria-label="Dossier d'importation"
            >
              <DossierPanel
                docs={docs}
                evaluation={evaluation}
                memory={memory}
                onMemory={setMemory}
                onFiles={(files) => analyze(files, false)}
                analyzing={analyzing}
                notice={notice}
                onRemove={(id) => setDocs((prev) => prev.filter((d) => d.id !== id))}
                onReview={() => send(REVIEW_PROMPT)}
                reviewDisabled={streaming}
                onResetDocs={() => setDocs([])}
                onClose={() => setDossierOpen(false)}
              />
            </aside>
          )}

        </div>
      </div>

      {profileModalOpen && (
        <ProfileModal profile={profile} reason={authReason} onClose={closeProfile} />
      )}

      <PolicyGate />
    </div>
  );
}
