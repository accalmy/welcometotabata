'use client';

/**
 * Audio engine built directly on the Web Audio API.
 *
 * Cues (gong / chime / tick) are synthesised, so they need no network request,
 * have zero latency, and stay perfectly in sync with the timer: every cue of a
 * run is scheduled up-front against `ctx.currentTime`, which is the same clock
 * the UI reads. Ambience tracks are decoded PCM buffers, looped seamlessly.
 */

// Classic Risset bell partials: inharmonic ratios give the metallic gong tail.
const RISSET_BELL = {
  ratios: [0.56, 0.56, 0.92, 0.92, 1.19, 1.7, 2, 2.74, 3, 3.76, 4.07],
  detune: [0, 1, 0, 1.7, 0, 0, 0, 0, 0, 0, 0],
  amps: [1, 0.67, 1, 1.8, 2.67, 1.67, 1.46, 1.33, 1.33, 0.75, 1.33],
  decays: [1, 0.9, 0.65, 0.55, 0.325, 0.35, 0.25, 0.2, 0.15, 0.1, 0.075],
};

class Engine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.cueBus = null;
    this.ambienceBus = null;
    this.noise = null;
    this.scheduled = [];
    this.ambience = { source: null, gain: null, key: null };
    this.buffers = new Map();
    this.muted = false;
    this.cueVolume = 0.9;
    this.ambienceVolume = 0.6;
  }

  /** Lazily build the graph. Must be called from a user gesture the first time. */
  ensure() {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;

    const ctx = new AudioCtor();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(ctx.destination);

    const cueBus = ctx.createGain();
    cueBus.gain.value = this.cueVolume;
    cueBus.connect(master);

    const ambienceBus = ctx.createGain();
    ambienceBus.gain.value = this.ambienceVolume;
    ambienceBus.connect(master);

    // One shared buffer of white noise, reused by every transient.
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

    Object.assign(this, { ctx, master, cueBus, ambienceBus, noise });
    return ctx;
  }

  async resume() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* autoplay policy — the next gesture will retry */
      }
    }
    return ctx;
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.02);
  }

  setCueVolume(v) {
    this.cueVolume = v;
    if (this.cueBus) this.cueBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  setAmbienceVolume(v) {
    this.ambienceVolume = v;
    if (this.ambienceBus) this.ambienceBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  track(node) {
    this.scheduled.push(node);
    node.onended = () => {
      this.scheduled = this.scheduled.filter((n) => n !== node);
    };
  }

  /** Kill every pending cue — used on pause and reset. */
  cancelCues() {
    this.scheduled.forEach((node) => {
      try {
        node.onended = null;
        node.stop();
      } catch {
        /* already stopped */
      }
    });
    this.scheduled = [];
  }

  // ------------------------------------------------------------------ cues

  gong(at, { freq = 174, dur = 4.2, gain = 1 } = {}) {
    const { ctx, cueBus } = this;
    const out = ctx.createGain();
    out.gain.value = gain * 0.09;
    out.connect(cueBus);

    RISSET_BELL.ratios.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      osc.detune.value = RISSET_BELL.detune[i] * 6;

      const life = Math.max(0.08, dur * RISSET_BELL.decays[i]);
      const peak = RISSET_BELL.amps[i] * 0.3;
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(peak, at + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, at + life);

      osc.connect(env).connect(out);
      osc.start(at);
      osc.stop(at + life + 0.05);
      this.track(osc);
    });

    // Mallet strike: a short filtered noise burst welded onto the attack.
    const strike = ctx.createBufferSource();
    strike.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * 4;
    bp.Q.value = 1.2;
    const strikeEnv = ctx.createGain();
    strikeEnv.gain.setValueAtTime(0.5, at);
    strikeEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
    strike.connect(bp).connect(strikeEnv).connect(out);
    strike.start(at);
    strike.stop(at + 0.15);
    this.track(strike);
  }

  /** Bright two-note click — the "cliquetis" that opens a rest interval. */
  chime(at, { freq = 1244.5, gain = 1 } = {}) {
    const { ctx, cueBus } = this;
    const out = ctx.createGain();
    out.gain.value = gain * 0.22;
    out.connect(cueBus);

    [
      { f: freq, t: 0, d: 0.18 },
      { f: freq * 1.5, t: 0.075, d: 0.22 },
    ].forEach(({ f, t, d }) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      env.gain.setValueAtTime(0.0001, at + t);
      env.gain.exponentialRampToValueAtTime(0.35, at + t + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, at + t + d);
      osc.connect(env).connect(out);
      osc.start(at + t);
      osc.stop(at + t + d + 0.05);
      this.track(osc);
    });
  }

  /** Dry tick for the optional 3-2-1 countdown. */
  tick(at, { freq = 1600, gain = 1 } = {}) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(0.12 * gain, at + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    osc.connect(env).connect(this.cueBus);
    osc.start(at);
    osc.stop(at + 0.1);
    this.track(osc);
  }

  /** Named cue vocabulary used by the timer schedules. */
  cue(type, at) {
    if (!this.ctx) return;
    switch (type) {
      case 'work':
        this.gong(at, { freq: 220, dur: 3.2 });
        break;
      case 'rest':
        this.chime(at);
        break;
      case 'start':
        this.gong(at, { freq: 147, dur: 5 });
        break;
      case 'minute':
        this.gong(at, { freq: 196, dur: 4 });
        break;
      case 'end':
        this.gong(at, { freq: 110, dur: 6.5 });
        this.gong(at + 0.55, { freq: 110, dur: 7, gain: 0.85 });
        break;
      case 'tick':
        this.tick(at);
        break;
      default:
        break;
    }
  }

  /** Play a cue immediately — used by the sound previews in the settings. */
  preview(type) {
    this.resume().then((ctx) => {
      if (ctx) this.cue(type, ctx.currentTime + 0.05);
    });
  }

  // -------------------------------------------------------------- ambience

  async loadBuffer(url) {
    if (this.buffers.has(url)) return this.buffers.get(url);
    const ctx = this.ensure();
    if (!ctx) return null;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ambience ${url} -> HTTP ${res.status}`);
    const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
    this.buffers.set(url, buffer);
    return buffer;
  }

  async startAmbience(url, { fade = 2.5 } = {}) {
    const ctx = await this.resume();
    if (!ctx || !url) return;
    if (this.ambience.key === url && this.ambience.source) return;
    this.stopAmbience({ fade: 1 });

    const buffer = await this.loadBuffer(url);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(1, t + fade);
    source.connect(gain).connect(this.ambienceBus);
    source.start(t);
    this.ambience = { source, gain, key: url };
  }

  stopAmbience({ fade = 2.5 } = {}) {
    const { source, gain } = this.ambience;
    this.ambience = { source: null, gain: null, key: null };
    if (!source || !gain || !this.ctx) return;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    try {
      source.stop(t + fade + 0.1);
    } catch {
      /* already stopped */
    }
  }
}

let engine = null;

export function getEngine() {
  if (typeof window === 'undefined') return null;
  if (!engine) engine = new Engine();
  return engine;
}
