export type WarRoomSoundCue = "shot" | "enemy-shot" | "bow" | "empty" | "reload" | "hit";
export type WarRoomShotStyle = "rifle" | "shotgun" | "pistol";

let muted = false;
let audioContext: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getAudioContext() {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  audioContext ??= new window.AudioContext();
  return audioContext;
}

export function resumeWarRoomAudio() {
  const context = getAudioContext();
  if (context?.state === "suspended") void context.resume();
}

export function setWarRoomMuted(value: boolean) {
  muted = value;
  if (!muted) resumeWarRoomAudio();
}

function playNoise(context: AudioContext, now: number, duration: number, volume: number, cutoff: number) {
  if (!noiseBuffer) {
    noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.2), context.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length);
    }
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = noiseBuffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, now);
  gain.gain.setValueAtTime(Math.max(0.0001, volume), now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(now);
  source.stop(now + duration);
}

export function playWarRoomSound(
  cue: WarRoomSoundCue,
  volume = 1,
  style: WarRoomShotStyle = "rifle",
) {
  if (muted) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  const now = context.currentTime;
  const safeVolume = Math.max(0, Math.min(1, volume));
  if (cue === "shot" || cue === "enemy-shot") {
    const settings = {
      rifle: { frequency: 116, end: 48, duration: 0.105, volume: 0.07, cutoff: 1900 },
      shotgun: { frequency: 82, end: 38, duration: 0.2, volume: 0.12, cutoff: 1050 },
      pistol: { frequency: 190, end: 68, duration: 0.085, volume: 0.065, cutoff: 2600 },
    }[style];
    const soundScale = (cue === "enemy-shot" ? 0.72 : 1) * safeVolume;
    playNoise(context, now, settings.duration, settings.volume * soundScale, settings.cutoff);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = style === "pistol" ? "square" : "sawtooth";
    oscillator.frequency.setValueAtTime(settings.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(settings.end, now + settings.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(settings.volume * soundScale * 0.8, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.duration + 0.01);
    return;
  }

  if (cue === "bow") {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(540, now);
    oscillator.frequency.exponentialRampToValueAtTime(190, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035 * safeVolume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.17);
    return;
  }

  const settings = {
    empty: { frequency: 410, end: 190, duration: 0.09, volume: 0.026, type: "square" as OscillatorType },
    reload: { frequency: 620, end: 410, duration: 0.045, volume: 0.028, type: "triangle" as OscillatorType },
    hit: { frequency: 150, end: 72, duration: 0.14, volume: 0.034, type: "triangle" as OscillatorType },
  }[cue];
  const tickCount = cue === "reload" ? 2 : 1;
  for (let tick = 0; tick < tickCount; tick += 1) {
    const at = now + tick * 0.12;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = settings.type;
    oscillator.frequency.setValueAtTime(settings.frequency - tick * 120, at);
    oscillator.frequency.exponentialRampToValueAtTime(settings.end, at + settings.duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(settings.volume * safeVolume, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + settings.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + settings.duration + 0.01);
  }
}
