'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  List,
  Paperclip,
  ArrowUpRight,
  Truck,
  Stack,
  Calculator,
  Stop,
  CircleNotch,
  ShieldCheck,
  Check,
  CaretDown,
  Info,
  HardDrives,
  Sparkle,
  Gear,
} from '@phosphor-icons/react';
import GoldOrb from './GoldOrb';
import { MODELS, type ModelOption } from '@/lib/models';
import type { Message } from '@/lib/types';
import type { UserProfile } from './ProfileModal';

// BuildHub Cube Logo
function BuildHubLogo() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-lg flex items-center justify-center font-black shadow-md shadow-amber-400/20"
        style={{
          width: 26,
          height: 26,
          minWidth: 26,
          minHeight: 26,
          backgroundColor: '#f59e0b',
          color: '#000000',
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
          <path d="M4 4h7v7H4zm9 0h7v7h-7zm0 9h7v7h-7zm-9 0h7v7H4z" />
        </svg>
      </div>
      <span className="font-bold text-white text-base tracking-tight select-none">BuildHub</span>
    </div>
  );
}

// Reusable Model Selector Pill & Dropdown
function ModelSelectorDropdown({
  selectedModel,
  onSelectModel,
  onOpenSettings,
  isOpen,
  onToggle,
}: {
  selectedModel: string;
  onSelectModel: (id: string) => void;
  onOpenSettings: () => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const currentMeta = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
  const isLocal = currentMeta.provider === 'local';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all cursor-pointer ${
          isLocal
            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:border-emerald-400'
            : 'bg-[#1c1c24] border-[#2b2b36] text-neutral-200 hover:border-amber-400/50 hover:text-white'
        }`}
      >
        {isLocal ? (
          <HardDrives size={14} weight="fill" className="text-emerald-400 shrink-0" />
        ) : (
          <Sparkle size={14} weight="fill" className="text-amber-400 shrink-0" />
        )}
        <span className="font-semibold text-xs truncate max-w-[130px]">
          {isLocal ? 'Qwen 2.5:3B' : currentMeta.label.split(' ')[0] + ' ' + (currentMeta.label.split(' ')[1] || '')}
        </span>
        <span
          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
            isLocal ? 'bg-emerald-400/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'
          }`}
        >
          {currentMeta.badge}
        </span>
        <CaretDown size={12} className="text-neutral-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-11 z-30 w-72 rounded-2xl bg-[#181820] border border-[#2f2f3d] p-2 shadow-2xl max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {/* Gemini Cloud Models */}
          <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
            Modèles Google Gemini (Streaming)
          </div>
          {MODELS.filter((m) => m.provider === 'gemini').map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onSelectModel(m.id);
                onToggle();
              }}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors mb-0.5 cursor-pointer ${
                selectedModel === m.id
                  ? 'bg-amber-400/15 text-amber-400 font-semibold'
                  : 'text-neutral-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkle size={14} weight="fill" className="text-amber-400 shrink-0" />
                <div className="text-left">
                  <div className="font-medium flex items-center gap-1.5">
                    <span>{m.label}</span>
                    <span className="text-[9px] bg-white/10 px-1.5 py-0.2 rounded text-neutral-400 font-normal">
                      {m.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 line-clamp-1">{m.description}</div>
                </div>
              </div>
              {selectedModel === m.id && <Check size={14} weight="bold" className="shrink-0" />}
            </button>
          ))}

          {/* Local Agent Home Server */}
          <div className="px-2.5 pt-2.5 pb-1 text-[10px] uppercase font-bold text-neutral-500 tracking-wider border-t border-white/5 mt-1">
            Agent Local (Home Server · Tailscale)
          </div>
          {MODELS.filter((m) => m.provider === 'local').map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onSelectModel(m.id);
                onToggle();
              }}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                selectedModel === m.id
                  ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                  : 'text-neutral-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <HardDrives size={14} weight="fill" className="text-emerald-400 shrink-0" />
                <div className="text-left">
                  <div className="font-medium flex items-center gap-1.5">
                    <span>{m.label}</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-normal">
                      {m.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 line-clamp-1">{m.description}</div>
                </div>
              </div>
              {selectedModel === m.id && <Check size={14} weight="bold" className="shrink-0" />}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              onToggle();
              onOpenSettings();
            }}
            className="mt-2 flex items-center justify-center gap-1.5 w-full rounded-lg bg-white/5 py-1.5 text-[10px] text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Gear size={12} />
            <span>Gérer l&apos;adresse Tailscale (100.85.73.32)</span>
          </button>
        </div>
      )}
    </div>
  );
}

