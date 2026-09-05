'use client';

import { useCallback, useEffect, useMemo } from 'react';
import Dial from './Dial';
import { GhostButton, ProgressBar, ResetIcon, SegmentStrip, TransportButton } from './ui';
import { PRESETS, buildSchedule, formatTime, presetRounds, presetSubtitle, segmentAt } from '@/lib/presets';
import { useHotkeys, useRunner, useWakeLock } from '@/lib/useRunner';

const ACCENTS = {
  work: ['#ff9a3c', '#ff3d6e'],
  rest: ['#4fd6c8', '#3f8cff'],
  run: ['#a78bfa', '#6366f1'],
  idle: ['#a78bfa', '#6366f1'],
};

export default function WorkoutView({ presetId, onPresetChange, countdown }) {
  const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
  const schedule = useMemo(() => buildSchedule(preset, { countdown }), [preset, countdown]);
  const { status, elapsed, start, pause, resume, reset } = useRunner(schedule);

  const running = status === 'running';
  const done = status === 'done';
  useWakeLock(running);

  const current = segmentAt(schedule.segments, elapsed);
  const phase = done ? 'idle' : status === 'idle' ? 'idle' : current.kind;
  const [accentA, accentB] = ACCENTS[phase] || ACCENTS.idle;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-a', accentA);
    root.style.setProperty('--accent-b', accentB);
  }, [accentA, accentB]);

  const intoSegment = Math.min(current.duration, Math.max(0, elapsed - current.start));
  const segmentRemaining = current.duration - intoSegment;
  const totalRounds = schedule.segments.filter((s) => s.kind === 'work').length;

  const heroTime = done ? formatTime(0) : formatTime(status === 'idle' ? current.duration : segmentRemaining);
  const heroLabel = done ? 'Terminé' : status === 'idle' ? preset.name : current.label;
  const heroSub =
    preset.kind === 'interval' && !done
      ? `Round ${current.kind === 'work' ? current.round : current.round} / ${totalRounds}`
      : preset.kind === 'gongs' && !done
        ? `${current.label} / ${schedule.segments.length}`
        : null;

  const onTransport = useCallback(() => {
    if (running) pause();
    else if (status === 'paused') resume();
    else start();
  }, [pause, resume, running, start, status]);

  useHotkeys({ onToggle: onTransport, onReset: reset });

  return (
    <div className="flex flex-col items-center gap-8">
      <Dial
        progress={status === 'idle' ? 0 : intoSegment / current.duration}
        sessionProgress={elapsed / schedule.total}
        time={heroTime}
        label={heroLabel}
        sub={heroSub}
        running={running}
      />

      <div className="w-full max-w-md space-y-3">
        <ProgressBar value={elapsed / schedule.total} />
        <SegmentStrip
          segments={schedule.segments}
          total={schedule.total}
          activeIndex={status === 'idle' ? -1 : done ? schedule.segments.length : current.index}
        />
        <div className="flex justify-between text-xs text-mist tnum">
          <span>{formatTime(elapsed)} écoulé</span>
          <span>{formatTime(schedule.total - elapsed)} restant</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <GhostButton onClick={reset} ariaLabel="Réinitialiser" title="Réinitialiser (R)">
          <ResetIcon />
        </GhostButton>
        <TransportButton running={running} onClick={onTransport} />
        <div className="h-12 w-12" aria-hidden />
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRESETS.map((p) => {
          const active = p.id === preset.id;
          const rounds = presetRounds(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              aria-pressed={active}
              className={`panel group rounded-2xl px-4 py-3.5 text-left transition ${
                active ? 'accent-glow border-white/20 bg-white/8' : 'hover:bg-white/6'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="tnum text-xs text-mist">{p.duration / 60} min</span>
              </div>
              <p className="mt-1 text-xs text-mist">{presetSubtitle(p)}</p>
              {rounds ? (
                <p className={`mt-2 text-[0.7rem] uppercase tracking-widest ${active ? 'accent-text' : 'text-mist/70'}`}>
                  {rounds} rounds
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
