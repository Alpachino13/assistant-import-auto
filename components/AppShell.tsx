'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';
import DossierPanel from './DossierPanel';
import ProfileModal, { DEFAULT_PROFILE, type UserProfile } from './ProfileModal';
import { buildContext, evaluateDossier, summarizeAnalysis } from '@/lib/checklist';
import { DEFAULT_MODEL, MODELS } from '@/lib/models';
import { makeId, usePersistentState } from '@/lib/storage';
import { syncConversationToConvex, syncMessageToConvex, uploadStockFileToConvex } from '@/lib/convexSync';
import type { AnalyzeResult, AnalyzedDoc, Conversation, Memory, Message } from '@/lib/types';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const EMPTY_CONVERSATIONS: Conversation[] = [];
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
  // 1. Profil utilisateur et requêtes Convex
  const [profile, setProfile] = usePersistentState<UserProfile>('buildhub:user_profile', DEFAULT_PROFILE);
  const convexConversations = useQuery(api.chat.list, { username: profile.username }) ?? [];
  const deleteConversationMut = useMutation(api.chat.deleteConversation);
  
  // 2. État local optimiste (corrige l'erreur setConversations et évite les clignotements d'UI)
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Synchronisation automatique : quand Convex se met à jour, l'interface suit.
  useEffect(() => {
    if (convexConversations) {
      // "unknown" permet d'ignorer la différence entre "_id" (Convex) et "id" (React)
      setConversations(convexConversations as unknown as Conversation[]);
    }
  }, [convexConversations]);

  // 3. Mémoire : on la garde en local persistant pour le moment pour corriger setMemory
  const [memory, setMemory] = usePersistentState<Memory>('iua:memory', EMPTY_MEMORY);

  const [docs, setDocs] = usePersistentState<AnalyzedDoc[]>('iua:docs', EMPTY_DOCS);
  const [storedModel, setModel] = usePersistentState<string>('iua:model', DEFAULT_MODEL);
  const model = MODELS.some((m) => m.id === storedModel) ? storedModel : DEFAULT_MODEL;

  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
      return next.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CONVERSATIONS);
    });

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
    // Mise à jour immédiate de l'interface
    setConversations((prev) => prev.filter((c) => c.id !== id));
    // Suppression dans la base de données Convex
    deleteConversationMut({ conversationId: id as any }).catch(console.error);
  };

  const clearAll = () => {
    if (!window.confirm('Clear all conversation history and stored browser data?')) return;
    stop();
    setActiveId(null);
    setConversations([]);
    setDocs([]);
    setMemory(EMPTY_MEMORY);
    setDrawer(false);
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || streaming) return;

    const convId = activeId ?? makeId();
    if (!activeId) setActiveId(convId);

    const userMsg: Message = { id: makeId(), role: 'user', text };
    const previous = conversations.find((c) => c.id === convId)?.messages ?? [];
    const history = [...previous, userMsg].filter((m) => !m.error);

    const convTitle = titleFrom(text);
    
    // 1. Mise à jour de l'UI immédiate
    addMessages(convId, [userMsg], convTitle);
    
    // 2. Envoi en arrière-plan à Convex
    syncMessageToConvex(convId, userMsg);
    syncConversationToConvex({ id: convId, title: convTitle, createdAt: Date.now(), updatedAt: Date.now(), messages: [] }, profile.username);

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
      syncMessageToConvex(convId, aiMsg);
    } else if (failure) {
      const errAiMsg: Message = { id: makeId(), role: 'ai', text: failure, error: true };
      addMessages(convId, [errAiMsg]);
      syncMessageToConvex(convId, errAiMsg);
    }
  };

  const analyze = async (files: File[], fromChat: boolean) => {
    if (analyzing || files.length === 0) return;
    setNotice(null);

    const valid = files.filter((f) => ACCEPTED.includes(f.type) && f.size <= MAX_BYTES).slice(0, MAX_FILES);
    const ignored = files.length - valid.length;
    if (valid.length === 0) {
      setNotice('Unsupported format or size. Use JPG, PNG, WebP or PDF under 8 MB.');
      return;
    }

    valid.forEach((f) => {
      uploadStockFileToConvex(f, profile.username, 'dossier_uploads');
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
        if (!activeId) setActiveId(convId);
        const ev = evaluateDossier([...created, ...docs]);
        addMessages(
          convId,
          [
            {
              id: makeId(),
              role: 'user',
              text: 'Documents submitted for analysis.',
              attachments: valid.map((f) => ({ name: f.name })),
            },
            { id: makeId(), role: 'ai', text: summarizeAnalysis(created, ev) },
          ],
          'Document Analysis'
        );
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#14120a] overflow-hidden font-sans select-none flex flex-col justify-center items-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[#7a6f20]/75 via-[#2b270a]/90 to-[#0c0c0f] pointer-events-none" />
      <div className="absolute -top-32 -right-20 w-[800px] h-[800px] bg-gradient-to-bl from-yellow-200/40 via-amber-400/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-80 h-96 bg-horizontal-scanlines opacity-15 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-gold opacity-35 pointer-events-none" />

      <div
        className="absolute top-12 inset-x-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-25"
        aria-hidden="true"
      >
        <span className="text-[15vw] font-black tracking-tight text-[#fffae0] whitespace-nowrap drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          AI Agent
        </span>
      </div>

      <div className="relative z-20 flex w-full h-screen md:h-[92vh] md:min-h-[620px] md:max-h-[880px] md:max-w-[1280px] md:px-6 md:py-2">
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
        <ProfileModal
          profile={profile}
          onUpdate={setProfile}
          onClose={() => setProfileModalOpen(false)}
        />
      )}
    </div>
  );
}