type Props = {
  title: string;
  messages: Message[];
  draft: string;
  streaming: boolean;
  analyzing: boolean;
  input: string;
  onInput: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  onFiles: (files: File[]) => void;
  onSuggest: (text: string) => void;
  model: string;
  onModel: (id: string) => void;
  onMenu: () => void;
  onNew: () => void;
  onOpenDossier?: () => void;
  dossierScore?: number;
  profile: UserProfile;
  onOpenProfile: () => void;
};

export default function ChatPanel(p: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [modelDropdownHome, setModelDropdownHome] = useState(false);
  const [modelDropdownActive, setModelDropdownActive] = useState(false);
  const [showRecModal, setShowRecModal] = useState(false);
  const [recText, setRecText] = useState('');
  const [recSent, setRecSent] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [p.messages, p.draft, p.analyzing]);

  const empty = p.messages.length === 0 && !p.streaming;
  const canSend = p.input.trim().length > 0 && !p.streaming;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-[#0e0e12] text-white overflow-hidden select-none">
      {/* Background ambient lighting and subtle grid */}
      <div className="absolute inset-0 bg-grid-gold opacity-50 pointer-events-none" />
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 rounded-full bg-amber-400/10 blur-[120px] pointer-events-none"
        style={{ width: 500, height: 500 }}
      />

      {/* Top Header */}
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#202026]/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu (visible on phone screens only) */}
          <button
            onClick={p.onMenu}
            title="Open history"
            className="md:hidden flex items-center justify-center rounded-lg text-neutral-400 hover:text-white p-1.5 transition-colors cursor-pointer"
          >
            <List size={22} />
          </button>

          {/* BuildHub Logo */}
          <div className="cursor-pointer" onClick={p.onNew}>
            <BuildHubLogo />
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Dossier Toggle Button */}
          {p.onOpenDossier && (
            <button
              onClick={p.onOpenDossier}
              className="flex items-center gap-2 rounded-full bg-[#18181f] px-3 py-1.5 text-xs text-neutral-300 border border-[#272732] hover:border-amber-400/50 hover:text-white transition-all shadow-sm cursor-pointer"
              title="Open Dossier Verification"
            >
              <ShieldCheck size={16} className="text-amber-400" weight="fill" />
              <span className="hidden sm:inline">Dossier</span>
              {typeof p.dossierScore === 'number' && (
                <span className="rounded-full bg-amber-400/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
                  {p.dossierScore}%
                </span>
              )}
            </button>
          )}

          {/* User Avatar with Customize Profile trigger */}
          <div
            onClick={p.onOpenProfile}
            className="group relative rounded-full ring-2 ring-amber-400/80 overflow-hidden cursor-pointer shadow-md hover:ring-amber-300 hover:scale-105 transition-all shrink-0"
            style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
            title={`${p.profile.username} · Personnaliser le profil & connexion`}
          >
            <img
              src={p.profile.avatarUrl}
              alt={p.profile.username}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-amber-300 transition-opacity">
              <Gear size={12} weight="bold" />
            </div>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {empty ? (
          /* Empty / Welcome State matching screenshot */
          <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 text-center animate-in fade-in duration-500">
            {/* Luminous Glowing Liquid Gold Orb */}
            <div className="mb-3">
              <GoldOrb size={105} />
            </div>

            {/* Welcome Headlines with dynamic username */}
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
              <span
                style={{
                  color: '#f59e0b',
                  background: 'linear-gradient(90deg, #fef08a 0%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Welcome back
              </span>{' '}
              <span className="text-white">{p.profile.username || 'Alex'}!</span>
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 mb-6 max-w-md">
              Which house drawing do you want to analyze today?
            </p>

            {/* Central Capsule Prompt Input Box */}
            <div className="w-full max-w-2xl mb-6">
              <div
                className="relative bg-[#131317] border border-[#262630] p-3 shadow-2xl focus-within:border-amber-400/60 focus-within:ring-1 focus-within:ring-amber-400/40 transition-all text-left"
                style={{ borderRadius: 28 }}
              >
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileRef}
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) p.onFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />

                {/* Textarea with cursor style */}
                <div className="flex items-start px-2 py-1">
                  <textarea
                    value={p.input}
                    onChange={(e) => p.onInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (canSend) p.onSend();
                      }
                    }}
                    rows={2}
                    placeholder="| Tell us about your capabilities"
                    className="w-full resize-none bg-transparent text-sm text-white placeholder-neutral-400 outline-none leading-relaxed border-0 focus:ring-0 p-0"
                  />
                </div>

                {/* Bottom Row Inside Capsule */}
                <div className="flex items-center justify-between pt-2 px-1">
                  <div className="flex items-center gap-2">
                    {/* Attachment button */}
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={p.analyzing}
                      title="Attach documents, drawings, or photos"
                      style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
                      className="rounded-full bg-[#1c1c24] text-neutral-400 hover:text-white hover:bg-[#252530] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {p.analyzing ? (
                        <CircleNotch size={17} className="animate-spin text-amber-400" />
                      ) : (
                        <Paperclip size={17} />
                      )}
                    </button>

                    {/* Model Pill: Gemini & Local Tailscale Models */}
                    <ModelSelectorDropdown
                      selectedModel={p.model}
                      onSelectModel={p.onModel}
                      onOpenSettings={p.onOpenProfile}
                      isOpen={modelDropdownHome}
                      onToggle={() => setModelDropdownHome(!modelDropdownHome)}
                    />
                  </div>

                  {/* Golden Send Button with Angled Arrow */}
                  <button
                    type="button"
                    onClick={p.streaming ? p.onStop : p.onSend}
                    disabled={!canSend && !p.streaming}
                    style={{
                      width: 36,
                      height: 36,
                      minWidth: 36,
                      minHeight: 36,
                      backgroundColor: canSend || p.streaming ? '#f59e0b' : '#1e1e26',
                      color: canSend || p.streaming ? '#000000' : '#6b7280',
                    }}
                    className={`rounded-full flex items-center justify-center transition-all shrink-0 ${
                      canSend || p.streaming
                        ? 'shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 cursor-pointer'
                        : 'cursor-not-allowed'
                    }`}
                  >
                    {p.streaming ? (
                      <Stop size={16} weight="fill" />
                    ) : (
                      <ArrowUpRight size={18} weight="bold" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 3 Suggestion Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl text-left">
              {/* Card 1: Search for suppliers */}
              <button
                type="button"
                onClick={() =>
                  p.onSuggest(
                    'Search for suppliers: We will find suppliers with the best prices for this house drawing.'
                  )
                }
                className="group flex flex-col justify-between rounded-2xl bg-[#141418] border border-[#22222a] p-3 hover:border-amber-400/50 hover:bg-[#181820] transition-all shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      minWidth: 34,
                      minHeight: 34,
                      backgroundColor: '#f59e0b',
                      color: '#000000',
                    }}
                    className="rounded-lg flex items-center justify-center font-bold shadow-md shadow-amber-400/20 group-hover:scale-105 transition-transform shrink-0"
                  >
                    <Truck size={18} weight="bold" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">Search</div>
                    <div className="text-xs font-bold text-white leading-tight">for suppliers</div>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  We will find suppliers with the best prices
                </p>
              </button>

              {/* Card 2: Select materials */}
              <button
                type="button"
                onClick={() =>
                  p.onSuggest(
                    'Select materials: Depending on the goal and wishes, AI BuildHub will select the best materials.'
                  )
                }
                className="group flex flex-col justify-between rounded-2xl bg-[#141418] border border-[#22222a] p-3 hover:border-amber-400/50 hover:bg-[#181820] transition-all shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      minWidth: 34,
                      minHeight: 34,
                      backgroundColor: '#f59e0b',
                      color: '#000000',
                    }}
                    className="rounded-lg flex items-center justify-center font-bold shadow-md shadow-amber-400/20 group-hover:scale-105 transition-transform shrink-0"
                  >
                    <Stack size={18} weight="bold" />
                  </div>
                  <div className="text-xs font-bold text-white leading-tight">Select materials</div>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Depending on the goal and wishes, AI BuildHub will select the best materials
                </p>
              </button>

              {/* Card 3: Calculation of the cost */}
              <button
                type="button"
                onClick={() =>
                  p.onSuggest(
                    'Calculation of the cost: Help me quickly and structuredly summarise the price and budget.'
                  )
                }
                className="group flex flex-col justify-between rounded-2xl bg-[#141418] border border-[#22222a] p-3 hover:border-amber-400/50 hover:bg-[#181820] transition-all shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      minWidth: 34,
                      minHeight: 34,
                      backgroundColor: '#f59e0b',
                      color: '#000000',
                    }}
                    className="rounded-lg flex items-center justify-center font-bold shadow-md shadow-amber-400/20 group-hover:scale-105 transition-transform shrink-0"
                  >
                    <Calculator size={18} weight="bold" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">Calculation</div>
                    <div className="text-xs font-bold text-white leading-tight">of the cost</div>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Our AI will help you to quickly and structuredly summarise the price
                </p>
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Stream View */
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6">
            {p.messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-[22px] rounded-br-md bg-[#18181f] border border-[#292934] px-4 py-3 text-white shadow-md">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                        {m.attachments.map((a, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] text-amber-300"
                          >
                            <Paperclip size={12} />
                            {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      minWidth: 28,
                      minHeight: 28,
                      backgroundColor: '#f59e0b',
                      color: '#000000',
                    }}
                    className="mt-1 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
                      <path d="M4 4h7v7H4zm9 0h7v7h-7zm0 9h7v7h-7zm-9 0h7v7H4z" />
                    </svg>
                  </div>
                  <div className="min-w-0 max-w-[88%] rounded-2xl bg-transparent px-1 py-1">
                    <div className="prose prose-sm prose-invert max-w-none text-neutral-200 leading-relaxed">
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Live Streaming Draft */}
            {p.streaming && p.draft && (
              <div className="flex gap-3">
                <div
                  style={{
                    width: 28,
                    height: 28,
                    minWidth: 28,
                    minHeight: 28,
                    backgroundColor: '#f59e0b',
                    color: '#000000',
                  }}
                  className="mt-1 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-sm animate-pulse"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
                    <path d="M4 4h7v7H4zm9 0h7v7h-7zm0 9h7v7h-7zm-9 0h7v7H4z" />
                  </svg>
                </div>
                <div className="min-w-0 max-w-[88%] px-1 py-1 prose prose-sm prose-invert text-neutral-200">
                  <ReactMarkdown>{p.draft}</ReactMarkdown>
                </div>
              </div>
            )}

            {p.analyzing && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 rounded-xl p-3 border border-amber-400/20">
                <CircleNotch size={18} className="animate-spin" />
                <span>AI is analyzing your documents and drawing structure...</span>
              </div>
            )}

            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Floating Bottom Input Capsule for Active Conversations */}
      {!empty && (
        <div className="relative z-20 mx-auto w-full max-w-3xl px-4 pb-3">
          <div
            className="relative bg-[#131317] border border-[#262630] p-2.5 shadow-2xl focus-within:border-amber-400/60 transition-all"
            style={{ borderRadius: 28 }}
          >
            <input
              type="file"
              ref={fileRef}
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) p.onFiles(Array.from(e.target.files));
                e.target.value = '';
              }}
            />

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={p.analyzing}
                style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
                className="rounded-full bg-[#1c1c24] text-neutral-400 hover:text-white transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                title="Attach files"
              >
                {p.analyzing ? (
                  <CircleNotch size={17} className="animate-spin text-amber-400" />
                ) : (
                  <Paperclip size={17} />
                )}
              </button>

              <textarea
                value={p.input}
                onChange={(e) => p.onInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) p.onSend();
                  }
                }}
                rows={1}
                placeholder="Ask BuildHub about plans, materials, or documents..."
                className="max-h-28 min-h-[38px] flex-1 resize-none bg-transparent py-2 text-sm text-white placeholder-neutral-500 outline-none border-0 focus:ring-0 p-0"
              />

              <div className="flex items-center gap-2 pb-0.5">
                {/* Active chat Model selector pill */}
                <ModelSelectorDropdown
                  selectedModel={p.model}
                  onSelectModel={p.onModel}
                  onOpenSettings={p.onOpenProfile}
                  isOpen={modelDropdownActive}
                  onToggle={() => setModelDropdownActive(!modelDropdownActive)}
                />

                <button
                  type="button"
                  onClick={p.streaming ? p.onStop : p.onSend}
                  disabled={!canSend && !p.streaming}
                  style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    minHeight: 36,
                    backgroundColor: canSend || p.streaming ? '#f59e0b' : '#1e1e26',
                    color: canSend || p.streaming ? '#000000' : '#6b7280',
                  }}
                  className={`rounded-full flex items-center justify-center transition-all shrink-0 ${
                    canSend || p.streaming
                      ? 'shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 cursor-pointer'
                      : 'cursor-not-allowed'
                  }`}
                >
                  {p.streaming ? (
                    <Stop size={16} weight="fill" />
                  ) : (
                    <ArrowUpRight size={18} weight="bold" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Right Pill: "Send feature recommendation" */}
      <div className="relative z-20 flex justify-end px-6 pb-2.5">
        <button
          type="button"
          onClick={() => setShowRecModal(true)}
          className="flex items-center gap-1.5 rounded-full bg-[#16161b]/80 border border-[#22222a] px-3 py-1 text-[10px] text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 backdrop-blur-sm transition-all cursor-pointer"
        >
          <Info size={12} className="text-amber-400" />
          <span>Send feature recommendation</span>
        </button>
      </div>

      {/* Feature Recommendation Modal */}
      {showRecModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => {
            setShowRecModal(false);
            setRecSent(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#141418] border border-[#2b2b36] p-5 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-bold text-white mb-1">Feature Recommendation</h4>
            <p className="text-xs text-neutral-400 mb-3">
              What capability or tool would you like to see in BuildHub?
            </p>
            {recSent ? (
              <div className="p-4 rounded-xl bg-amber-400/10 text-amber-300 text-xs text-center border border-amber-400/20">
                Thank you! Your feedback has been noted.
              </div>
            ) : (
              <>
                <textarea
                  value={recText}
                  onChange={(e) => setRecText(e.target.value)}
                  placeholder="e.g. 3D blueprint CAD viewer, automatic supplier quote comparison..."
                  rows={3}
                  className="w-full rounded-xl bg-[#1a1a22] border border-[#2e2e3a] p-3 text-xs text-white placeholder-neutral-500 outline-none mb-3"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowRecModal(false)}
                    className="px-3 py-1.5 rounded-full text-xs text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (recText.trim()) setRecSent(true);
                    }}
                    className="px-4 py-1.5 rounded-full bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}