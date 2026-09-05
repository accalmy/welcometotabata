'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getEngine } from './audio';

const LEAD = 0.12; // small head start so the first cue is never clipped

/**
 * Drives a compiled schedule.
 *
 * The elapsed time is read from the AudioContext clock, the very same clock the
 * cues are scheduled against, so the bar and the sound can never drift apart.
 * When the tab is backgrounded rAF stops firing but the clock keeps running, so
 * the UI simply catches up on the next frame.
 */
export function useRunner(schedule, { onFinish } = {}) {
  const [status, setStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);

  const originRef = useRef(0); // clock value corresponding to elapsed = 0
  const pausedAtRef = useRef(0);
  const rafRef = useRef(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const clock = useCallback(() => {
    const engine = getEngine();
    return engine && engine.ctx ? engine.ctx.currentTime : performance.now() / 1000;
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const total = schedule.total;

  const loop = useCallback(() => {
    const value = clock() - originRef.current;
    if (value >= total) {
      setElapsed(total);
      setStatus('done');
      stopLoop();
      if (finishRef.current) finishRef.current();
      return;
    }
    setElapsed(Math.max(0, value));
    rafRef.current = requestAnimationFrame(loop);
  }, [clock, total, stopLoop]);

  /** (Re)arm the run from `offset` seconds in. */
  const launch = useCallback(
    async (offset) => {
      const engine = getEngine();
      if (engine) await engine.resume();

      const origin = clock() + LEAD - offset;
      originRef.current = origin;

      if (engine && engine.ctx) {
        engine.cancelCues();
        schedule.cues
          .filter((cue) => cue.t >= offset - 0.001)
          .forEach((cue) => engine.cue(cue.type, origin + cue.t));
      }

      setStatus('running');
      stopLoop();
      rafRef.current = requestAnimationFrame(loop);
    },
    [clock, loop, schedule, stopLoop],
  );

  const start = useCallback(() => launch(0), [launch]);

  const pause = useCallback(() => {
    const engine = getEngine();
    if (engine) engine.cancelCues();
    pausedAtRef.current = Math.min(total, Math.max(0, clock() - originRef.current));
    setElapsed(pausedAtRef.current);
    setStatus('paused');
    stopLoop();
  }, [clock, stopLoop, total]);

  const resume = useCallback(() => launch(pausedAtRef.current), [launch]);

  const reset = useCallback(() => {
    const engine = getEngine();
    if (engine) engine.cancelCues();
    stopLoop();
    pausedAtRef.current = 0;
    setElapsed(0);
    setStatus('idle');
  }, [stopLoop]);

  const toggle = useCallback(() => {
    if (status === 'running') pause();
    else if (status === 'paused') resume();
    else if (status === 'done') start();
    else start();
  }, [pause, resume, start, status]);

  // A schedule change (different preset, different duration) invalidates the run.
  useEffect(() => {
    const engine = getEngine();
    if (engine) engine.cancelCues();
    stopLoop();
    pausedAtRef.current = 0;
    setElapsed(0);
    setStatus('idle');
  }, [schedule, stopLoop]);

  useEffect(() => stopLoop, [stopLoop]);

  return { status, elapsed, remaining: Math.max(0, total - elapsed), start, pause, resume, reset, toggle };
}

/**
 * Space toggles, R resets. Buttons are skipped so that pressing space on a
 * focused control does not fire both the click and the shortcut.
 */
export function useHotkeys({ onToggle, onReset }) {
  useEffect(() => {
    const handler = (e) => {
      const el = e.target;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLButtonElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        onToggle();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        onReset();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggle, onReset]);
}

/** Keep the screen awake while a timer is running, where the browser allows it. */
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.wakeLock) return undefined;
    let lock = null;
    let cancelled = false;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        /* denied or unsupported — harmless */
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (lock) lock.release().catch(() => {});
    };
  }, [active]);
}
