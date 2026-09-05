/**
 * Timer definitions and the schedule compiler.
 *
 * A schedule is a flat list of segments plus a flat list of audio cues, both
 * expressed in seconds from the start of the run. The runtime never has to
 * decide "what comes next" — it just reads the compiled arrays.
 */

export const PRESETS = [
  {
    id: 'tabata-20-10-3',
    kind: 'interval',
    name: 'Tabata 20/10',
    duration: 180,
    work: 20,
    rest: 10,
    accent: 'ember',
  },
  {
    id: 'interval-30-20-3',
    kind: 'interval',
    name: 'Intervalle 30/20',
    duration: 180,
    work: 30,
    rest: 20,
    accent: 'ember',
  },
  {
    id: 'single-1',
    kind: 'single',
    name: 'Bloc 1 minute',
    duration: 60,
    accent: 'violet',
  },
  {
    id: 'gong-3',
    kind: 'gongs',
    name: 'Gong 3 minutes',
    duration: 180,
    every: 60,
    accent: 'violet',
  },
  {
    id: 'gong-5',
    kind: 'gongs',
    name: 'Gong 5 minutes',
    duration: 300,
    every: 60,
    accent: 'violet',
  },
  {
    id: 'tabata-20-10-5',
    kind: 'interval',
    name: 'Tabata 20/10',
    duration: 300,
    work: 20,
    rest: 10,
    accent: 'ember',
  },
  {
    id: 'interval-30-20-5',
    kind: 'interval',
    name: 'Intervalle 30/20',
    duration: 300,
    work: 30,
    rest: 20,
    accent: 'ember',
  },
];

export function presetSubtitle(preset) {
  const minutes = preset.duration / 60;
  const label = `${minutes} min`;
  if (preset.kind === 'interval') return `${preset.work}s / ${preset.rest}s · ${label}`;
  if (preset.kind === 'gongs') return `Gong chaque minute · ${label}`;
  return `Début & fin · ${label}`;
}

/** How many work intervals a preset contains — shown on the cards. */
export function presetRounds(preset) {
  if (preset.kind !== 'interval') return null;
  return buildSchedule(preset).segments.filter((s) => s.kind === 'work').length;
}

/**
 * Annotate each audible cue with the room it has before the next one, so the
 * engine can trim a strike that would otherwise still be ringing when the next
 * interval opens. Countdown ticks are skipped — far too short to collide.
 * A headroom of 0 on the last cue means "let it ring out".
 */
function withHeadroom(cues) {
  const anchors = cues.filter((c) => c.type !== 'tick');
  anchors.forEach((cue, i) => {
    const next = anchors[i + 1];
    cue.until = next ? next.t - cue.t : 0;
  });
  return cues;
}

function pushCountdown(cues, at) {
  for (let n = 3; n >= 1; n -= 1) {
    if (at - n > 0.05) cues.push({ t: at - n, type: 'tick' });
  }
}

/**
 * Compile a preset into { total, segments, cues }.
 * `countdown` adds three ticks before every segment change.
 */
export function buildSchedule(preset, { countdown = false } = {}) {
  const total = preset.duration;
  const segments = [];
  const cues = [];

  if (preset.kind === 'interval') {
    let t = 0;
    let round = 0;
    let phase = 'work';
    while (t < total - 0.001) {
      const nominal = phase === 'work' ? preset.work : preset.rest;
      const duration = Math.min(nominal, total - t);
      if (phase === 'work') round += 1;
      segments.push({
        kind: phase,
        label: phase === 'work' ? 'Effort' : 'Repos',
        round,
        start: t,
        duration,
      });
      cues.push({ t, type: phase });
      if (countdown && t > 0) pushCountdown(cues, t);
      t += duration;
      phase = phase === 'work' ? 'rest' : 'work';
    }
  } else if (preset.kind === 'gongs') {
    const step = preset.every;
    let t = 0;
    let round = 0;
    while (t < total - 0.001) {
      const duration = Math.min(step, total - t);
      round += 1;
      segments.push({ kind: 'run', label: `Minute ${round}`, round, start: t, duration });
      cues.push({ t, type: t === 0 ? 'start' : 'minute' });
      if (countdown && t > 0) pushCountdown(cues, t);
      t += duration;
    }
  } else {
    segments.push({ kind: 'run', label: 'En cours', round: 1, start: 0, duration: total });
    cues.push({ t: 0, type: 'start' });
  }

  cues.push({ t: total, type: 'end' });
  if (countdown) pushCountdown(cues, total);
  cues.sort((a, b) => a.t - b.t);
  withHeadroom(cues);

  return { total, segments, cues };
}

/** Meditation runs are a single stretch with optional interval bells. */
export function buildMeditationSchedule({ minutes, bellEvery = 0 }) {
  const total = Math.round(minutes * 60);
  const cues = [{ t: 0, type: 'start' }];
  if (bellEvery > 0) {
    for (let t = bellEvery * 60; t < total - 1; t += bellEvery * 60) {
      cues.push({ t, type: 'minute' });
    }
  }
  cues.push({ t: total, type: 'end' });
  return {
    total,
    segments: [{ kind: 'meditation', label: 'Méditation', round: 1, start: 0, duration: total }],
    cues: withHeadroom(cues.sort((a, b) => a.t - b.t)),
  };
}

export function segmentAt(segments, elapsed) {
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (elapsed >= segments[i].start - 0.0001) return { ...segments[i], index: i };
  }
  return { ...segments[0], index: 0 };
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds - 0.0001));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
