'use client';

import { useCallback, useEffect, useMemo } from 'react';
import Dial from './Dial';
import FocusOverlay from './FocusOverlay';
import { ExpandIcon, GhostButton, ProgressBar, ResetIcon, Slider, TransportButton } from './ui';
import { AMBIENCES, findAmbience } from '@/lib/ambience';
import { buildMeditationSchedule, formatTime } from '@/lib/presets';
import { getEngine } from '@/lib/audio';
import { useFocusMode, useHotkeys, useRunner, useWakeLock } from '@/lib/useRunner';

const DURATIONS = [3, 5, 10, 15, 20, 30, 45, 60];
const BELLS = [
  { value: 0, label: 'Aucune' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
];

const AMBIENCE_ACCENTS = {
  none: ['#a78bfa', '#6366f1'],
  forest: ['#7dd3a0', '#2f9e6f'],
  ocean: ['#5ec8f0', '#2f6fe0'],
  rain: ['#93a7d8', '#4f5fbf'],
  stream: ['#6ee7d4', '#2f97c0'],
  storm: ['#8f9fe8', '#4338ca'],
};

export default function MeditationView({ minutes, onMinutesChange, ambienceId, onAmbienceChange, bellEvery, onBellChange, ambienceVolume, onAmbienceVolumeChange }) {
  const schedule = useMemo(() => buildMeditationSchedule({ minutes, bellEvery }), [minutes, bellEvery]);
  const ambience = findAmbience(ambienceId);

  const fadeOut = useCallback(() => {
    const engine = getEngine();
    if (engine) engine.stopAmbience({ fade: 6 });
  }, []);

  const { status, elapsed, start, pause, resume, reset } = useRunner(schedule, { onFinish: fadeOut });
  const running = status === 'running';
  const done = status === 'done';
  const { focus, enter: enterFocus, exit: exitFocus } = useFocusMode();
  useWakeLock(running || focus);

  const [accentA, accentB] = AMBIENCE_ACCENTS[ambience.id] || AMBIENCE_ACCENTS.none;
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-a', accentA);
    root.style.setProperty('--accent-b', accentB);
  }, [accentA, accentB]);

  // Stop the soundscape when the view unmounts (tab change, navigation).
  useEffect(
    () => () => {
      const engine = getEngine();
      if (engine) engine.stopAmbience({ fade: 1.2 });
    },
    [],
  );

  const pickAmbience = (id) => {
    onAmbienceChange(id);
    const engine = getEngine();
    if (!engine) return;
    const next = findAmbience(id);
    if (next.url) engine.startAmbience(next.url).catch(() => {});
    else engine.stopAmbience({ fade: 1.5 });
  };

  const onTransport = useCallback(() => {
    const engine = getEngine();
    if (running) {
      pause();
      return;
    }
    if (engine && ambience.url) engine.startAmbience(ambience.url).catch(() => {});
    if (status === 'paused') resume();
    else start();
  }, [ambience.url, pause, resume, running, start, status]);

  const onReset = useCallback(() => {
    reset();
    fadeOut();
  }, [fadeOut, reset]);

  useHotkeys({ onToggle: onTransport, onReset });

  return (
    <div className="flex flex-col items-center gap-8">
      <FocusOverlay
        open={focus}
        progress={elapsed / schedule.total}
        running={running}
        onToggle={onTransport}
        onExit={exitFocus}
      />

      <div className={running ? 'breathe' : undefined}>
        <Dial
          progress={elapsed / schedule.total}
          sessionProgress={elapsed / schedule.total}
          time={formatTime(done ? 0 : schedule.total - elapsed)}
          label={done ? 'Terminé' : ambience.name}
          sub={bellEvery > 0 ? `Cloche toutes les ${bellEvery} min` : null}
          running={running}
        />
      </div>

      <div className="w-full max-w-md space-y-2">
        <ProgressBar value={elapsed / schedule.total} />
        <div className="flex justify-between text-xs text-mist tnum">
          <span>{formatTime(elapsed)}</span>
          <span>{minutes} min</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <GhostButton onClick={onReset} ariaLabel="Réinitialiser" title="Réinitialiser (R)">
          <ResetIcon />
        </GhostButton>
        <TransportButton running={running} onClick={onTransport} />
        <GhostButton onClick={enterFocus} ariaLabel="Mode focus" title="Mode focus — plein écran, sans chiffres">
          <ExpandIcon />
        </GhostButton>
      </div>

      <div className="w-full space-y-5">
        <section>
          <h2 className="mb-3 text-[0.7rem] font-medium uppercase tracking-[0.28em] text-mist">Ambiance</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {AMBIENCES.map((a) => {
              const active = a.id === ambience.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => pickAmbience(a.id)}
                  aria-pressed={active}
                  className={`panel rounded-2xl px-3 py-3 text-left transition ${
                    active ? 'accent-glow border-white/20 bg-white/8' : 'hover:bg-white/6'
                  }`}
                >
                  <span className="text-lg leading-none">{a.emoji}</span>
                  <span className="mt-2 block text-sm font-semibold">{a.name}</span>
                  <span className="block text-[0.7rem] text-mist">{a.hint}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel rounded-2xl px-4 py-3">
          <h2 className="mb-3 text-[0.7rem] font-medium uppercase tracking-[0.28em] text-mist">Durée</h2>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onMinutesChange(d)}
                aria-pressed={d === minutes}
                className={`tnum rounded-full px-3.5 py-1.5 text-sm transition ${
                  d === minutes ? 'accent-fill text-ink font-semibold' : 'bg-white/6 text-chalk/75 hover:bg-white/12'
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
          <Slider
            label="Durée personnalisée"
            value={minutes}
            min={1}
            max={90}
            onChange={onMinutesChange}
            display={`${minutes} min`}
          />
        </section>

        <section className="panel rounded-2xl px-4 py-3">
          <h2 className="mb-3 text-[0.7rem] font-medium uppercase tracking-[0.28em] text-mist">Cloches intermédiaires</h2>
          <div className="flex flex-wrap gap-2">
            {BELLS.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => onBellChange(b.value)}
                aria-pressed={b.value === bellEvery}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  b.value === bellEvery ? 'accent-fill text-ink font-semibold' : 'bg-white/6 text-chalk/75 hover:bg-white/12'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <Slider
            label="Volume de l’ambiance"
            value={Math.round(ambienceVolume * 100)}
            min={0}
            max={100}
            onChange={(v) => onAmbienceVolumeChange(v / 100)}
            display={`${Math.round(ambienceVolume * 100)} %`}
          />
        </section>
      </div>
    </div>
  );
}
