import Link from 'next/link';

export const metadata = { title: 'Page introuvable — Courtier' };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#0b0b0d] px-6 text-center text-white">
      <p className="text-7xl font-black text-amber-400 sm:text-8xl">404</p>
      <h1 className="mt-4 text-2xl font-bold">Cette page n&apos;existe pas</h1>
      <p className="mt-2 max-w-sm text-neutral-400">
        Le lien est peut-être incorrect ou la page a été déplacée. Revenez à Courtier pour continuer votre analyse.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-amber-500 px-8 font-bold text-black transition-colors hover:bg-amber-400"
      >
        Retour à Courtier
      </Link>
    </main>
  );
}