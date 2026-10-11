import { Howl, Howler } from "howler";

let soundEnabled = true;
let gameAudioContext: AudioContext | null = null;
let footstepNoiseBuffer: AudioBuffer | null = null;

const uiChime = new Howl({
  src: ["/shafak-ui-chime.wav"],
  volume: 0.2,
  preload: true,
});

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  Howler.mute(!enabled);
}

export function playUiChime() {
  if (soundEnabled) uiChime.play();
}

type GameCue = "victory" | "defeat";
type WorldCue = "gold" | "crystal" | "seal" | "attack" | "battle";
type FootstepOptions = { running: boolean; surface: "stone" | "dirt"; enabled: boolean };

const cueNotes: Record<GameCue, number[]> = {
  victory: [392, 494, 587, 784],
  defeat: [294, 247, 196],
};

export function playGameSound(cue: GameCue) {
  if (!soundEnabled || typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;

  try {
    gameAudioContext ??= new AudioContextClass();
    const context = gameAudioContext;
    if (context.state === "suspended") void context.resume();
    const notes = cueNotes[cue];
    const spacing = 0.085;
    const duration = 0.2;

    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * spacing;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = cue === "defeat" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.055, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  } catch {
    // Audio is optional; an unsupported or blocked context must not stop a turn.
  }
}

const worldCueNotes: Record<WorldCue, number[]> = {
  gold: [660, 880],
  crystal: [523, 784, 1047],
  seal: [440, 659, 880, 1175],
  attack: [150, 98],
  battle: [196, 294, 392],
};

export function playWorldCue(cue: WorldCue) {
  if (!soundEnabled || typeof window === "undefined" || !window.AudioContext) return;
  try {
    gameAudioContext ??= new window.AudioContext();
    const context = gameAudioContext;
    if (context.state === "suspended") void context.resume();
    const notes = worldCueNotes[cue];
    const spacing = cue === "attack" ? 0.035 : 0.055;
    const duration = cue === "attack" ? 0.11 : 0.16;
    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * spacing;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = cue === "attack" ? "triangle" : cue === "seal" ? "sine" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      if (cue === "attack") oscillator.frequency.exponentialRampToValueAtTime(Math.max(42, frequency * 0.48), start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(cue === "attack" ? 0.05 : 0.035, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  } catch {
    // Audio is optional; unsupported or blocked contexts must not stop movement.
  }
}

export function playFootstep({ running, surface, enabled }: FootstepOptions) {
  if (!enabled || !soundEnabled || typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;

  try {
    gameAudioContext ??= new AudioContextClass();
    const context = gameAudioContext;
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    const variation = .92 + Math.random() * .16;
    const thump = context.createOscillator();
    const thumpGain = context.createGain();
    thump.type = "triangle";
    thump.frequency.setValueAtTime((running ? 104 : 78) * variation, now);
    thump.frequency.exponentialRampToValueAtTime((running ? 48 : 39) * variation, now + .085);
    thumpGain.gain.setValueAtTime(.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(running ? .09 : .07, now + .009);
    thumpGain.gain.exponentialRampToValueAtTime(.0001, now + .105);
    thump.connect(thumpGain).connect(context.destination);
    thump.start(now);
    thump.stop(now + .11);

    if (!footstepNoiseBuffer || footstepNoiseBuffer.sampleRate !== context.sampleRate) {
      const noiseLength = Math.max(1, Math.floor(context.sampleRate * .8));
      footstepNoiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
      const noiseData = footstepNoiseBuffer.getChannelData(0);
      for (let index = 0; index < noiseData.length; index += 1) {
        noiseData[index] = (Math.random() * 2 - 1) * .35;
      }
    }
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = footstepNoiseBuffer;
    noise.playbackRate.value = variation;
    filter.type = "lowpass";
    filter.frequency.value = (surface === "stone" ? 1100 : 720) * variation;
    noiseGain.gain.setValueAtTime(.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(running ? .047 : .032, now + .006);
    noiseGain.gain.exponentialRampToValueAtTime(.0001, now + .052);
    noise.connect(filter).connect(noiseGain).connect(context.destination);
    noise.start(now, Math.random() * (footstepNoiseBuffer.duration - .06));
    noise.stop(now + .06);
  } catch {
    // Footsteps are an optional enhancement; audio failures must not block movement.
  }
}
