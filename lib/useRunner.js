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
  // The get-ready stretch sits at negative times, so elapsed starts at -lead
  // and the run itself still opens at 0.
  const lead = schedule.lead || 0;

  const loop = useCallback(() => {
    const value = clock() - originRef.current;
    if (value >= total) {
      setElapsed(total);
      setStatus('done');
      stopLoop();
      if (finishRef.current) finishRef.current();
      return;
    }
    setElapsed(value);
    rafRef.current = requestAnimationFrame(loop);
  }, [clock, total, stopLoop]);

  /** (Re)arm the run from `offset` seconds in. */
  const launch = useCallback(
    async (offset) => {
      const engine = getEngine();
      // Decode the gong sample first, otherwise the cues scheduled below would
      // silently fall back to the synthesised bell on the very first run.
      if (engine) await engine.prepare();

      const origin = clock() + LEAD - offset;
      originRef.current = origin;

      if (engine && engine.ctx) {
        engine.cancelCues();
        schedule.cues
          .filter((cue) => cue.t >= offset - 0.001)
          .forEach((cue) => engine.cue(cue.type, origin + cue.t, cue.until));
      }

      setStatus('running');
      stopLoop();
      rafRef.current = requestAnimationFrame(loop);
    },
    [clock, loop, schedule, stopLoop],
  );

  const start = useCallback(() => launch(-lead), [launch, lead]);

  const pause = useCallback(() => {
    const engine = getEngine();
    if (engine) engine.cancelCues();
    pausedAtRef.current = Math.min(total, Math.max(-lead, clock() - originRef.current));
    setElapsed(pausedAtRef.current);
    setStatus('paused');
    stopLoop();
  }, [clock, lead, stopLoop, total]);

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

  return {
    status,
    elapsed,
    // Negative during the get-ready stretch: the run has not opened yet.
    counting: elapsed < 0,
    remaining: Math.max(0, total - Math.max(0, elapsed)),
    start,
    pause,
    resume,
    reset,
    toggle,
  };
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

/**
 * Focus mode: a boolean paired with the browser's fullscreen state.
 *
 * Fullscreen can be refused (iOS Safari) or dismissed by the user pressing Esc,
 * so the flag is the source of truth for the UI and fullscreen is best-effort;
 * leaving fullscreen by any route closes focus mode.
 */
export function useFocusMode() {
  const [focus, setFocus] = useState(false);
  const focusRef = useRef(false);
  focusRef.current = focus;

  const enter = useCallback(() => {
    setFocus(true);
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }, []);

  const exit = useCallback(() => {
    setFocus(false);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFocus(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        exit();
        return;
      }
      if (e.code !== 'KeyF' || e.target instanceof HTMLInputElement) return;
      if (focusRef.current) exit();
      else enter();
    };
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
    };
  }, [enter, exit]);

  return { focus, enter, exit };
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
