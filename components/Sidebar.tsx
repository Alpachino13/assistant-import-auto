'use client';

import { useMemo, useState } from 'react';
import {
  NotePencil,
  Trash,
  X,
  MagnifyingGlass,
  DotsThree,
  LockKey,
  ArrowRight,
  Sparkle,
  Check,
} from '@phosphor-icons/react';
import type { Conversation } from '@/lib/types';

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onClose?: () => void;
};

type GroupedChats = {
  label: string;
  items: Conversation[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const formatDate = (t: number) => new Date(t).toLocaleDateString('fr-FR').replace(/\//g, '.');

export default function Sidebar({
  conversations,
  activeId,
  onNew,
  onSelect,
  onDelete,
  onClearAll,
  onClose,
}: Props) {
  const [search, setSearch] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);

  // Regroupe les vraies conversations par jour calendaire : Today, Yesterday, Previous 7 days, Previous 30 days, Older
  const grouped = useMemo<GroupedChats[]>(() => {
    const query = search.trim().toLowerCase();
    const filtered = (query ? conversations.filter((c) => c.title.toLowerCase().includes(query)) : conversations)
      .slice()
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    const today = startOfDay(Date.now());
    const groups: GroupedChats[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Previous 7 days', items: [] },
      { label: 'Previous 30 days', items: [] },
      { label: 'Older', items: [] },
    ];

    filtered.forEach((conv) => {
      const ts = conv.updatedAt || conv.createdAt || Date.now();
      const diffDays = Math.round((today - startOfDay(ts)) / DAY_MS);
      const index = diffDays <= 0 ? 0 : diffDays === 1 ? 1 : diffDays <= 7 ? 2 : diffDays <= 30 ? 3 : 4;
      groups[index].items.push(conv);
    });

    return groups.filter((g) => g.items.length > 0);
  }, [conversations, search]);

  return (
    <aside className="flex h-full w-full flex-col bg-[#111114] text-neutral-300 border-r border-[#222228]/80 select-none">
      {/* Top action row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          {/* New chat icon (yellow edit icon like in screenshot) */}
          <button
            onClick={onNew}
            title="New chat"
            className="text-amber-400 hover:text-amber-300 transition-colors p-1"
          >
            <NotePencil size={20} weight="bold" />
          </button>

          {/* Delete / clear all icon */}
          <button
            onClick={onClearAll}
            title="Clear all conversations"
            className="text-neutral-400 hover:text-neutral-200 transition-colors p-1"
          >
            <Trash size={18} />
          </button>
        </div>

        {/* Close icon on the right */}
        {onClose && (
          <button
            onClick={onClose}
            title="Close sidebar"
            className="text-neutral-400 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Pill Search input */}
      <div className="px-4 py-2">
        <div className="relative flex items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-full bg-[#18181c] py-2 pl-4 pr-10 text-xs text-neutral-200 placeholder-neutral-500 border border-[#25252b] focus:border-amber-400/50 outline-none transition-colors"
          />
          <MagnifyingGlass
            size={16}
            className="absolute right-3.5 text-neutral-500 pointer-events-none"
          />
        </div>
      </div>

      {/* Grouped Conversation History */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {grouped.length === 0 && (
          <p className="px-2 py-8 text-center text-[11px] text-neutral-500">
            {search.trim() ? 'No conversations found' : 'No conversations yet. Start a new chat!'}
          </p>
        )}
        {grouped.map(({ label, items }) => (
          <div key={label} className="space-y-1.5">
            <h3 className="text-[11px] font-medium text-neutral-400 px-1">{label}</h3>
            <div className="space-y-1">
              {items.map((item) => {
                const isActive = item.id === activeId;
                const isMenuOpen = menuOpenId === item.id;

                return (
                  <div key={item.id} className="relative group">
                    {label === 'Older' && (
                      <span className="block px-2 text-[9px] text-neutral-500 font-mono mb-0.5">
                        {formatDate(item.updatedAt || item.createdAt)}
                      </span>
                    )}

                    <div
                      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#222228] text-white font-medium shadow-sm'
                          : 'bg-[#18181c]/80 hover:bg-[#1f1f25] text-neutral-300'
                      }`}
                      onClick={() => onSelect(item.id)}
                    >
                      <span className="truncate flex-1 text-[12px]">{item.title}</span>

                      {/* 3 dots action menu */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(isMenuOpen ? null : item.id);
                        }}
                        className="text-neutral-500 hover:text-white p-0.5 rounded transition-colors"
                      >
                        <DotsThree size={18} weight="bold" />
                      </button>
                    </div>

                    {/* Dropdown menu */}
                    {isMenuOpen && (
                      <div
                        className="absolute right-2 top-8 z-30 w-36 rounded-xl bg-[#202026] border border-[#2e2e38] p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            onDelete(item.id);
                            setMenuOpenId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash size={14} />
                          <span>Delete</span>
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpenId(null);
                            onNew();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-white/5 transition-colors"
                        >
                          <NotePencil size={14} />
                          <span>New Chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Pro / Subscription Banner Card */}
      <div className="p-3.5 pt-2">
        <div
          onClick={() => setShowSubModal(true)}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-[#4d3809] via-[#221c0b] to-[#14120a] p-3.5 border border-amber-500/30 hover:border-amber-400/50 shadow-[0_4px_20px_rgba(245,158,11,0.12)] transition-all"
        >
          {/* Ambient yellow flare inside */}
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-amber-400/20 blur-xl group-hover:scale-125 transition-transform duration-500" />

          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold tracking-wide">
                <LockKey size={13} weight="fill" />
                <span>Purchase</span>
              </div>
              <p className="text-[11px] leading-tight text-neutral-200 font-medium">
                a subscription to unlock over 15 new features
              </p>
              <p className="text-[9px] text-amber-300/70 underline underline-offset-2">
                Click to learn and upgrade your account
              </p>
            </div>

            {/* White circle with right arrow */}
            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-black shadow-md group-hover:scale-110 group-hover:bg-amber-300 transition-all">
              <ArrowRight size={14} weight="bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Modal */}
      {showSubModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowSubModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-[#141418] border border-amber-500/30 p-6 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSubModal(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Sparkle size={20} weight="fill" />
              <span className="text-xs uppercase font-bold tracking-wider">Courtier Pro</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Upgrade to Pro</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Unlock the full suite of AI architectural analysis, materials calculation, supplier discovery, and certified document generation.
            </p>
            <div className="space-y-2 mb-6">
              {[
                'Unlimited house drawing & vehicle document analysis',
                'Advanced cost calculation & supplier quotes',
                'Priority AI processing (GPT-4o & Gemini 3.5 Flash)',
                'Export certified legal import dossiers & blueprints',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-neutral-200">
                  <div className="size-4 rounded-full bg-amber-400/20 text-amber-400 grid place-items-center">
                    <Check size={11} weight="bold" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowSubModal(false)}
              className="w-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 py-3 text-center text-xs font-bold text-black shadow-lg shadow-amber-400/20 hover:scale-[1.02] transition-transform"
            >
              Get Started with Pro
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}