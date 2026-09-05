'use client';

const R = 104;
const C = 2 * Math.PI * R;

/**
 * The hero dial: outer arc = progress of the current segment,
 * inner faint arc = progress of the whole session.
 */
export default function Dial({ progress, sessionProgress, time, label, sub, running }) {
  const clamp = (v) => Math.min(1, Math.max(0, v || 0));

  return (
    <div className="relative grid place-items-center">
      <div
        className={`absolute h-64 w-64 rounded-full accent-fill blur-3xl opacity-25 sm:h-72 sm:w-72 ${
          running ? 'ring-pulse' : ''
        }`}
        aria-hidden
      />
      <svg viewBox="0 0 240 240" className="relative h-64 w-64 -rotate-90 sm:h-72 sm:w-72">
        <defs>
          <linearGradient id="dial-accent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-a)" />
            <stop offset="100%" stopColor="var(--accent-b)" />
          </linearGradient>
        </defs>
        <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <circle
          cx="120"
          cy="120"
          r={R}
          fill="none"
          stroke="url(#dial-accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - clamp(progress))}
          style={{ transition: 'stroke-dashoffset 120ms linear' }}
        />
        <circle cx="120" cy="120" r={R - 16} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
        <circle
          cx="120"
          cy="120"
          r={R - 16}
          fill="none"
          stroke="rgba(255,255,255,0.42)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * (R - 16)}
          strokeDashoffset={2 * Math.PI * (R - 16) * (1 - clamp(sessionProgress))}
          style={{ transition: 'stroke-dashoffset 120ms linear' }}
        />
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.28em] text-mist">{label}</span>
        <span className="tnum mt-1 text-6xl font-semibold tracking-tight sm:text-7xl">{time}</span>
        {sub ? <span className="mt-1 text-xs text-mist tnum">{sub}</span> : null}
      </div>
    </div>
  );
}
