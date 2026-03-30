/**
 * AudioSystem — Web Audio API
 *
 * Manages all in-game sounds without HTML <audio> elements.
 * Sounds are procedurally generated or decoded from URLs.
 *
 * Usage:
 *   AudioSystem.init();
 *   AudioSystem.play('shoot_gun_guy');
 *   AudioSystem.setMusicVolume(0.4);
 */

type SoundId =
  | 'shoot_gun_guy'
  | 'shoot_shotgun'
  | 'shoot_sniper'
  | 'shoot_rpg'
  | 'shoot_minigun'
  | 'shoot_flamer'
  | 'shoot_rifle'
  | 'enemy_death'
  | 'player_hit'
  | 'airstrike_impact'
  | 'rpg_impact'
  | 'chain_lightning'
  | 'gold_collect'
  | 'shield_activate'
  | 'ally_collect'
  | 'wave_start';

interface SoundConfig {
  type: OscillatorType;
  frequency: number;
  frequencyEnd?: number;
  duration: number;
  volume: number;
  attack?: number;
  decay?: number;
}

const SOUND_CONFIGS: Record<SoundId, SoundConfig> = {
  shoot_gun_guy:     { type: 'square',   frequency: 800,  frequencyEnd: 400,  duration: 0.06, volume: 0.12, attack: 0.001, decay: 0.06 },
  shoot_shotgun:     { type: 'sawtooth', frequency: 300,  frequencyEnd: 100,  duration: 0.1,  volume: 0.2,  attack: 0.001, decay: 0.1  },
  shoot_sniper:      { type: 'square',   frequency: 2000, frequencyEnd: 800,  duration: 0.15, volume: 0.15, attack: 0.001, decay: 0.15 },
  shoot_rpg:         { type: 'sawtooth', frequency: 200,  frequencyEnd: 50,   duration: 0.2,  volume: 0.3,  attack: 0.01,  decay: 0.2  },
  shoot_minigun:     { type: 'square',   frequency: 600,  frequencyEnd: 400,  duration: 0.04, volume: 0.08, attack: 0.001, decay: 0.04 },
  shoot_flamer:      { type: 'sawtooth', frequency: 150,  frequencyEnd: 100,  duration: 0.08, volume: 0.1,  attack: 0.005, decay: 0.08 },
  shoot_rifle:       { type: 'square',   frequency: 900,  frequencyEnd: 500,  duration: 0.07, volume: 0.1,  attack: 0.001, decay: 0.07 },
  enemy_death:       { type: 'sawtooth', frequency: 200,  frequencyEnd: 50,   duration: 0.15, volume: 0.15, attack: 0.001, decay: 0.15 },
  player_hit:        { type: 'sine',     frequency: 440,  frequencyEnd: 110,  duration: 0.2,  volume: 0.25, attack: 0.001, decay: 0.2  },
  airstrike_impact:  { type: 'sawtooth', frequency: 80,   frequencyEnd: 20,   duration: 0.4,  volume: 0.4,  attack: 0.005, decay: 0.4  },
  rpg_impact:        { type: 'sawtooth', frequency: 120,  frequencyEnd: 30,   duration: 0.3,  volume: 0.3,  attack: 0.005, decay: 0.3  },
  chain_lightning:   { type: 'square',   frequency: 1600, frequencyEnd: 3200, duration: 0.08, volume: 0.12, attack: 0.001, decay: 0.08 },
  gold_collect:      { type: 'sine',     frequency: 1200, frequencyEnd: 1600, duration: 0.07, volume: 0.08, attack: 0.001, decay: 0.07 },
  shield_activate:   { type: 'sine',     frequency: 800,  frequencyEnd: 1200, duration: 0.2,  volume: 0.15, attack: 0.01,  decay: 0.2  },
  ally_collect:      { type: 'sine',     frequency: 1000, frequencyEnd: 1400, duration: 0.1,  volume: 0.12, attack: 0.001, decay: 0.1  },
  wave_start:        { type: 'sine',     frequency: 440,  frequencyEnd: 880,  duration: 0.3,  volume: 0.2,  attack: 0.01,  decay: 0.3  },
};

class AudioSystemClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private initialized = false;
  private muted = false;

  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.sfxGain    = this.ctx.createGain();
      this.musicGain  = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.masterGain.gain.value = 0.7;
      this.sfxGain.gain.value    = 1.0;
      this.musicGain.gain.value  = 0.3;
      this.initialized = true;
    } catch (e) {
      console.warn('[AudioSystem] Web Audio API not available', e);
    }
  }

  /** Resume context after user interaction (browser autoplay policy). */
  resume(): void {
    this.ctx?.resume();
  }

  play(id: SoundId): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const cfg = SOUND_CONFIGS[id];
    if (!cfg) return;

    try {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now  = this.ctx.currentTime;

      osc.type = cfg.type;
      osc.frequency.setValueAtTime(cfg.frequency, now);
      if (cfg.frequencyEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(cfg.frequencyEnd, now + cfg.duration);
      }

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(cfg.volume, now + (cfg.attack ?? 0.001));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + cfg.duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + cfg.duration + 0.01);
    } catch (_) { /* ignore */ }
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
