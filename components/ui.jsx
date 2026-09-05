'use client';

export function ProgressBar({ value, className = '' }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-white/8 ${className}`}>
      <div
        className="h-full rounded-full accent-fill"
        style={{ width: `${pct}%`, transition: 'width 120ms linear' }}
      />
    </div>
  );
}

/** Thin blocks, one per segment, so a Tabata run is readable at a glance. */
export function SegmentStrip({ segments, total, activeIndex }) {
  return (
    <div className="flex h-1.5 w-full gap-[3px]">
      {segments.map((seg, i) => (
        <div
          key={`${seg.start}-${i}`}
          style={{ flexGrow: seg.duration / total }}
          className={`rounded-full transition-colors duration-300 ${
            i < activeIndex
              ? 'bg-white/45'
              : i === activeIndex
                ? 'accent-fill'
                : seg.kind === 'rest'
                  ? 'bg-white/10'
                  : 'bg-white/18'
          }`}
          title={`${seg.label} · ${seg.duration}s`}
        />
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl px-1 py-2 text-left transition hover:bg-white/5"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="block text-xs text-mist">{hint}</span> : null}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'accent-fill' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[1.375rem]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, display }) {
  return (
    <label className="block px-1 py-2">
      <span className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tnum text-xs text-mist">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full"
      />
    </label>
  );
}

export function PlayIcon({ paused }) {
  return paused ? (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72c0 .8.87 1.29 1.55.87l10.8-6.86a1.03 1.03 0 0 0 0-1.74L9.55 4.27A1.03 1.03 0 0 0 8 5.14Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
      <rect x="6" y="4.5" width="4.2" height="15" rx="1.6" />
      <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.6" />
    </svg>
  );
}

export function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" />
      <path d="M3 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SoundIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z" strokeLinejoin="round" />
      {muted ? (
        <>
          <path d="M16.5 9.5l4 5" strokeLinecap="round" />
          <path d="M20.5 9.5l-4 5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M16 9a4.2 4.2 0 0 1 0 6" strokeLinecap="round" />
          <path d="M18.8 6.6a8 8 0 0 1 0 10.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/** Big primary transport button. */
export function TransportButton({ running, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={running ? 'Mettre en pause' : 'Démarrer'}
      className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full accent-fill text-ink accent-glow transition active:scale-95 disabled:opacity-40"
    >
      <PlayIcon paused={!running} />
    </button>
  );
}

export function GhostButton({ children, onClick, ariaLabel, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/5 text-chalk/80 transition hover:bg-white/10 hover:text-chalk active:scale-95"
    >
      {children}
    </button>
  );
}
