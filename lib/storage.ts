'use client';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

const EVENT = 'iua-storage';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}

const noopSubscribe = () => () => {};

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * État persistant dans localStorage (sûr pour le SSR, synchronisé entre onglets).
 * `initial` doit être une constante stable (définie hors du composant).
 */
export function usePersistentState<T>(key: string, initial: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null
  );
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const value = useMemo<T>(() => {
    if (raw == null) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  }, [raw, initial]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      let prev = initial;
      const current = readRaw(key);
      if (current != null) {
        try {
          prev = JSON.parse(current) as T;
        } catch {
          /* valeur corrompue : on repart de l'initial */
        }
      }
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        /* quota dépassé ou stockage désactivé */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key, initial]
  );

  return [value, setValue, hydrated] as const;
}

export function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
