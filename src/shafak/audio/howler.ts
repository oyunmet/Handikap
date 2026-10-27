import { Howl, Howler } from "howler";
import { normalizeAudioVolume } from "./audio-settings";

let soundEnabled = true;
let soundVolume = 0.78;
let gameAudioContext: AudioContext | null = null;
let gameAudioGain: GainNode | null = null;
let footstepNoiseBuffer: AudioBuffer | null = null;
let buttonClickContext: AudioContext | null = null;
let buttonClickOscillator: OscillatorNode | null = null;
let buttonClickGain: GainNode | null = null;

const uiChime = new Howl({
  src: ["/shafak-ui-chime.wav"],
  volume: 0.2,
  preload: true,
  pool: 4,
});

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  Howler.mute(!enabled);
  updateGameAudioGain();
}

export function setSoundVolume(volume: number) {
  soundVolume = normalizeAudioVolume(volume, soundVolume);
  Howler.volume(soundVolume);
  updateGameAudioGain();
}

function updateGameAudioGain() {
  if (!gameAudioContext || !gameAudioGain || gameAudioContext.state === "closed") return;
  gameAudioGain.gain.setTargetAtTime(
    soundEnabled ? soundVolume : 0,
    gameAudioContext.currentTime,
    0.06,
  );
}

function getGameAudioContext() {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  if (gameAudioContext?.state === "closed") {
    gameAudioContext = null;
    gameAudioGain = null;
    buttonClickContext = null;
    buttonClickOscillator = null;
    buttonClickGain = null;
  }
  if (gameAudioContext) return gameAudioContext;
  try {
    gameAudioContext = new window.AudioContext();
    gameAudioGain = gameAudioContext.createGain();
    gameAudioGain.gain.value = soundEnabled ? soundVolume : 0;
    gameAudioGain.connect(gameAudioContext.destination);
    return gameAudioContext;
  } catch {
    gameAudioContext = null;
    gameAudioGain = null;
    return null;
  }
}

function resumeGameAudio(context: AudioContext) {
  if (context.state === "suspended") void context.resume().catch(() => undefined);
}

export function primeGameAudio() {
  if (!soundEnabled || typeof window === "undefined") return;
  const context = getGameAudioContext();
  if (context) resumeGameAudio(context);
}

export function playGameButtonClick() {
  if (!soundEnabled || typeof window === "undefined" || !window.AudioContext) return;
  try {
    const context = getGameAudioContext();
    const bus = gameAudioGain;
    if (!context || !bus) return;
    resumeGameAudio(context);
    if (buttonClickContext !== context || !buttonClickOscillator || !buttonClickGain) {
      buttonClickContext = context;
      buttonClickOscillator = context.createOscillator();
      buttonClickGain = context.createGain();
      buttonClickOscillator.type = "triangle";
      buttonClickOscillator.frequency.value = 168;
      buttonClickGain.gain.value = 0.0001;
      buttonClickOscillator.connect(buttonClickGain).connect(bus);
      buttonClickOscillator.start();
    }
    const now = context.currentTime;
    buttonClickGain.gain.cancelScheduledValues(now);
    buttonClickGain.gain.setValueAtTime(0.0001, now);
    buttonClickGain.gain.exponentialRampToValueAtTime(0.075, now + 0.008);
    buttonClickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    buttonClickOscillator.frequency.setValueAtTime(168, now);
    buttonClickOscillator.frequency.exponentialRampToValueAtTime(112, now + 0.055);
  } catch {
    // Optional button feedback must never block an input action.
  }
}

export function createIntroAmbience() {
  if (!soundEnabled || typeof window === "undefined" || !window.AudioContext) {
    return () => undefined;
  }

  const sources: (AudioBufferSourceNode | OscillatorNode)[] = [];
  const nodes: AudioNode[] = [];
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // A source may already have been stopped by the browser.
      }
    });
    nodes.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        // Disconnect is best-effort for browser-specific AudioNode implementations.
      }
    });
    sources.length = 0;
    nodes.length = 0;
  };

  try {
    const context = getGameAudioContext();
    const bus = gameAudioGain;
    if (!context || !bus) return cleanup;
    resumeGameAudio(context);

    const now = context.currentTime;
    const windBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const windSamples = windBuffer.getChannelData(0);
    for (let index = 0; index < windSamples.length; index += 1) {
      windSamples[index] = (Math.random() * 2 - 1) * 0.18;
    }

    const wind = context.createBufferSource();
    const windFilter = context.createBiquadFilter();
    const windGain = context.createGain();
    wind.buffer = windBuffer;
    wind.loop = true;
    windFilter.type = "lowpass";
    windFilter.frequency.value = 620;
    windGain.gain.setValueAtTime(0.0001, now);
    windGain.gain.exponentialRampToValueAtTime(0.016, now + 1.4);
    wind.connect(windFilter).connect(windGain).connect(bus);
    wind.start(now);

    const drone = context.createOscillator();
    const droneGain = context.createGain();
    drone.type = "sine";
    drone.frequency.value = 47;
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.exponentialRampToValueAtTime(0.028, now + 1.8);
    drone.connect(droneGain).connect(bus);
    drone.start(now);

    sources.push(wind, drone);
    nodes.push(wind, windFilter, windGain, drone, droneGain);
    return cleanup;
  } catch {
    cleanup();
    return () => undefined;
  }
}

