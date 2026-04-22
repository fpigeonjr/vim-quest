import Phaser from 'phaser';

type AudioContextLike = AudioContext;

const OVERWORLD_PHRASE_MS = 3200;
const NOTE_STEP = 0.4;

const OVERWORLD_MELODY = [
  { at: 0.0, freq: 392.0, duration: 0.24, volume: 0.04, type: 'triangle' as OscillatorType },
  { at: 0.4, freq: 523.25, duration: 0.22, volume: 0.035, type: 'triangle' as OscillatorType },
  { at: 0.8, freq: 587.33, duration: 0.22, volume: 0.035, type: 'triangle' as OscillatorType },
  { at: 1.2, freq: 523.25, duration: 0.28, volume: 0.035, type: 'triangle' as OscillatorType },
  { at: 1.6, freq: 440.0, duration: 0.22, volume: 0.032, type: 'triangle' as OscillatorType },
  { at: 2.0, freq: 523.25, duration: 0.22, volume: 0.034, type: 'triangle' as OscillatorType },
  { at: 2.4, freq: 659.25, duration: 0.24, volume: 0.036, type: 'triangle' as OscillatorType },
  { at: 2.8, freq: 523.25, duration: 0.3, volume: 0.034, type: 'triangle' as OscillatorType },
];

const OVERWORLD_BASS = [
  { at: 0.0, freq: 196.0, duration: 0.32, volume: 0.018, type: 'sine' as OscillatorType },
  { at: 0.8, freq: 220.0, duration: 0.32, volume: 0.018, type: 'sine' as OscillatorType },
  { at: 1.6, freq: 174.61, duration: 0.32, volume: 0.017, type: 'sine' as OscillatorType },
  { at: 2.4, freq: 196.0, duration: 0.34, volume: 0.018, type: 'sine' as OscillatorType },
];

type Tone = {
  at?: number;
  duration: number;
  freq: number;
  volume: number;
  type: OscillatorType;
};

class VimQuestAudio {
  private context?: AudioContextLike;
  private muted = false;
  private overworldLoopId?: number;
  private currentLoop = '';

  bind(scene: Phaser.Scene) {
    const manager = scene.sound as Phaser.Sound.WebAudioSoundManager & { context?: AudioContextLike };
    this.context = manager.context;
  }

  async resume(scene: Phaser.Scene) {
    this.bind(scene);
    if (!this.context) return;
    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch {
        // ignore resume failures; audio remains disabled
      }
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopMusic();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  startOverworldLoop(scene: Phaser.Scene) {
    this.bind(scene);
    if (!this.context || this.muted) return;
    if (this.currentLoop === 'overworld' && this.overworldLoopId !== undefined) return;

    this.stopMusic();
    this.currentLoop = 'overworld';
    this.scheduleOverworldPhrase();
    this.overworldLoopId = window.setInterval(() => {
      this.scheduleOverworldPhrase();
    }, OVERWORLD_PHRASE_MS);
  }

  stopMusic() {
    if (this.overworldLoopId !== undefined) {
      window.clearInterval(this.overworldLoopId);
      this.overworldLoopId = undefined;
    }
    this.currentLoop = '';
  }

  playSfx(scene: Phaser.Scene, cue: 'unlock' | 'crate' | 'bridge' | 'mode' | 'dialogueOpen' | 'dialogueClose' | 'win') {
    this.bind(scene);
    if (!this.context || this.muted) return;

    const start = this.context.currentTime + 0.01;
    switch (cue) {
      case 'unlock':
        this.playChord(start, [
          { freq: 523.25, duration: 0.08, volume: 0.035, type: 'square' },
          { freq: 659.25, duration: 0.1, volume: 0.03, type: 'square' },
          { freq: 783.99, duration: 0.14, volume: 0.028, type: 'triangle' },
        ]);
        break;
      case 'crate':
        this.playChord(start, [
          { freq: 180, duration: 0.08, volume: 0.04, type: 'sawtooth' },
          { freq: 130, duration: 0.1, volume: 0.032, type: 'square' },
        ]);
        break;
      case 'bridge':
        this.playChord(start, [
          { freq: 392.0, duration: 0.12, volume: 0.035, type: 'triangle' },
          { freq: 493.88, duration: 0.15, volume: 0.03, type: 'triangle', at: 0.08 },
          { freq: 587.33, duration: 0.22, volume: 0.03, type: 'triangle', at: 0.18 },
        ]);
        break;
      case 'mode':
        this.playChord(start, [
          { freq: 329.63, duration: 0.07, volume: 0.024, type: 'square' },
          { freq: 392.0, duration: 0.08, volume: 0.024, type: 'square', at: 0.05 },
        ]);
        break;
      case 'dialogueOpen':
        this.playChord(start, [
          { freq: 261.63, duration: 0.08, volume: 0.022, type: 'triangle' },
          { freq: 329.63, duration: 0.09, volume: 0.02, type: 'triangle', at: 0.05 },
        ]);
        break;
      case 'dialogueClose':
        this.playChord(start, [
          { freq: 329.63, duration: 0.07, volume: 0.02, type: 'triangle' },
          { freq: 261.63, duration: 0.09, volume: 0.02, type: 'triangle', at: 0.05 },
        ]);
        break;
      case 'win':
        this.playChord(start, [
          { freq: 523.25, duration: 0.1, volume: 0.035, type: 'triangle' },
          { freq: 659.25, duration: 0.12, volume: 0.032, type: 'triangle', at: 0.08 },
          { freq: 783.99, duration: 0.16, volume: 0.03, type: 'triangle', at: 0.18 },
          { freq: 1046.5, duration: 0.22, volume: 0.028, type: 'triangle', at: 0.32 },
        ]);
        break;
    }
  }

  private scheduleOverworldPhrase() {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + 0.02;
    OVERWORLD_BASS.forEach((tone) => this.playTone(start + (tone.at ?? 0), tone));
    OVERWORLD_MELODY.forEach((tone) => this.playTone(start + (tone.at ?? 0), tone));
    for (let step = 0; step < 8; step += 1) {
      this.playTone(start + step * NOTE_STEP, {
        freq: step % 2 === 0 ? 784 : 659.25,
        duration: 0.03,
        volume: 0.012,
        type: 'square',
      });
    }
  }

  private playChord(start: number, tones: Tone[]) {
    tones.forEach((tone) => this.playTone(start + (tone.at ?? 0), tone));
  }

  private playTone(start: number, tone: Tone) {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

    oscillator.connect(gain);
    gain.connect(this.context.destination);

    oscillator.start(start);
    oscillator.stop(start + tone.duration + 0.03);
  }
}

export const audioManager = new VimQuestAudio();
