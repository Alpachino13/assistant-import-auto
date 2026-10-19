'use client';

import { useRef, useState } from 'react';
import {
  CheckCircle,
  CircleNotch,
  FileText,
  MinusCircle,
  ShieldCheck,
  Trash,
  UploadSimple,
  Warning,
  WarningCircle,
  XCircle,
  X,
} from '@phosphor-icons/react';
import { DOC_LABELS, type Evaluation } from '@/lib/checklist';
import { FIELD_LABELS, type AnalyzedDoc, type FieldKey, type Memory } from '@/lib/types';

type Props = {
  docs: AnalyzedDoc[];
  evaluation: Evaluation;
  memory: Memory;
  onMemory: (m: Memory) => void;
  onFiles: (files: File[]) => void;
  analyzing: boolean;
  notice: string | null;
  onRemove: (id: string) => void;
  onReview: () => void;
  reviewDisabled: boolean;
  onResetDocs: () => void;
  onClose?: () => void;
};

const SHOWN_FIELDS: FieldKey[] = [
  'marque',
  'modele',
  'annee',
  'date_premiere_immatriculation',
  'cylindree_cm3',
  'carburant',
  'vin',
  'kilometrage',
  'prix',
  'date_document',
];

function formatField(key: FieldKey, doc: AnalyzedDoc): string | null {
  const v = doc.fields[key];
  if (v === undefined) return null;
  if (key === 'cylindree_cm3') return `${v} cm³`;
  if (key === 'kilometrage') return `${Number(v).toLocaleString('fr-FR')} km`;
  if (key === 'prix') return `${Number(v).toLocaleString('fr-FR')} ${doc.fields.devise ?? ''}`.trim();
  return String(v);
}

const MEMORY_FIELDS: { key: keyof Memory; label: string; placeholder: string }[] = [
  { key: 'vehicule', label: 'Véhicule visé', placeholder: 'Ex : Geely Coolray 1.5 essence, 2024' },
  { key: 'paysAchat', label: "Pays d'achat", placeholder: 'Ex : France, Émirats' },
  { key: 'budget', label: 'Budget', placeholder: 'Ex : 3 000 000 DA' },
  { key: 'wilaya', label: 'Wilaya', placeholder: 'Ex : Tlemcen' },
];

