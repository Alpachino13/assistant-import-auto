'use client';

export default function GoldOrb({ size = 110 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Outer ambient blur glow */}
      <div
        className="absolute inset-0 rounded-full bg-amber-400/30 blur-2xl animate-pulse"
        style={{ animationDuration: '4s' }}
      />
      <div
        className="absolute -inset-3 rounded-full bg-yellow-500/20 blur-3xl"
      />

      {/* Main spherical body */}
      <div className="relative size-full rounded-full overflow-hidden shadow-[inset_0_0_24px_rgba(245,158,11,0.9),0_0_35px_rgba(245,158,11,0.5)] border border-yellow-400/40 bg-gradient-to-b from-[#1c1808] via-[#0d0c06] to-[#050502]">
        {/* Animated swirling light flares inside */}
        <div className="absolute inset-0 opacity-85">
          <svg
            viewBox="0 0 100 100"
            className="size-full animate-spin"
            style={{ animationDuration: '18s' }}
          >
            <defs>
              <linearGradient id="goldGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#eab308" stopOpacity="0.8" />
                <stop offset="80%" stopColor="#ca8a04" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
                <stop offset="25%" stopColor="#fde047" stopOpacity="0.95" />
                <stop offset="55%" stopColor="#eab308" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Plasma tendrils / swirl arcs */}
            <circle cx="50" cy="50" r="42" fill="none" stroke="url(#goldGrad1)" strokeWidth="3" strokeDasharray="30 20 50 15" strokeLinecap="round" />
            <circle cx="50" cy="50" r="34" fill="none" stroke="url(#goldGrad1)" strokeWidth="4.5" strokeDasharray="60 35 20 25" strokeLinecap="round" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="26" fill="none" stroke="#fef08a" strokeWidth="2.5" strokeDasharray="40 30" strokeLinecap="round" transform="rotate(-60 50 50)" />
            <circle cx="50" cy="50" r="16" fill="none" stroke="#fde047" strokeWidth="3.5" strokeDasharray="25 15" strokeLinecap="round" transform="rotate(110 50 50)" />
          </svg>
        </div>

        {/* Counter-rotating secondary nebula */}
        <div className="absolute inset-1 opacity-70">
          <svg
            viewBox="0 0 100 100"
            className="size-full animate-spin"
            style={{ animationDuration: '12s', animationDirection: 'reverse' }}
          >
            <circle cx="50" cy="50" r="38" fill="none" stroke="#fde047" strokeWidth="2" strokeDasharray="20 40 10 30" strokeLinecap="round" />
            <circle cx="50" cy="50" r="29" fill="none" stroke="#fbbf24" strokeWidth="3" strokeDasharray="50 50" strokeLinecap="round" transform="rotate(90 50 50)" />
            <ellipse cx="50" cy="50" rx="36" ry="18" fill="none" stroke="#fef9c3" strokeWidth="1.5" strokeDasharray="15 35" strokeLinecap="round" transform="rotate(30 50 50)" />
          </svg>
        </div>

        {/* Dense glowing core */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-10 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 blur-sm opacity-90 shadow-[0_0_20px_#fde047]" />
        </div>

        {/* Glass specular arc highlight */}
        <div className="absolute top-1 left-2.5 right-2.5 h-6 rounded-[100%] bg-gradient-to-b from-white/60 via-yellow-100/20 to-transparent blur-[1px] pointer-events-none" />
        <div className="absolute top-2 left-4 size-3 rounded-full bg-white/80 blur-[0.8px] pointer-events-none" />
      </div>
    </div>
  );
}
