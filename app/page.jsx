'use client';

import { useEffect, useState } from 'react';
import MeditationView from '@/components/MeditationView';
import WorkoutView from '@/components/WorkoutView';
import { GhostButton, Slider, SoundIcon, Toggle } from '@/components/ui';
import { getEngine } from '@/lib/audio';
import { DEFAULT_GONGS, GONGS, GONG_ROLES } from '@/lib/gongs';
import { useLocalState } from '@/lib/useLocalState';

const TABS = [
  { id: 'workout', label: 'Entraînement' },
  { id: 'meditation', label: 'Méditation' },
];

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="3.2" />
      <path
        d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V20a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 18.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.03 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.03Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  const [tab, setTab] = useLocalState('tab', 'workout');
  const [muted, setMuted] = useLocalState('muted', false);
  const [cueVolume, setCueVolume] = useLocalState('cueVolume', 0.9);
  const [ambienceVolume, setAmbienceVolume] = useLocalState('ambienceVolume', 0.6);
  const [countdown, setCountdown] = useLocalState('countdown', false);
  const [presetId, setPresetId] = useLocalState('preset', 'tabata-20-10-3');
  const [minutes, setMinutes] = useLocalState('medMinutes', 10);
  const [ambienceId, setAmbienceId] = useLocalState('ambience', 'forest');
  const [bellEvery, setBellEvery] = useLocalState('bell', 0);
  const [gongs, setGongs] = useLocalState('gongs', DEFAULT_GONGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Mirror the preferences into the audio engine.
  useEffect(() => {
    const engine = getEngine();
    if (engine) engine.setMuted(muted);
  }, [muted]);
  useEffect(() => {
    const engine = getEngine();
    if (engine) engine.setCueVolume(cueVolume);
  }, [cueVolume]);
  useEffect(() => {
    const engine = getEngine();
    if (engine) engine.setAmbienceVolume(ambienceVolume);
  }, [ambienceVolume]);
  useEffect(() => {
    const engine = getEngine();
    if (engine) Object.entries(gongs).forEach(([role, id]) => engine.setGong(role, id));
  }, [gongs]);

  // Preview a role with the room a real interval would give it, so a long gong
  // on a short rest is auditioned exactly as it will be heard.
  const PREVIEW_ROOM = { work: 20, rest: 10 };
  const applyGongs = (next, previewRole) => {
    setGongs(next);
    const engine = getEngine();
    if (!engine) return;
    Object.entries(next).forEach(([role, id]) => engine.setGong(role, id));
    if (previewRole) engine.preview(previewRole, PREVIEW_ROOM[previewRole]).catch(() => {});
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'KeyM') setMuted((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setMuted]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-mist">welcome to</p>
          <h1 className="accent-text text-2xl font-semibold tracking-tight">tabata</h1>
        </div>
        <div className="flex items-center gap-2">
          <GhostButton
            onClick={() => setMuted(!muted)}
            ariaLabel={muted ? 'Réactiver le son' : 'Couper le son'}
            title={muted ? 'Son coupé (M)' : 'Couper le son (M)'}
          >
            <span className={muted ? 'text-mist' : undefined}>
              <SoundIcon muted={muted} />
            </span>
          </GhostButton>
          <GhostButton
            onClick={() => setSettingsOpen((v) => !v)}
            ariaLabel="Réglages"
            title="Réglages"
          >
            <GearIcon />
          </GhostButton>
        </div>
      </header>

      {muted ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-mist">
          Son coupé — le timer et la barre de progression fonctionnent normalement.
        </p>
      ) : null}

      {settingsOpen ? (
        <section className="panel mt-4 rounded-2xl px-4 py-3">
          <Toggle
            checked={!muted}
            onChange={(v) => setMuted(!v)}
            label="Sons activés"
            hint="Raccourci clavier : M"
          />
          <Toggle
            checked={countdown}
            onChange={setCountdown}
            label="Décompte 3-2-1"
            hint="Trois tics avant chaque changement de phase"
          />
          <Slider
            label="Volume des signaux"
            value={Math.round(cueVolume * 100)}
            min={0}
            max={100}
            onChange={(v) => setCueVolume(v / 100)}
            display={`${Math.round(cueVolume * 100)} %`}
          />
          {GONG_ROLES.map(({ role, label, hint }) => (
            <div key={role} className="px-1 pb-1 pt-3">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-mist">{hint}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {GONGS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => applyGongs({ ...gongs, [role]: g.id }, role)}
                    aria-pressed={g.id === gongs[role]}
                    title={g.hint}
                    className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                      g.id === gongs[role]
                        ? 'accent-fill text-ink font-semibold'
                        : 'bg-white/6 text-chalk/75 hover:bg-white/12'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 px-1 pb-1 pt-3">
            <button
              type="button"
              onClick={() => applyGongs({ work: gongs.rest, rest: gongs.work }, 'work')}
              className="rounded-full bg-white/6 px-3 py-1.5 text-xs text-chalk/75 transition hover:bg-white/12"
            >
              ⇄ Inverser les deux
            </button>
            {[
              ['minute', 'Gong minute'],
              ['end', 'Gong final'],
            ].map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => getEngine()?.preview(type).catch(() => {})}
                className="rounded-full bg-white/6 px-3 py-1.5 text-xs text-chalk/75 transition hover:bg-white/12"
              >
                ▸ {label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <nav className="mt-6 flex gap-1 self-center rounded-full border border-white/10 bg-white/5 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              tab === t.id ? 'accent-fill text-ink' : 'text-chalk/65 hover:text-chalk'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-10 flex-1">
        {tab === 'workout' ? (
          <WorkoutView presetId={presetId} onPresetChange={setPresetId} countdown={countdown} />
        ) : (
          <MeditationView
            minutes={minutes}
            onMinutesChange={setMinutes}
            ambienceId={ambienceId}
            onAmbienceChange={setAmbienceId}
            bellEvery={bellEvery}
            onBellChange={setBellEvery}
            ambienceVolume={ambienceVolume}
            onAmbienceVolumeChange={setAmbienceVolume}
          />
        )}
      </div>

      <footer className="mt-14 text-center text-[0.7rem] leading-relaxed text-mist/70">
        <p>Espace : démarrer / pause · R : réinitialiser · M : couper le son · F : mode focus</p>
        <p className="mt-1">
          Ambiances naturelles CC0 —{' '}
          <a
            href="https://archive.org/details/naturesounds-soundtheraphy"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-white/25 underline-offset-2 hover:text-chalk"
          >
            Internet Archive
          </a>
        </p>
      </footer>
    </main>
  );
}
