'use client';

import { findGong } from './gongs.js';

/**
 * Audio engine built directly on the Web Audio API.
 *
 * Every cue of a run is scheduled up-front against `ctx.currentTime`, which is
 * the same clock the UI reads, so sound and progress bar cannot drift apart.
 * Gongs are either sampled (a real strike, preloaded before the run starts) or
 * synthesised on the spot; the short rest "cliquetis" is always synthesised
 * because a sampled gong would still be ringing when the next interval opens.
 */

// Classic Risset bell partials: inharmonic ratios give the metallic gong tail.
const RISSET_BELL = {
  ratios: [0.56, 0.56, 0.92, 0.92, 1.19, 1.7, 2, 2.74, 3, 3.76, 4.07],
  detune: [0, 1, 0, 1.7, 0, 0, 0, 0, 0, 0, 0],
  amps: [1, 0.67, 1, 1.8, 2.67, 1.67, 1.46, 1.33, 1.33, 0.75, 1.33],
  decays: [1, 0.9, 0.65, 0.55, 0.325, 0.35, 0.25, 0.2, 0.15, 0.1, 0.075],
};

const RELEASE = 0.06; // short fade when a ringing cue is cut off by a pause

class Engine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.cueBus = null;
    this.ambienceBus = null;
    this.noise = null;
    this.scheduled = [];
    this.buffers = new Map();

    // Ambience state. `key` covers both "playing" and "still decoding", and
    // `token` invalidates a load that a newer pick has superseded.
    this.ambienceNodes = [];
    this.ambienceKey = null;
    this.ambienceToken = 0;

    this.muted = false;
    this.cueVolume = 0.9;
    this.ambienceVolume = 0.6;
    this.gongId = 'gong-1';
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

  setGong(id) {
    this.gongId = id;
  }

  /** Resume the context and make sure the selected gong sample is decoded. */
  async prepare() {
    const ctx = await this.resume();
    if (!ctx) return null;
    const { url } = findGong(this.gongId);
    if (url) {
      try {
        await this.loadBuffer(url);
      } catch {
        /* sample missing — cue() falls back to the synthesised bell */
      }
    }
    return ctx;
  }

  track(node, gain) {
    const entry = { node, gain };
    this.scheduled.push(entry);
    node.onended = () => {
      this.scheduled = this.scheduled.filter((e) => e !== entry);
    };
  }

  /** Kill every pending cue, releasing whatever is ringing without a click. */
  cancelCues() {
    const t = this.ctx ? this.ctx.currentTime : 0;
    this.scheduled.forEach(({ node, gain }) => {
      try {
        node.onended = null;
        if (gain) {
          gain.gain.cancelScheduledValues(t);
          gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + RELEASE);
          node.stop(t + RELEASE + 0.01);
        } else {
          node.stop();
        }
      } catch {
        /* already stopped, or stop() before start() */
      }
    });
    this.scheduled = [];
  }

  // ------------------------------------------------------------------ cues

  /** Play a decoded sample. Returns false when the buffer is not ready. */
  sample(url, at, { gain = 1, rate = 1 } = {}) {
    const buffer = this.buffers.get(url);
    if (!buffer || !this.ctx) return false;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const out = this.ctx.createGain();
    out.gain.value = gain;
    source.connect(out).connect(this.cueBus);
    source.start(at);
    this.track(source, out);
    return true;
  }

  synthGong(at, { freq = 174, dur = 4.2, gain = 1 } = {}) {
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
      this.track(osc, out);
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
    this.track(strike, strikeEnv);
  }

  /**
   * A gong, sampled when the selected voice has a file ready, synthesised
   * otherwise. `rate` below 1 deepens the strike — used for the final gong.
   */
  gong(at, { gain = 1, rate = 1, freq = 174, dur = 4.2 } = {}) {
    const { url } = findGong(this.gongId);
    if (url && this.sample(url, at, { gain, rate })) return;
    this.synthGong(at, { freq: freq * rate, dur, gain });
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
      this.track(osc, out);
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
    this.track(osc, env);
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
        this.gong(at, { gain: 0.85, freq: 196, dur: 4 });
        break;
      case 'end':
        // Same strike, pitched down: unmistakably the end of the session.
        this.gong(at, { rate: 0.82, freq: 110, dur: 6.5 });
        if (!findGong(this.gongId).url) this.synthGong(at + 0.55, { freq: 110, dur: 7, gain: 0.85 });
        break;
      case 'tick':
        this.tick(at);
        break;
      default:
        break;
    }
  }

  /** Play a cue immediately — used by the sound previews in the settings. */
  async preview(type) {
    const ctx = await this.prepare();
    if (ctx) this.cue(type, ctx.currentTime + 0.05);
  }

  // -------------------------------------------------------------- ambience

  async loadBuffer(url) {
    if (this.buffers.has(url)) return this.buffers.get(url);
    const ctx = this.ensure();
    if (!ctx) return null;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Audio ${url} -> HTTP ${res.status}`);
    const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
    this.buffers.set(url, buffer);
    return buffer;
  }

  /** Fade out and detach every ambience node currently attached. */
  releaseAmbienceNodes(fade) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.ambienceNodes.forEach(({ source, gain }) => {
      try {
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        source.stop(t + fade + 0.1);
      } catch {
        /* already stopped */
      }
    });
    this.ambienceNodes = [];
  }

  /**
   * Start a soundscape, replacing whatever is playing.
   *
   * Decoding is async, so two quick picks would otherwise both reach the
   * "create a source" step and play on top of each other: the token check
   * drops any load a newer pick has superseded, and every live node is kept in
   * `ambienceNodes` so it can always be found and faded out.
   */
  async startAmbience(url, { fade = 2.5 } = {}) {
    if (!url) {
      this.stopAmbience({ fade });
      return;
    }
    // Claim the slot synchronously, before the first await: a stop() landing
    // while this call is suspended must be able to invalidate it.
    if (this.ambienceKey === url) return; // already playing, or already loading
    this.ambienceKey = url;
    const token = this.ambienceToken + 1;
    this.ambienceToken = token;
    this.releaseAmbienceNodes(1);

    const ctx = await this.resume();
    if (!ctx || this.ambienceToken !== token) return;

    let buffer;
    try {
      buffer = await this.loadBuffer(url);
    } catch {
      if (this.ambienceToken === token) this.ambienceKey = null;
      return;
    }
    if (this.ambienceToken !== token || !buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(1, t + fade);
    source.connect(gain).connect(this.ambienceBus);
    source.start(t);

    const entry = { source, gain };
    this.ambienceNodes.push(entry);
    source.onended = () => {
      this.ambienceNodes = this.ambienceNodes.filter((e) => e !== entry);
    };
  }

  stopAmbience({ fade = 2.5 } = {}) {
    this.ambienceKey = null;
    this.ambienceToken += 1; // invalidates any load still in flight
    this.releaseAmbienceNodes(fade);
  }
}

let engine = null;

export function getEngine() {
  if (typeof window === 'undefined') return null;
  if (!engine) engine = new Engine();
  return engine;
}