export default function DossierPanel(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const ev = p.evaluation;
  const requiredTotal = ev.items.filter((i) => i.required).length;
  const requiredFound = requiredTotal - ev.missing.length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#111114] text-neutral-200">
      <header className="border-b border-[#222228] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-amber-400" weight="fill" />
            <h2 className="text-base font-bold text-white tracking-tight">Mon Dossier & Pièces</h2>
          </div>
          {p.onClose && (
            <button
              onClick={p.onClose}
              className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors"
              title="Fermer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-baseline justify-between text-xs">
          <span className="text-neutral-400">
            {requiredFound} pièce{requiredFound > 1 ? 's' : ''} requise{requiredFound > 1 ? 's' : ''} sur {requiredTotal}
          </span>
          <span className="font-bold text-amber-300">{ev.score} %</span>
        </div>

        <div
          role="progressbar"
          aria-label="Complétude du dossier"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={ev.score}
          className="mt-2 h-2 overflow-hidden rounded-full bg-[#1c1c22]"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-[width] duration-300"
            style={{ width: `${ev.score}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
          {p.docs.length === 0
            ? 'Ajoutez vos documents ou plans pour lancer la vérification IA.'
            : ev.complete
              ? 'Dossier complet : aucun point bloquant détecté.'
              : ev.missing.length > 0
                ? `Il manque : ${ev.missing.map((m) => m.label).join(', ')}.`
                : 'Toutes les pièces sont là, mais des points bloquants demandent votre attention.'}
        </p>

        <button
          type="button"
          onClick={p.onReview}
          disabled={p.reviewDisabled}
          className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-black font-semibold text-xs transition-all hover:bg-amber-300 disabled:opacity-50 shadow-md shadow-amber-400/20"
        >
          Vérifier mon dossier avec l&apos;IA
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {ev.alerts.length > 0 && (
          <section aria-label="Alertes">
            <ul className="space-y-2">
              {ev.alerts.map((a, i) => (
                <li
                  key={i}
                  className={`flex gap-2.5 rounded-xl p-3 text-xs leading-relaxed ${
                    a.level === 'error'
                      ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                  }`}
                >
                  {a.level === 'error' ? (
                    <XCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-red-400" />
                  ) : (
                    <Warning size={18} weight="fill" className="mt-0.5 shrink-0 text-amber-400" />
                  )}
                  <p>
                    <span className="font-bold">{a.level === 'error' ? 'Bloquant : ' : 'À vérifier : '}</span>
                    {a.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="add-docs">
          <h3 id="add-docs" className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
            Ajouter des documents
          </h3>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (files.length) p.onFiles(files);
            }}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              p.onFiles(Array.from(e.dataTransfer.files));
            }}
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={p.analyzing}
              className={`flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-4 text-center transition-all ${
                drag
                  ? 'border-amber-400 bg-amber-400/10'
                  : 'border-[#2a2a35] bg-[#141418] hover:border-amber-400/50 hover:bg-[#181820]'
              }`}
            >
              {p.analyzing ? (
                <>
                  <CircleNotch size={24} className="animate-spin text-amber-400" />
                  <span className="text-xs font-medium text-amber-300">Analyse IA en cours…</span>
                </>
              ) : (
                <>
                  <UploadSimple size={24} className="text-amber-400" />
                  <span className="text-xs font-semibold text-white">Choisir des fichiers ou déposer ici</span>
                  <span className="text-[10px] text-neutral-500">Photos (JPG, PNG, WebP) ou PDF · 8 Mo max</span>
                </>
              )}
            </button>
          </div>
          {p.notice && (
            <p role="alert" className="mt-2 rounded-xl bg-amber-500/15 p-2.5 text-xs text-amber-300 border border-amber-500/30">
              {p.notice}
            </p>
          )}
        </section>

        <section aria-labelledby="checklist">
          <h3 id="checklist" className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
            Pièces à fournir
          </h3>
          <ul className="divide-y divide-[#22222a] rounded-2xl border border-[#22222a] bg-[#141418] overflow-hidden">
            {ev.items.map((item) => {
              const state = item.found.length ? 'ok' : item.required ? 'missing' : 'optional';
              return (
                <li key={item.type} className="flex gap-2.5 p-3">
                  {state === 'ok' && <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-emerald-400" />}
                  {state === 'missing' && (
                    <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-amber-400" />
                  )}
                  {state === 'optional' && <MinusCircle size={18} className="mt-0.5 shrink-0 text-neutral-500" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-white">
                      {item.label}
                      <span
                        className={`rounded-md px-1.5 py-0.2 text-[10px] font-semibold ${
                          state === 'ok'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : state === 'missing'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-white/5 text-neutral-400'
                        }`}
                      >
                        {state === 'ok' ? 'Reçu' : state === 'missing' ? 'Manquant' : 'Recommandé'}
                      </span>
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{item.hint}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="docs-title">
          <h3 id="docs-title" className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
            Documents analysés ({p.docs.length})
          </h3>
          {p.docs.length === 0 ? (
            <p className="rounded-2xl border border-[#22222a] bg-[#141418] p-3.5 text-xs text-neutral-500">
              Aucun document pour l&apos;instant. Les données extraites apparaîtront ici.
            </p>
          ) : (
            <ul className="space-y-2">
              {p.docs.map((d) => (
                <li key={d.id} className="rounded-2xl border border-[#22222a] bg-[#141418] p-3">
                  <div className="flex items-start gap-2.5">
                    <FileText size={18} className="mt-0.5 shrink-0 text-amber-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white">{d.status === 'ok' ? DOC_LABELS[d.type] : 'Erreur analyse'}</p>
                      <p className="truncate text-[10px] text-neutral-500">{d.fileName}</p>
                      {d.status === 'ok' ? (
                        <>
                          <p className="mt-1 text-xs text-neutral-300" dir="auto">
                            {d.summary}
                          </p>
                          <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                            {SHOWN_FIELDS.map((k) => {
                              const val = formatField(k, d);
                              if (!val) return null;
                              return (
                                <div key={k} className="min-w-0">
                                  <dt className="text-neutral-500 text-[10px]">{FIELD_LABELS[k]}</dt>
                                  <dd className="truncate font-semibold text-neutral-200">{val}</dd>
                                </div>
                              );
                            })}
                          </dl>
                        </>
                      ) : (
                        <p className="mt-1 text-xs text-red-400">{d.error}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => p.onRemove(d.id)}
                      className="text-neutral-500 hover:text-red-400 p-1 rounded transition-colors"
                      title="Retirer ce document"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {p.docs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Retirer tous les documents du dossier ?')) p.onResetDocs();
              }}
              className="mt-2 text-xs text-neutral-500 hover:text-red-400 transition-colors"
            >
              Vider le dossier
            </button>
          )}
        </section>

        <section aria-labelledby="memory-title">
          <h3 id="memory-title" className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
            Mon projet
          </h3>
          <div className="space-y-2.5">
            {MEMORY_FIELDS.map((f) => (
              <div key={f.key}>
                <label htmlFor={`mem-${f.key}`} className="mb-1 block text-xs text-neutral-300 font-medium">
                  {f.label}
                </label>
                <input
                  id={`mem-${f.key}`}
                  type="text"
                  value={p.memory[f.key]}
                  onChange={(e) => p.onMemory({ ...p.memory, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  maxLength={120}
                  className="w-full rounded-xl border border-[#262630] bg-[#16161b] px-3 py-2 text-xs text-white placeholder-neutral-600 outline-none focus:border-amber-400/50"
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
