'use client';

import { useCallback, useEffect, useMemo } from 'react';
import Dial from './Dial';
import FocusOverlay from './FocusOverlay';
import { ExpandIcon, GhostButton, ProgressBar, ResetIcon, SegmentStrip, TransportButton } from './ui';
import { PRESETS, buildSchedule, formatTime, presetRounds, presetSubtitle, segmentAt } from '@/lib/presets';
import { useFocusMode, useHotkeys, useRunner, useWakeLock } from '@/lib/useRunner';

const ACCENTS = {
  work: ['#ff9a3c', '#ff3d6e'],
  rest: ['#4fd6c8', '#3f8cff'],
  run: ['#a78bfa', '#6366f1'],
  idle: ['#a78bfa', '#6366f1'],
};

export default function WorkoutView({ presetId, onPresetChange, countdown, lead }) {
  const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
  const schedule = useMemo(() => buildSchedule(preset, { countdown, lead }), [preset, countdown, lead]);
  const { status, elapsed, counting, start, pause, resume, reset } = useRunner(schedule);

  const running = status === 'running';
  const done = status === 'done';
  const { focus, enter: enterFocus, exit: exitFocus } = useFocusMode();
  useWakeLock(running || focus);

  // Everything the run itself sees is clamped at 0: the get-ready stretch is
  // counted down separately and must not bleed into progress or segments.
  const runElapsed = Math.max(0, elapsed);
  const current = segmentAt(schedule.segments, runElapsed);
  const phase = done || counting || status === 'idle' ? 'idle' : current.kind;
  const [accentA, accentB] = ACCENTS[phase] || ACCENTS.idle;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-a', accentA);
    root.style.setProperty('--accent-b', accentB);
  }, [accentA, accentB]);

  const intoSegment = Math.min(current.duration, Math.max(0, runElapsed - current.start));
  const segmentRemaining = current.duration - intoSegment;
  const totalRounds = schedule.segments.filter((s) => s.kind === 'work').length;

  const heroTime = counting
    ? String(Math.max(1, Math.ceil(-elapsed - 0.0001)))
    : done
      ? formatTime(0)
      : formatTime(status === 'idle' ? current.duration : segmentRemaining);
  const heroLabel = counting ? 'Prêt' : done ? 'Terminé' : status === 'idle' ? preset.name : current.label;
  const heroSub = counting
    ? preset.name
    : preset.kind === 'interval' && !done
      ? `Round ${current.round} / ${totalRounds}`
      : preset.kind === 'gongs' && !done
        ? `${current.label} / ${schedule.segments.length}`
        : null;

  const onTransport = useCallback(() => {
    if (running) pause();
    else if (status === 'paused') resume();
    else start();
  }, [pause, resume, running, start, status]);

  useHotkeys({ onToggle: onTransport, onReset: reset });

  // During the lead-in the ring fills up to the start instead of tracking a segment.
  const segmentProgress = counting
    ? (schedule.lead + elapsed) / schedule.lead
    : status === 'idle'
      ? 0
      : intoSegment / current.duration;
  const sessionProgress = runElapsed / schedule.total;

  return (
    <div className="flex flex-col items-center gap-8">
      <FocusOverlay
        open={focus}
        progress={segmentProgress}
        sessionProgress={sessionProgress}
        running={running}
        onToggle={onTransport}
        onExit={exitFocus}
      />

      <Dial
        progress={segmentProgress}
        sessionProgress={sessionProgress}
        time={heroTime}
        label={heroLabel}
        sub={heroSub}
        running={running}
      />

      <div className="w-full max-w-md space-y-3">
        <ProgressBar value={sessionProgress} />
        <SegmentStrip
          segments={schedule.segments}
          total={schedule.total}
          activeIndex={status === 'idle' || counting ? -1 : done ? schedule.segments.length : current.index}
        />
        <div className="flex justify-between text-xs text-mist tnum">
          <span>{formatTime(runElapsed)} écoulé</span>
          <span>{formatTime(schedule.total - runElapsed)} restant</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <GhostButton onClick={reset} ariaLabel="Réinitialiser" title="Réinitialiser (R)">
          <ResetIcon />
        </GhostButton>
        <TransportButton running={running} onClick={onTransport} />
        <GhostButton onClick={enterFocus} ariaLabel="Mode focus" title="Mode focus — plein écran, sans chiffres">
          <ExpandIcon />
        </GhostButton>
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
              className={`panel rounded-2xl px-4 py-3.5 text-left transition ${
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
