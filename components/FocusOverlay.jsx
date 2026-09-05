'use client';

import { useEffect, useRef, useState } from 'react';

const R = 104;
const C = 2 * Math.PI * R;

/**
 * Focus mode: the ring and nothing else — no digits, no labels, no chrome.
 * The colour still follows the phase, so effort and rest stay readable without
 * anything to count. Tap anywhere to start or pause, Esc or the corner button
 * to leave.
 */
export default function FocusOverlay({ open, progress, sessionProgress, running, onToggle, onExit }) {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const wake = () => {
      setIdle(false);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIdle(true), 2600);
    };
    wake();
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
    };
  }, [open]);

  if (!open) return null;

  const clamp = (v) => Math.min(1, Math.max(0, v || 0));
  const inner = R - 14;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={running ? 'Mettre en pause' : 'Démarrer'}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onToggle();
      }}
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-ink select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative grid place-items-center">
        <div
          className={`absolute rounded-full accent-fill blur-3xl opacity-25 ${running ? 'ring-pulse' : ''}`}
          style={{ width: 'min(70vmin, 70vh)', height: 'min(70vmin, 70vh)' }}
          aria-hidden
        />
        <svg
          viewBox="0 0 240 240"
          className="relative -rotate-90"
          style={{ width: 'min(78vmin, 78vh)', height: 'min(78vmin, 78vh)' }}
        >
          <defs>
            <linearGradient id="focus-accent" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent-a)" />
              <stop offset="100%" stopColor="var(--accent-b)" />
            </linearGradient>
          </defs>
          <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
          <circle
            cx="120"
            cy="120"
            r={R}
            fill="none"
            stroke="url(#focus-accent)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - clamp(progress))}
            style={{ transition: 'stroke-dashoffset 120ms linear' }}
          />
          {sessionProgress === undefined ? null : (
            <circle
              cx="120"
              cy="120"
              r={inner}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * inner}
              strokeDashoffset={2 * Math.PI * inner * (1 - clamp(sessionProgress))}
              style={{ transition: 'stroke-dashoffset 120ms linear' }}
            />
          )}
        </svg>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        aria-label="Quitter le mode focus"
        className={`absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-chalk/70 transition-opacity duration-500 hover:bg-white/10 ${
          idle ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>

      <p
        className={`absolute bottom-8 text-[0.7rem] uppercase tracking-[0.3em] text-mist transition-opacity duration-500 ${
          idle ? 'opacity-0' : 'opacity-60'
        }`}
      >
        Toucher pour {running ? 'mettre en pause' : 'démarrer'} · Échap pour sortir
      </p>
    </div>
  );
}
