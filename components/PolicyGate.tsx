'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';

const KEY = 'policy-accepted-v1'; // bump the version to ask everyone to accept again
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

// On the server we assume "accepted" so returning visitors never see a flash of the modal.
const getServerSnapshot = () => true;

function accept() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* private mode: the modal will simply come back next visit */
  }
  listeners.forEach((l) => l());
}

export default function PolicyGate() {
  const accepted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [checked, setChecked] = useState(false);

  if (accepted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-[#2e2e38] bg-[#111114] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6">
        <h2 id="policy-title" className="text-xl font-bold text-white">
          Avant de commencer
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-300">
          <li>Les réponses de l&apos;IA sont indicatives. Vérifiez auprès des administrations et des professionnels avant toute décision ou paiement.</li>
          <li>Vos messages, les infos de votre dossier et les documents analysés sont envoyés à un fournisseur d&apos;IA. Connecté, vos conversations et fichiers sont enregistrés sur nos serveurs.</li>
          <li>N&apos;envoyez que les documents nécessaires.</li>
        </ul>
        <p className="mt-3 text-sm text-neutral-400">
          Lisez la{' '}
          <Link href="/policy" className="text-amber-400 underline">
            politique complète
          </Link>
          .
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-neutral-200">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500"
          />
          <span>J&apos;ai lu et j&apos;accepte la politique d&apos;utilisation.</span>
        </label>

        <button
          onClick={accept}
          disabled={!checked}
          className="mt-5 min-h-12 w-full rounded-xl bg-amber-500 px-6 py-3 font-bold text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Accepter et continuer
        </button>
      </div>
    </div>
  );
}