export function createIntroImpact() {
  if (!soundEnabled || typeof window === "undefined" || !window.AudioContext) return () => undefined;

  let oscillator: OscillatorNode | null = null;
  let nodes: AudioNode[] = [];
  let cleanupTimer = 0;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (cleanupTimer) window.clearTimeout(cleanupTimer);
    try {
      oscillator?.stop();
    } catch {
      // The one-shot may already have reached its scheduled stop time.
    }
    nodes.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        // Disconnect is best-effort for browser-specific AudioNode implementations.
      }
    });
    nodes = [];
    oscillator = null;
  };

  try {
    const context = getGameAudioContext();
    const bus = gameAudioGain;
    if (!context || !bus) return () => undefined;
    resumeGameAudio(context);

    const now = context.currentTime;
    oscillator = context.createOscillator();
    const dryGain = context.createGain();
    const convolver = context.createConvolver();
    const wetGain = context.createGain();
    const impulseLength = Math.floor(context.sampleRate * 0.38);
    const impulse = context.createBuffer(2, impulseLength, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const samples = impulse.getChannelData(channel);
      for (let index = 0; index < impulseLength; index += 1) {
        const decay = 1 - index / impulseLength;
        samples[index] = (Math.random() * 2 - 1) * decay * decay * 0.22;
      }
    }
    convolver.buffer = impulse;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(48, now);
    oscillator.frequency.exponentialRampToValueAtTime(31, now + 0.62);
    dryGain.gain.setValueAtTime(0.0001, now);
    dryGain.gain.exponentialRampToValueAtTime(0.12, now + 0.035);
    dryGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);
    wetGain.gain.setValueAtTime(0.0001, now);
    wetGain.gain.exponentialRampToValueAtTime(0.028, now + 0.05);
    wetGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    oscillator.connect(dryGain).connect(bus);
    oscillator.connect(convolver);
    convolver.connect(wetGain).connect(bus);
    nodes = [oscillator, dryGain, convolver, wetGain];
    oscillator.start(now);
    oscillator.stop(now + 0.82);
    cleanupTimer = window.setTimeout(cleanup, 1_400);
    return cleanup;
  } catch {
    cleanup();
    return () => undefined;
  }
}

export function playUiChime() {
  if (soundEnabled) uiChime.play();
}

type GameCue = "victory" | "defeat";
type WorldCue = "gold" | "crystal" | "seal" | "attack" | "battle" | "telegraph" | "block" | "fire" | "lightning" | "impact" | "death" | "potion" | "arrow" | "movement";
type FootstepOptions = { running: boolean; surface: "stone" | "dirt"; enabled: boolean };

const cueNotes: Record<GameCue, number[]> = {
  victory: [392, 494, 587, 784],
  defeat: [294, 247, 196],
};

export function playGameSound(cue: GameCue) {
  if (!soundEnabled || typeof window === "undefined") return;

  try {
    const context = getGameAudioContext();
    const bus = gameAudioGain;
    if (!context || !bus) return;
    resumeGameAudio(context);
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
      gain.connect(bus);
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
  telegraph: [740, 510],
  block: [520, 780],
  fire: [180, 330, 110],
  lightning: [980, 640, 420],
  impact: [112, 78],
  death: [294, 220, 146],
  potion: [420, 630, 840],
  arrow: [760, 520],
  movement: [430, 570],
};

export function playWorldCue(cue: WorldCue) {
  if (!soundEnabled || typeof window === "undefined" || !window.AudioContext) return;
  try {
    const context = getGameAudioContext();
    const bus = gameAudioGain;
    if (!context || !bus) return;
    resumeGameAudio(context);
    const notes = worldCueNotes[cue];
    const spacing = cue === "attack" || cue === "impact" || cue === "arrow" || cue === "movement"
      ? 0.035
      : cue === "telegraph" ? 0.04 : 0.055;
    const duration = cue === "attack" || cue === "impact" || cue === "arrow" || cue === "movement"
      ? 0.095
      : cue === "telegraph" ? 0.13 : 0.16;
    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * spacing;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = cue === "lightning"
        ? "square"
        : cue === "attack" || cue === "telegraph" || cue === "impact" || cue === "arrow" || cue === "movement"
          ? "triangle"
          : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      if (cue === "attack") oscillator.frequency.exponentialRampToValueAtTime(Math.max(42, frequency * 0.48), start + duration);
      if (cue === "telegraph") oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, start + duration);
      if (cue === "fire") oscillator.frequency.exponentialRampToValueAtTime(Math.max(44, frequency * 0.35), start + duration);
      if (cue === "impact") oscillator.frequency.exponentialRampToValueAtTime(Math.max(38, frequency * 0.55), start + duration);
      if (cue === "arrow") oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.65, start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      const peak = cue === "attack" || cue === "impact" ? 0.05
        : cue === "telegraph" || cue === "lightning" ? 0.027
          : cue === "arrow" || cue === "block" || cue === "potion" ? 0.03
            : 0.035;
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(bus);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  } catch {
    // Audio is optional; unsupported or blocked contexts must not stop movement.
  }
}

export function playFootstep({ running, surface, enabled }: FootstepOptions) {
  if (!enabled || !soundEnabled || typeof window === "undefined") return;

  try {
    const context = getGameAudioContext();
    const bus = gameAudioGain;
    if (!context || !bus) return;
    resumeGameAudio(context);
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
    thump.connect(thumpGain).connect(bus);
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
    noise.connect(filter).connect(noiseGain).connect(bus);
    noise.start(now, Math.random() * (footstepNoiseBuffer.duration - .06));
    noise.stop(now + .06);
  } catch {
    // Footsteps are an optional enhancement; audio failures must not block movement.
  }
}
