export type WarRoomSoundCue = "shot" | "empty" | "reload" | "hit";

let muted = false;
let audioContext: AudioContext | null = null;

export function setWarRoomMuted(value: boolean) {
  muted = value;
  if (!muted && audioContext?.state === "suspended") void audioContext.resume();
}

export function playWarRoomSound(cue: WarRoomSoundCue) {
  if (muted || typeof window === "undefined") return;
  const AudioContextType = window.AudioContext;
  if (!AudioContextType) return;
  audioContext ??= new AudioContextType();
  if (audioContext.state === "suspended") void audioContext.resume();

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const settings = {
    shot: { frequency: 92, end: 48, duration: 0.11, volume: 0.055, type: "sawtooth" as OscillatorType },
    empty: { frequency: 410, end: 190, duration: 0.09, volume: 0.026, type: "square" as OscillatorType },
    reload: { frequency: 240, end: 360, duration: 0.16, volume: 0.025, type: "triangle" as OscillatorType },
    hit: { frequency: 150, end: 72, duration: 0.14, volume: 0.034, type: "triangle" as OscillatorType },
  }[cue];

  oscillator.type = settings.type;
  oscillator.frequency.setValueAtTime(settings.frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(settings.end, now + settings.duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(settings.volume, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + settings.duration + 0.01);
}
