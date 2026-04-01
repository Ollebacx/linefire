/**
 * AudioSystem — Web Audio API
 *
 * Zimmer-style procedural audio. Everything lives in D minor (D, F, A).
 * Three layers per sound: sub-bass (chest), body (melody), air (texture/noise).
 * Synthetic convolution reverb adds space. Filter sweeps add tension/release.
 *
 * Auto-initialises on resume() — no manual init() call required.
 */

export type SoundId =
  | 'shoot_gun_guy'
  | 'shoot_shotgun'
  | 'shoot_sniper'
  | 'shoot_rpg'
  | 'shoot_minigun'
  | 'shoot_flamer'
  | 'shoot_rifle'
  | 'enemy_death'
  | 'enemy_hit'
  | 'player_hit'
  | 'airstrike_impact'
  | 'rpg_impact'
  | 'chain_lightning'
  | 'gold_collect'
  | 'shield_activate'
  | 'ally_collect'
  | 'wave_start'
  | 'boss_spawn'
  | 'boss_death'
  | 'combo_milestone';

// ── Note frequency table (Hz, equal temperament, A4 = 440) ────────────────────
// Tonal centre: D minor (D, F, A). Tritones (Gs/Ab) for danger. Sub bass always present.
const N = {
  D1:  36.71, A1:  55.00,
  D2:  73.42, F2:  87.31, A2: 110.00,
  C3: 130.81, D3: 146.83, F3: 174.61, A3: 220.00,
  C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23,
  Gs4: 415.30, A4: 440.00, Bb4: 466.16,
  C5: 523.25, D5: 587.33, F5: 698.46, A5: 880.00,
  Gs5: 830.61, Bb5: 932.33,
  D6: 1174.66,
  // Legacy aliases kept for backwards compat
  E2:  82.41, E3: 164.81, E4: 329.63, E5: 659.25,
  Cs4: 277.18, G3: 196.00, G4: 392.00, G5: 783.99,
  Ab4: 415.30, B4: 493.88, Eb5: 622.25,
  Fs4: 369.99, E6: 1318.51, D4b: 293.66,
} as const;

class AudioSystemClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private initialized = false;
  private muted = false;
  /** 3-second white-noise buffer reused by all noise voices. */
  private noiseBuffer: AudioBuffer | null = null;

  // ── Procedural music engine ─────────────────────────────────────────────
  private ambientAllNodes: AudioNode[] = [];
  private ambientFadeGains: GainNode[] = [];
  private ambientRunning = false;
  private _ambPluckTimer:  ReturnType<typeof setTimeout> | null = null;
  private _ambMelodyTimer: ReturnType<typeof setTimeout> | null = null;
  private _ambMelodyStep = 0;
  // Slow melody voice cycles through these Dm scale degrees (each note held ~10s)
  private readonly AMB_MELODY = [N.D4, N.C4, N.A3, N.F3, N.A3, N.C4] as const;
  private combatScheduler: ReturnType<typeof setInterval> | null = null;
  private combatNext = 0;
  private combatStep = 0;
  private combatBar = 0;
  private combatMelodyStep = 0;
  private combatRunning = false;
  private combatIntensity = 1;           // 1–4, set via setMusicIntensity()
  private _dangerActive = false;
  private _dangerHeartbeat: ReturnType<typeof setInterval> | null = null;
  private _dangerPadNodes: AudioNode[] = [];
  private _dangerPadGain: GainNode | null = null;
  private readonly SIXTEENTH_NOTE = 60 / 120 / 4; // 0.125 s at 120 BPM
  // Dm arpeggio — 16 steps, circular rise-fall-return (Alto's Adventure feel)
  private readonly ARPEGGIO: (number | null)[] = [
    N.D3, N.F3, N.A3, N.C4,   // rise
    N.A3, N.F3, N.D4, N.A3,   // peak
    N.C4, N.A3, N.F3, N.D3,   // descent
    N.F3, N.A3, N.C4, null,   // return + breath
  ];
  // Sparse counter-melody: 4 notes in 16 steps, held long (Alto's style)
  private readonly COUNTER_MELODY: (number | null)[] = [
    N.A4, null, null, null,   N.F4, null, null, null,
    N.D4, null, null, null,   N.A4, null, N.C5, null,
  ];

  // ── Init ─────────────────────────────────────────────────────────────────

  init(): void {
    if (this.initialized) return;
    try {
      this.ctx        = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.sfxGain    = this.ctx.createGain();
      this.musicGain  = this.ctx.createGain();
      this.dryGain    = this.ctx.createGain();
      this.reverbGain = this.ctx.createGain();
      this.convolver  = this.ctx.createConvolver();

      // Signal path: sfxGain → dryGain → masterGain
      //                      → convolver → reverbGain → masterGain
      this.sfxGain.connect(this.dryGain);
      this.sfxGain.connect(this.convolver);
      this.convolver.connect(this.reverbGain);
      this.dryGain.connect(this.masterGain);
      this.reverbGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.masterGain.gain.value = 0.75;
      this.sfxGain.gain.value    = 0.75;
      this.musicGain.gain.value  = 0.75;  // matches DEFAULT_VOLUMES
      this.dryGain.gain.value    = 0.72;
      this.reverbGain.gain.value = 0.28;

      this._buildNoise();
      this._buildReverb();
      this.initialized = true;
    } catch (e) {
      console.warn('[AudioSystem] Web Audio API not available', e);
    }
  }

  private _buildNoise(): void {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * 3);
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  /**
   * Build a synthetic impulse response (IR) for convolution reverb.
   * Exponentially-decaying noise with a pre-delay — Zimmer's "room" feel.
   * ~1.8 s decay, slight stereo shimmer via two channels.
   */
  private _buildReverb(): void {
    if (!this.ctx || !this.convolver) return;
    const sr  = this.ctx.sampleRate;
    const len = Math.floor(sr * 1.8);
    const ir  = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        // Pre-delay of ~12 ms, then exponential decay
        const t = i / sr;
        const predelay = t < 0.012 ? 0 : 1;
        d[i] = predelay * (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
      }
    }
    this.convolver.buffer = ir;
  }

  /** Auto-init + resume suspended context. Call on every first user interaction. */
  resume(): void {
    if (!this.initialized) this.init();
    this.ctx?.resume();
  }

  // ── Core primitives ────────────────────────────────────────────────────────

  /**
   * Schedule an oscillator voice starting at ctx.currentTime + delay (seconds).
   * freq/freqEnd in Hz. dur in seconds. vol 0–1 before sfxGain.
   */
  private _oscAt(
    type: OscillatorType,
    freq: number, freqEnd: number,
    delay: number, dur: number, vol: number,
    attack = 0.003,
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0   = this.ctx.currentTime + delay;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /**
   * Schedule a filtered noise burst starting at ctx.currentTime + delay.
   */
  private _noiseAt(
    filterType: BiquadFilterType,
    freq: number, freqEnd: number, q: number,
    delay: number, dur: number, vol: number,
    attack = 0.002,
  ): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const t0   = this.ctx.currentTime + delay;
    const src  = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type  = filterType;
    filt.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== freq) {
      filt.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    }
    filt.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // Immediate convenience wrappers (delay = 0)
  private _osc(type: OscillatorType, freq: number, freqEnd: number, dur: number, vol: number, attack = 0.002): void {
    this._oscAt(type, freq, freqEnd, 0, dur, vol, attack);
  }
  private _noise(filterType: BiquadFilterType, freq: number, freqEnd: number, q: number, dur: number, vol: number, attack = 0.002): void {
    this._noiseAt(filterType, freq, freqEnd, q, 0, dur, vol, attack);
  }

  // ── Procedural music: ambient drone ────────────────────────────────────────
  // Dark D minor pad — "Interstellar" slow-breathing quality.
  // D1 sub + 3× detuned sawtooth pad through a slowly-sweeping lowpass + A2/F2 reinforcement.

  startAmbient(): void {
    if (this.ambientRunning) return;
    this.resume();               // ensure ctx is alive and running
    if (!this.ctx || !this.musicGain) return;
    this.ambientRunning = true;
    const ctx = this.ctx;
    const out = this.musicGain;
    const now = ctx.currentTime;
    const push = (...ns: AudioNode[]) => this.ambientAllNodes.push(...ns);

    // ── Sub: D1 sine — felt more than heard ──
    const subOsc = ctx.createOscillator();
    const subG   = ctx.createGain();
    subOsc.type = 'sine'; subOsc.frequency.value = N.D1;
    subG.gain.setValueAtTime(0, now); subG.gain.linearRampToValueAtTime(0.028, now + 4.0);
    subOsc.connect(subG); subG.connect(out); subOsc.start();
    push(subOsc, subG); this.ambientFadeGains.push(subG);

    // Sub tremolo: faint pulse at 0.035 Hz
    const subTrem = ctx.createOscillator(); const subTremG = ctx.createGain();
    subTrem.type = 'sine'; subTrem.frequency.value = 0.035; subTremG.gain.value = 0.012;
    subTrem.connect(subTremG); subTremG.connect(subG.gain); subTrem.start();
    push(subTrem, subTremG);

    // ── Pad: D2 × 3 (detuned) + D3 × 2 (octave doubling) through breathing lowpass ──
    const padFilt = ctx.createBiquadFilter();
    padFilt.type = 'lowpass'; padFilt.frequency.value = 290; padFilt.Q.value = 0.65;
    const lfo  = ctx.createOscillator(); const lfoG = ctx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 0.020; lfoG.gain.value = 175;
    lfo.connect(lfoG); lfoG.connect(padFilt.frequency); lfo.start();
    push(lfo, lfoG, padFilt);

    const padOut = ctx.createGain();
    padOut.gain.setValueAtTime(0, now); padOut.gain.linearRampToValueAtTime(0.45, now + 6.0);
    padFilt.connect(padOut); padOut.connect(out);
    push(padOut); this.ambientFadeGains.push(padOut);

    // Tremolo LFO on pad master
    const trem = ctx.createOscillator(); const tremG = ctx.createGain();
    trem.type = 'sine'; trem.frequency.value = 0.017; tremG.gain.value = 0.15;
    trem.connect(tremG); tremG.connect(padOut.gain); trem.start(); push(trem, tremG);

    for (const [freq, det, vol] of [
      [N.D2, -8, 0.075], [N.D2, 0, 0.065], [N.D2, 8, 0.075],  // D2 core
      [N.D3, -5, 0.038], [N.D3, 5, 0.038],                    // D3 octave doubling
    ] as [number, number, number][]) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
      g.gain.value = vol; o.connect(g); g.connect(padFilt); o.start(); push(o, g);
    }

    // ── Chord reinforcement: A2 + F2 + D3 — full Dm voiced below pad ──
    for (const [freq, vol, fi] of [
      [N.A2, 0.015, 7.5], [N.F2, 0.010, 10.0], [N.D3, 0.006, 13.0],
    ] as [number, number, number][]) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(vol, now + fi);
      o.connect(g); g.connect(out); o.start(); push(o, g); this.ambientFadeGains.push(g);
    }

    // ── High shimmer: D5 detuned pair + A5 — airy top end ──
    for (const [freq, det, fi] of [
      [N.D5, -5, 12.0], [N.D5, 5, 12.0], [N.A5, 0, 16.0],
    ] as [number, number, number][]) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq; o.detune.value = det;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.005, now + fi);
      o.connect(g); g.connect(out); o.start(); push(o, g); this.ambientFadeGains.push(g);
    }

    // ── Sparse pluck scheduler ──
    this._ambMelodyStep = 0;
    this._schedAmbPlucks();
    this._schedAmbMelody();
  }

  /** Sparse pizzicato pluck: random Dm chord tone every 6–14 s */
  private _schedAmbPlucks(): void {
    if (!this.ambientRunning || !this.ctx || !this.musicGain) return;
    const ctx = this.ctx; const out = this.musicGain;
    const tones = [N.D3, N.A3, N.F3, N.D4, N.C4, N.A3];
    const freq  = tones[Math.floor(Math.random() * tones.length)];
    const now   = ctx.currentTime;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.030, now + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    osc.connect(g); g.connect(out); osc.start(now); osc.stop(now + 0.90);
    this._ambPluckTimer = setTimeout(() => this._schedAmbPlucks(), 6000 + Math.random() * 8000);
  }

  /** Slow evolving melody voice — one note every ~10 s, overlapping crossfade */
  private _schedAmbMelody(): void {
    if (!this.ambientRunning || !this.ctx || !this.musicGain) return;
    const ctx = this.ctx; const out = this.musicGain;
    const freq = this.AMB_MELODY[this._ambMelodyStep % this.AMB_MELODY.length];
    this._ambMelodyStep++;
    const now = ctx.currentTime;
    const dur = 9 + Math.random() * 4;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.024, now + 2.8);
    g.gain.setValueAtTime(0.024, now + dur - 2.5);
    g.gain.linearRampToValueAtTime(0, now + dur);
    osc.connect(g); g.connect(out); osc.start(now); osc.stop(now + dur + 0.1);
    this._ambMelodyTimer = setTimeout(() => this._schedAmbMelody(), (dur - 2.5) * 1000);
  }

  stopAmbient(fadeTime = 2.2): void {
    if (!this.ctx || !this.ambientRunning) return;
    this.ambientRunning = false;
    if (this._ambPluckTimer)  { clearTimeout(this._ambPluckTimer);  this._ambPluckTimer  = null; }
    if (this._ambMelodyTimer) { clearTimeout(this._ambMelodyTimer); this._ambMelodyTimer = null; }
    const t = this.ctx.currentTime;
    for (const g of this.ambientFadeGains) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + fadeTime);
    }
    const nodes = this.ambientAllNodes;
    this.ambientAllNodes = [];
    this.ambientFadeGains = [];
    setTimeout(() => {
      for (const n of nodes) {
        try { (n as OscillatorNode).stop?.(); } catch {}
        try { n.disconnect(); } catch {}
      }
    }, (fadeTime + 0.3) * 1000);
  }

  // ── Procedural music: combat arpeggio + layers ──────────────────────────────
  // Alto's Adventure style: flowing 16th-note Dm arpeggio at 120 BPM.
  // Intensity 1: arpeggio + soft kick. 2: + hi-hat + ping. 3: + melody. 4: + shimmer.
  // Chord swell every 4 bars cycles Dm → C → Bb → F (natural minor).

  startCombat(): void {
    if (this.combatRunning) return;
    this.resume();               // ensure ctx is alive and running
    if (!this.ctx) return;
    this.combatRunning = true;
    this.combatNext = this.ctx.currentTime + 0.12;
    this.combatStep = 0;
    this.combatBar  = 0;
    const tick = () => {
      if (!this.ctx || !this.combatRunning) return;
      while (this.combatNext < this.ctx.currentTime + 0.22) {
        this._combatNote(this.combatNext);
        this.combatNext += this.SIXTEENTH_NOTE;
        this.combatStep = (this.combatStep + 1) % 16;
        if (this.combatStep === 0) {
          this.combatBar++;
          if (this.combatBar % 4 === 0) this._combatChordSwell(this.combatNext);
        }
      }
    };
    this.combatScheduler = setInterval(tick, 25);
  }

  private _combatNote(t: number): void {
    if (!this.ctx || !this.musicGain) return;
    const ctx  = this.ctx;
    const out  = this.musicGain;
    const step = this.combatStep;
    const arp  = this.ARPEGGIO[step];
    const iv   = this.combatIntensity;

    // ── Arpeggio: flowing Dm circle (intensity ≥ 1) ─────────────────────────
    if (arp !== null && iv >= 1) {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = arp;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.010);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + 0.30);
      // Upper octave shimmer at max intensity
      if (iv >= 4) {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.type = 'sine'; o2.frequency.value = arp * 2;
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(0.050, t + 0.010);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o2.connect(g2); g2.connect(out); o2.start(t); o2.stop(t + 0.18);
      }
    }

    // ── Soft kick: beats 1 and 3 (steps 0, 8) ──────────────────────────────
    if ((step === 0 || step === 8) && iv >= 1) {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(N.D2, t);
      osc.frequency.exponentialRampToValueAtTime(N.D1, t + 0.18);
      g.gain.setValueAtTime(0.20, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + 0.24);
    }

    // ── Soft hi-hat: quarter notes at intensity ≥ 2 ────────────────────────
    if (step % 4 === 0 && iv >= 2 && this.noiseBuffer) {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuffer;
      const filt = ctx.createBiquadFilter(); filt.type = 'bandpass';
      filt.frequency.value = 7800; filt.Q.value = 4.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.022, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      src.connect(filt); filt.connect(g); g.connect(out);
      src.start(t); src.stop(t + 0.08);
    }

    // ── Marimba ping: beats 2 and 4 (steps 4, 12) ─────────────────────────
    if ((step === 4 || step === 12) && iv >= 2) {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = N.A3;
      g.gain.setValueAtTime(0.070, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + 0.34);
    }

    // ── Counter-melody: intensity ≥ 3, from bar 2 ─────────────────────────
    if (this.combatBar >= 2) {
      const melHz = this.COUNTER_MELODY[this.combatMelodyStep % 16];
      if (melHz !== null && iv >= 3) {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = melHz;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.090, t + 0.050);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.60);
        osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + 0.62);
      }
      this.combatMelodyStep++;
    }
  }

  private _combatChordSwell(t: number): void {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx; const out = this.musicGain;
    // Cinematic natural-minor descending: Dm → C → Bb → F  (i → VII → VI → III)
    // This is the Alto's Adventure / Jon Hopkins / post-rock progression
    const cycle: number[][] = [
      [N.D3, N.F3, N.A3],           // Dm  (i)
      [N.C3, N.E3, N.G3],           // C   (VII)
      [116.54, N.D3, N.F3],         // Bb  (VI — Bb2 ≈ 116.54 Hz)
      [N.F3,  N.A3, N.C4],          // F   (III)
    ];
    const chord = cycle[Math.floor(this.combatBar / 4) % cycle.length];

    // Sawtooth voices through a filter that cracks open on the attack (dramatic)
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.Q.value = 0.7;
    filt.frequency.setValueAtTime(180, t);
    filt.frequency.exponentialRampToValueAtTime(1400, t + 0.10);
    filt.frequency.exponentialRampToValueAtTime(420, t + 1.60);

    const chordOut = ctx.createGain();
    chordOut.gain.setValueAtTime(0, t);
    chordOut.gain.linearRampToValueAtTime(0.90, t + 0.06);
    chordOut.gain.exponentialRampToValueAtTime(0.0001, t + 1.70);
    filt.connect(chordOut); chordOut.connect(out);

    for (const freq of chord) {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      g.gain.value = 0.038;
      osc.connect(g); g.connect(filt); osc.start(t); osc.stop(t + 1.75);
    }

    // Sub thump under the swell
    const sub = ctx.createOscillator(); const subG = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(N.D2, t);
    sub.frequency.exponentialRampToValueAtTime(N.D1, t + 0.35);
    subG.gain.setValueAtTime(0.10, t); subG.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    sub.connect(subG); subG.connect(out); sub.start(t); sub.stop(t + 0.50);
  }

  stopCombat(): void {
    if (this.combatScheduler) { clearInterval(this.combatScheduler); this.combatScheduler = null; }
    this.combatRunning     = false;
    this.combatStep        = 0;
    this.combatBar         = 0;
    this.combatMelodyStep  = 0;
    this.setDangerMode(false);
  }

  pauseCombat():  void { this.stopCombat(); }
  resumeCombat(): void { if (!this.combatRunning) this.startCombat(); }

  /**
   * Danger mode: activated when player HP drops below 25 %.
   * Adds a heartbeat pulse (D1 lub-dub at 75 BPM) + a dissonant Gs4 tremolo pad
   * that creates tension without stopping the arpeggio.
   */
  setDangerMode(on: boolean): void {
    if (!this.ctx || !this.initialized) return;
    if (on === this._dangerActive) return;
    this._dangerActive = on;

    if (on) {
      this.ctx.resume();
      // ── Heartbeat loop: lub-dub at ~75 BPM ─────────────────────────────
      const heartbeat = () => {
        if (!this._dangerActive || !this.ctx) return;
        this._oscAt('sine', N.D1, N.D1 * 0.5,  0,    0.14, 0.042); // lub
        this._oscAt('sine', N.D1, N.D1 * 0.5,  0.19, 0.10, 0.024); // dub
      };
      heartbeat();
      this._dangerHeartbeat = setInterval(heartbeat, 800);

      // ── Dissonant tritone pad: Gs4 (augmented 4th from D = max tension) ─
      const ctx = this.ctx;
      const out = this.musicGain!;
      const now = ctx.currentTime;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 5.5;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.007;

      const pad = ctx.createOscillator();
      pad.type = 'sine'; pad.frequency.value = N.Gs4;
      const padGain = ctx.createGain();
      padGain.gain.setValueAtTime(0, now);
      padGain.gain.linearRampToValueAtTime(0.018, now + 2.0);

      lfo.connect(lfoGain);
      lfoGain.connect(padGain.gain);
      pad.connect(padGain);
      padGain.connect(out);
      lfo.start(now); pad.start(now);

      this._dangerPadNodes = [lfo, lfoGain, pad, padGain];
      this._dangerPadGain  = padGain;

    } else {
      // ── Stop heartbeat ────────────────────────────────────────────────────
      if (this._dangerHeartbeat) {
        clearInterval(this._dangerHeartbeat);
        this._dangerHeartbeat = null;
      }
      // ── Fade out danger pad ───────────────────────────────────────────────
      if (this._dangerPadGain && this.ctx) {
        const now = this.ctx.currentTime;
        this._dangerPadGain.gain.cancelScheduledValues(now);
        this._dangerPadGain.gain.setValueAtTime(this._dangerPadGain.gain.value, now);
        this._dangerPadGain.gain.linearRampToValueAtTime(0, now + 1.0);
      }
      const nodes = this._dangerPadNodes;
      this._dangerPadNodes = [];
      this._dangerPadGain  = null;
      setTimeout(() => {
        for (const n of nodes) {
          try { (n as OscillatorNode).stop?.(); } catch { /**/ }
          try { n.disconnect(); } catch { /**/ }
        }
      }, 1100);
    }
  }

  /**
   * Set music intensity (1–4). Called from App.tsx when wave progresses.
   * 1 = waves 1-2: arpeggio + kick only (calm, like early Alto's)
   * 2 = waves 3-5: + hi-hat + marimba ping
   * 3 = waves 6-9: + counter-melody emerges
   * 4 = waves 10+: + upper octave shimmer on every arpeggio note
   */
  setMusicIntensity(level: number): void {
    this.combatIntensity = Math.max(1, Math.min(4, Math.round(level)));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  play(id: SoundId): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    // ±5% pitch variation on shoot sounds so repeated shots feel alive
    const r = 0.95 + Math.random() * 0.10;

    switch (id) {

      // ── Shoot sounds ──────────────────────────────────────────────────────
      // Zimmer rule: every gun has a sub-bass attack (D1/A1) beneath the crack.
      // The sub gives weight; the noise gives character; a pitched body gives identity.

      case 'shoot_gun_guy':
        // Body: D4 → D3 — staccato piston crack (D is our tonal root)
        this._osc('square',    N.D4 * r,  N.D3,         0.06, 0.11);
        // Sub punch: D1 thump (felt, not heard)
        this._osc('sine',      N.D1 * r,  N.D1 * 0.5,   0.04, 0.28, 0.018);
        // Air: tight bandpass snap
        this._noise('bandpass', 3600,  800, 3,            0.05, 0.08);
        break;

      case 'shoot_shotgun':
        // Body: A2 → A1 (deep octave boom anchored to A — Dm's 5th)
        this._osc('sawtooth',  N.A2 * r,  N.A1,         0.12, 0.19);
        // Sub: D1 swell
        this._oscAt('sine',      N.D1,      N.D1 * 0.4,   0, 0.38, 0.022, 0.004);
        // Rumble
        this._noise('lowpass',   900,  110, 0.8,          0.11, 0.26, 0.002);
        break;

      case 'shoot_sniper':
        // Body: D6 → A4 — extreme register descent (2 octaves + 5th)
        this._osc('square',    N.D6 * r,  N.A4,         0.11, 0.13);
        // Sub: D1 stab — the sniper crack shakes the floor
        this._oscAt('sine',      N.D1 * r,  N.D1 * 0.5,   0, 0.22, 0.020, 0.001);
        // Air: razor-sharp transient
        this._noise('bandpass', 8000, 2000, 7,            0.07, 0.09);
        break;

      case 'shoot_rpg':
        // Body: A2 → A1 heavy launch + F2 (the minor 3rd, Dm colour)
        this._osc('sawtooth',  N.A2 * r,  N.A1,         0.22, 0.23);
        this._oscAt('sine',      N.F2 * r,  N.D1,         0, 0.32, 0.12, 0.006);
        // Sub: D1 whoosh
        this._oscAt('sine',      N.D1,      8,             0, 0.42, 0.028, 0.008);
        this._noise('lowpass',   620,   55, 0.7,          0.24, 0.34, 0.004);
        break;

      case 'shoot_minigun':
        // Body: A4 → D4 rapid pop (A is the 5th of Dm — punchy interval)
        this._osc('square',    N.A4 * r,  N.D4,         0.035, 0.08);
        // Micro sub: very short thump
        this._oscAt('sine',      N.D2 * r,  N.D1,         0, 0.08, 0.014, 0.001);
        this._noise('bandpass', 2600, 900, 4,             0.025, 0.06);
        break;

      case 'shoot_flamer':
        // Pure noise: hissing rush with a slight D2 undertone (drone feel)
        this._osc('sine',      N.D2,      N.D2,         0.09, 0.06, 0.008);
        this._noise('bandpass',  340,  160, 0.5,          0.09, 0.10, 0.003);
        this._noise('highpass', 3000,  700, 1.2,          0.06, 0.06);
        break;

      case 'shoot_rifle':
        // Body: F5 → D4 (F is the minor 3rd of Dm — mid-range crack)
        this._osc('square',    N.F5 * r,  N.D4,         0.08, 0.11);
        // Sub: D1 pop
        this._oscAt('sine',      N.D1 * r,  N.D1 * 0.5,   0, 0.18, 0.016, 0.002);
        this._noise('bandpass', 4000, 1200, 3.5,          0.06, 0.08);
        break;

      // ── Hit / death ────────────────────────────────────────────────────────
      // Zimmer: deaths are NOT just clicks. They're small stories — a note rises,
      // a filter opens, then everything collapses. Sub-bass holds the moment.

      case 'enemy_hit':
        // Dm 5th: A4 → D4 — sharp metallic tick, sub micro-punch
        this._osc('square',    N.A4 * r,  N.D4,         0.025, 0.06);
        this._oscAt('sine',      N.D2,      N.D1,         0, 0.06, 0.010, 0.001);
        this._noise('bandpass', 2000,  600, 2.5,          0.020, 0.05);
        break;

      case 'enemy_death': {
        // D4 → D2: crunchy octave collapse with a filter sweep opening on the noise
        // (filter starts closed at 200 Hz and opens to 900 Hz — tension/release)
        this._osc('sawtooth',  N.D4,      N.D2,         0.18, 0.16, 0.002);
        this._oscAt('sine',      N.D1,      8,             0, 0.32, 0.018, 0.004); // sub tail
        this._noise('lowpass',   200,  900, 1.0,          0.15, 0.19, 0.002);  // filter sweeps open
        break;
      }

      case 'player_hit':
        // Zimmer danger: Dm tritone = D4 + Gs4 (augmented 4th — max tension in Dm)
        // Then a low filter sweep closes → dread
        this._osc('sine',      N.D4,      N.D4 * 0.5,   0.26, 0.19, 0.003);
        this._osc('sine',      N.Gs4,     N.Gs4 * 0.5,  0.20, 0.13, 0.003);
        // Sub rumble — the hit shakes the world
        this._oscAt('sine',      N.D1,      N.D1 * 0.5,   0, 0.44, 0.030, 0.005);
        this._noise('lowpass',  1200,   60, 1.5,          0.22, 0.28, 0.003);
        break;

      // ── Explosions ─────────────────────────────────────────────────────────
      // The sub-bass IS the explosion. Everything else is detail.

      case 'airstrike_impact': {
        // Three-layer sub: D1 + A1 + D2 = Dm power chord at sub frequency
        this._osc('sine',      N.D1,      12,            0.70, 0.42, 0.006);
        this._osc('sine',      N.A1,      16,            0.50, 0.32, 0.004);
        this._osc('sawtooth',  N.D2,      18,            0.40, 0.26, 0.003);
        // Body: chaotic sawtooth shred
        this._osc('sawtooth',  N.D3,      N.D1,          0.28, 0.22, 0.004);
        // Filter sweep: opens wide from 80 Hz, simulating pressure wave
        this._noise('lowpass',    80,  620, 0.6,          0.60, 0.52, 0.002);
        break;
      }

      case 'rpg_impact':
        // Shorter airstrike — Dm 5th (D2 + A1) + noise
        this._osc('sine',      N.D2,      14,            0.36, 0.32, 0.005);
        this._osc('sine',      N.A1,      16,            0.26, 0.24, 0.004);
        // Noise filter sweep: 100 → 800 Hz (impact pressure)
        this._noise('lowpass',   100,  800, 0.8,          0.32, 0.38, 0.003);
        break;

      // ── Chain lightning ────────────────────────────────────────────────────
      // Dm tritone stab: D5 + Gs5 — electric, unstable, dangerous

      case 'chain_lightning':
        this._osc('square',    N.D5,      N.D5,          0.08, 0.12);
        this._osc('square',    N.Gs5,     N.D5,          0.06, 0.09); // tritone
        // Sub snap — lightning hits the ground
        this._oscAt('sine',      N.D2,      N.D1,          0, 0.12, 0.012, 0.001);
        this._noise('bandpass', 8500,  3000, 8,           0.06, 0.07);
        break;

      // ── Pickups ────────────────────────────────────────────────────────────
      // Zimmer pickups: not generic "dings". They resolve tension.
      // Gold = Dm → F major lift (brightness from the minor 3rd going up).
      // Ally = warm Dm chord sustained.

      case 'gold_collect':
        // D minor → F major resolution arpeggio: D5 → F5 → A5 (Dm chord, bright)
        this._oscAt('sine', N.D5, N.D5, 0.000, 0.13, 0.10, 0.004);
        this._oscAt('sine', N.F5, N.F5, 0.065, 0.11, 0.08, 0.004);
        this._oscAt('sine', N.A5, N.A5, 0.130, 0.09, 0.07, 0.004);
        // Sub warmth: D2 under the chord
        this._oscAt('sine', N.D2, N.D2, 0.000, 0.22, 0.06, 0.010);
        break;

      case 'ally_collect':
        // Dm chord sustained: D4 + F4 + A4 — full, warm, human
        this._oscAt('sine', N.D4, N.D4, 0.000, 0.22, 0.11, 0.006);
        this._oscAt('sine', N.F4, N.F4, 0.000, 0.20, 0.09, 0.006);
        this._oscAt('sine', N.A4, N.A4, 0.040, 0.18, 0.08, 0.006);
        // Sub D2 anchor
        this._oscAt('sine', N.D2, N.D2, 0.000, 0.28, 0.07, 0.010);
        break;

      case 'shield_activate':
        // Dm power chord arpeggiated up with a rising filter noise swell
        // D3 → A3 → D4 → F4 — the shield closes around you
        this._oscAt('sine', N.D3, N.D3, 0.00, 0.30, 0.12, 0.010);
        this._oscAt('sine', N.A3, N.A3, 0.07, 0.26, 0.11, 0.010);
        this._oscAt('sine', N.D4, N.D4, 0.14, 0.22, 0.10, 0.010);
        this._oscAt('sine', N.F4, N.F4, 0.21, 0.18, 0.08, 0.010);
        // Sub shimmer: D1 low glow
        this._oscAt('sine', N.D1, N.D1, 0.00, 0.38, 0.06, 0.020);
        // Noise: filter sweeps open (200 → 4000) — shield materialising
        this._noise('bandpass', 200, 4000, 4, 0.26, 0.08, 0.008);
        break;

      // ── Wave / progression ─────────────────────────────────────────────────
      // Zimmer wave_start: it's not a fanfare — it's a warning.
      // Dm power chord with a deep sub hit that lingers.

      case 'wave_start':
        // Dm chord: D3 + F3 + A3 — dark, resolute, war-movie
        this._oscAt('sawtooth', N.D3,  N.D3,  0.000, 0.60, 0.14, 0.018);
        this._oscAt('sawtooth', N.F3,  N.F3,  0.000, 0.54, 0.10, 0.018);
        this._oscAt('sawtooth', N.A3,  N.A3,  0.060, 0.46, 0.08, 0.015);
        // Sub D1 swell — the wave announcement you feel before you hear it
        this._oscAt('sine',     N.D1,  N.D1,  0.000, 0.80, 0.032, 0.030);
        // Noise: low bandpass to add air
        this._noiseAt('bandpass', 280, 160, 1.0, 0.000, 0.52, 0.05, 0.010);
        break;

      // ── Boss ───────────────────────────────────────────────────────────────
      // Zimmer boss_spawn: the Inception BRAAM.
      // D1 + A1 + D2 bass drone (Dm sub-chord) + tritone stabs (D+Gs).
      // Boss death: chromatic descent D4 → D3 with sub collapse.

      case 'boss_spawn': {
        // Bass drone: Dm root position at sub freq (D1+A1+D2)
        this._oscAt('sawtooth', N.D1,  N.D1,  0.000, 1.40, 0.40, 0.10);
        this._oscAt('sawtooth', N.A1,  N.A1,  0.000, 1.25, 0.30, 0.10);
        this._oscAt('sawtooth', N.D2,  N.D2,  0.000, 1.10, 0.22, 0.08);
        // BRAAM stabs: D3+Gs4 tritone (max Dm dissonance)
        this._oscAt('square',   N.D3,  N.D3,  0.060, 0.45, 0.18, 0.005);
        this._oscAt('square',   N.Gs4, N.Gs4, 0.060, 0.38, 0.14, 0.005);
        // Second BRAAM stab — delayed, higher
        this._oscAt('square',   N.D4,  N.D4,  0.220, 0.36, 0.14, 0.005);
        this._oscAt('square',   N.Gs5, N.Gs5, 0.220, 0.28, 0.10, 0.005);
        // Sub noise rumble: filter opens slowly (pressure builds)
        this._noiseAt('lowpass', 80, 380, 1.2, 0.000, 1.20, 0.38, 0.06);
        break;
      }

      case 'boss_death': {
        // Chromatic descent from D4 to D3 (12 semitones) — inevitable collapse
        // Then sub D1 falls to silence. The world goes quiet.
        const startHz = N.D4;   // 293.66
        const semitone = Math.pow(2, 1/12);
        const steps = 13;       // D4 → Db4 → C4 → B3 → Bb3 → A3 → Ab3 → G3 → F#3 → F3 → E3 → Eb3 → D3
        for (let i = 0; i < steps; i++) {
          const freq = startHz / Math.pow(semitone, i);
          const isLast = i === steps - 1;
          this._oscAt(
            'sawtooth',
            freq, freq * (isLast ? 0.25 : 0.91),
            i * 0.12,
            isLast ? 0.32 : 0.16,
            0.20 - i * 0.010,
            0.003,
          );
        }
        // Sub: D1 long fall to silence — the world empties
        this._oscAt('sine', N.D1, 6,   0.000, 1.80, 0.44, 0.012);
        // Noise: filter closes (3000 → 40 Hz) — everything goes dark
        this._noiseAt('lowpass', 3000, 40, 1.0, 0.000, 1.60, 0.52, 0.008);
        break;
      }

      case 'combo_milestone': {
        // Dm arpeggio ascending with doubled sub: D4 → F4 → A4 → D5
        // Sub D2 pulse beneath each note — the scale rising = power building
        const arp: [number, number][] = [
          [N.D4, N.D2], [N.F4, N.F2], [N.A4, N.A2], [N.D5, N.D3],
        ];
        arp.forEach(([freq, sub], i) => {
          const t = i * 0.070;
          this._oscAt('sine', freq, freq, t, 0.22 - i * 0.02, 0.17 - i * 0.02, 0.005);
          this._oscAt('sine', sub,  sub,  t, 0.16 - i * 0.02, 0.07, 0.008);
        });
        // Noise shimmer at the peak
        this._noiseAt('bandpass', 3000, 5500, 9, 0.21, 0.14, 0.06, 0.002);
        break;
      }
    }
  }

  setMasterVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  setMusicVolume(v: number): void {
    if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(1, v));
  }

  setSfxVolume(v: number): void {
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, v));
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : 0.7;
    return this.muted;
  }
}

export const AudioSystem = new AudioSystemClass();
