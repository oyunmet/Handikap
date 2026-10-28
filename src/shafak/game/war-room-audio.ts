import { WAR_ROOM_SYNTH_AUDIO_ENABLED } from "./war-room-features";
import type { WarRoomWeaponId } from "./war-room-data";

export type WarRoomSoundCue =
  | "shot" | "enemy-shot" | "bow" | "empty" | "reload" | "hit"
  | "critical-hit" | "kill" | "heartbeat"
  | "melee-swing" | "melee-hit" | "footstep" | "healing-pickup";
export type WarRoomShotStyle = "rifle" | "shotgun" | "pistol";
export type WarRoomSoundSurface = "flesh" | "metal" | "stone" | "earth";
export const WAR_ROOM_AUDIO_VOICE_LIMIT = 4;

export type WarRoomSpatialSound = {
  source: { x: number; z: number };
  listener: { x: number; z: number; yaw: number };
};

export type WarRoomSoundOptions = {
  surface?: WarRoomSoundSurface;
  heavy?: boolean;
  weaponId?: WarRoomWeaponId;
  spatial?: WarRoomSpatialSound;
};

type WarRoomSoundProfile = {
  duration: number;
  cutoffStart: number;
  cutoffEnd: number;
  frequencyStart: number;
  frequencyEnd: number;
  noiseGain: number;
  toneGain: number;
  toneType: OscillatorType;
  pulses: number;
};

type WarRoomAudioVoice = {
  busyUntil: number;
  filter: BiquadFilterNode;
  noiseGain: GainNode;
  oscillator: OscillatorNode;
  toneGain: GainNode;
  panner: StereoPannerNode | null;
};

let muted = false;
let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let audioVoices: WarRoomAudioVoice[] = [];

export function isWarRoomMuted() {
  return muted;
}

export function getWarRoomSpatialAudioMix(
  sourceX: number,
  sourceZ: number,
  listenerX: number,
  listenerZ: number,
  listenerYaw: number,
) {
  const dx = sourceX - listenerX;
  const dz = sourceZ - listenerZ;
  const distance = Math.hypot(dx, dz);
  const relativeAngle = Math.atan2(dx, -dz) - listenerYaw;
  return {
    distance,
    attenuation: 1 / (1 + distance * 0.085),
    pan: Math.max(-1, Math.min(1, Math.sin(relativeAngle))),
  };
}

export function getWarRoomPitchVariation(randomValue: number) {
  const normalized = Number.isFinite(randomValue) ? Math.max(0, Math.min(1, randomValue)) : 0.5;
  return 0.94 + normalized * 0.12;
}

export function getWarRoomSoundProfile(
  cue: WarRoomSoundCue,
  options: Pick<WarRoomSoundOptions, "surface" | "heavy" | "weaponId"> & { style?: WarRoomShotStyle } = {},
): WarRoomSoundProfile {
  const { surface = "flesh", heavy = false, style = "rifle", weaponId } = options;
  if (cue === "shot" || cue === "enemy-shot") {
    const shot = {
      rifle: { duration: 0.105, cutoffStart: 1900, cutoffEnd: 360, frequencyStart: 116, frequencyEnd: 48, noiseGain: 0.07, toneGain: 0.055, toneType: "sawtooth" as OscillatorType },
      shotgun: { duration: 0.2, cutoffStart: 1050, cutoffEnd: 220, frequencyStart: 82, frequencyEnd: 38, noiseGain: 0.12, toneGain: 0.08, toneType: "sawtooth" as OscillatorType },
      pistol: { duration: 0.085, cutoffStart: 2600, cutoffEnd: 560, frequencyStart: 190, frequencyEnd: 68, noiseGain: 0.065, toneGain: 0.05, toneType: "square" as OscillatorType },
    }[style];
    const scale = cue === "enemy-shot" ? 0.72 : 1;
    return { ...shot, noiseGain: shot.noiseGain * scale, toneGain: shot.toneGain * scale, pulses: 1 };
  }
  if (cue === "bow") {
    return { duration: 0.16, cutoffStart: 1800, cutoffEnd: 380, frequencyStart: 540, frequencyEnd: 190, noiseGain: 0.018, toneGain: 0.035, toneType: "triangle", pulses: 1 };
  }
  if (cue === "melee-swing") {
    const weaponProfiles: Partial<Record<WarRoomWeaponId, Omit<WarRoomSoundProfile, "pulses">>> = {
      melee_knife: { duration: 0.105, cutoffStart: 3900, cutoffEnd: 980, frequencyStart: 520, frequencyEnd: 190, noiseGain: 0.024, toneGain: 0.018, toneType: "sawtooth" },
      melee_axe: { duration: 0.19, cutoffStart: 1150, cutoffEnd: 180, frequencyStart: 205, frequencyEnd: 48, noiseGain: 0.06, toneGain: 0.04, toneType: "sawtooth" },
      melee_cudgel: { duration: 0.15, cutoffStart: 1650, cutoffEnd: 340, frequencyStart: 250, frequencyEnd: 72, noiseGain: 0.042, toneGain: 0.032, toneType: "triangle" },
      melee_spear: { duration: 0.12, cutoffStart: 2800, cutoffEnd: 620, frequencyStart: 440, frequencyEnd: 145, noiseGain: 0.03, toneGain: 0.02, toneType: "triangle" },
      melee_shovel: { duration: 0.18, cutoffStart: 1280, cutoffEnd: 190, frequencyStart: 190, frequencyEnd: 46, noiseGain: 0.055, toneGain: 0.036, toneType: "sawtooth" },
      melee_staff: { duration: 0.16, cutoffStart: 2100, cutoffEnd: 420, frequencyStart: 300, frequencyEnd: 82, noiseGain: 0.046, toneGain: 0.035, toneType: "triangle" },
      melee_war_spear: { duration: 0.135, cutoffStart: 2500, cutoffEnd: 510, frequencyStart: 390, frequencyEnd: 112, noiseGain: 0.036, toneGain: 0.026, toneType: "sawtooth" },
      melee_pickaxe: { duration: 0.205, cutoffStart: 980, cutoffEnd: 155, frequencyStart: 175, frequencyEnd: 42, noiseGain: 0.064, toneGain: 0.042, toneType: "sawtooth" },
    };
    const base = weaponProfiles[weaponId ?? "melee_knife"] ?? weaponProfiles.melee_knife!;
    return heavy
      ? {
        ...base,
        duration: Math.max(base.duration, 0.2),
        cutoffStart: Math.min(base.cutoffStart, 1050),
        cutoffEnd: Math.min(base.cutoffEnd, 210),
        frequencyStart: Math.min(base.frequencyStart, 230),
        frequencyEnd: Math.min(base.frequencyEnd, 58),
        noiseGain: base.noiseGain * 1.18,
        toneGain: base.toneGain * 1.12,
        pulses: 1,
      }
      : { ...base, pulses: 1 };
  }
  if (cue === "melee-hit" || cue === "hit") {
    if (surface === "metal") {
      return { duration: 0.18, cutoffStart: 3600, cutoffEnd: 760, frequencyStart: 430, frequencyEnd: 96, noiseGain: 0.085, toneGain: 0.062, toneType: "triangle", pulses: 1 };
    }
    if (surface === "stone") {
      return { duration: 0.14, cutoffStart: 1450, cutoffEnd: 280, frequencyStart: 170, frequencyEnd: 54, noiseGain: 0.075, toneGain: 0.05, toneType: "triangle", pulses: 1 };
    }
    return { duration: 0.11, cutoffStart: 720, cutoffEnd: 210, frequencyStart: 118, frequencyEnd: 48, noiseGain: 0.075, toneGain: 0.055, toneType: "triangle", pulses: 1 };
  }
  if (cue === "critical-hit") {
    return { duration: 0.16, cutoffStart: 4200, cutoffEnd: 1550, frequencyStart: 1040, frequencyEnd: 1460, noiseGain: 0.012, toneGain: 0.058, toneType: "sine", pulses: 2 };
  }
  if (cue === "kill") {
    return { duration: 0.2, cutoffStart: 2600, cutoffEnd: 920, frequencyStart: 560, frequencyEnd: 1120, noiseGain: 0.018, toneGain: 0.052, toneType: "triangle", pulses: 2 };
  }
  if (cue === "heartbeat") {
    return { duration: 0.13, cutoffStart: 360, cutoffEnd: 210, frequencyStart: 68, frequencyEnd: 48, noiseGain: 0.008, toneGain: 0.045, toneType: "sine", pulses: 1 };
  }
  if (cue === "footstep") {
    return surface === "stone"
      ? { duration: 0.075, cutoffStart: 1500, cutoffEnd: 380, frequencyStart: 155, frequencyEnd: 76, noiseGain: 0.028, toneGain: 0.024, toneType: "triangle", pulses: 1 }
      : { duration: 0.1, cutoffStart: 920, cutoffEnd: 240, frequencyStart: 105, frequencyEnd: 48, noiseGain: 0.032, toneGain: 0.018, toneType: "triangle", pulses: 1 };
  }
  if (cue === "healing-pickup") {
    return {
      duration: 0.16,
      cutoffStart: 2400,
      cutoffEnd: 880,
      frequencyStart: 660,
      frequencyEnd: 1080,
      noiseGain: 0.012,
      toneGain: 0.048,
      toneType: "sine",
      pulses: 2,
    };
  }
  if (cue === "reload") {
    return { duration: 0.045, cutoffStart: 1800, cutoffEnd: 600, frequencyStart: 620, frequencyEnd: 410, noiseGain: 0.022, toneGain: 0.028, toneType: "triangle", pulses: 2 };
  }
  if (cue === "empty") {
    return { duration: 0.09, cutoffStart: 1900, cutoffEnd: 540, frequencyStart: 410, frequencyEnd: 190, noiseGain: 0.014, toneGain: 0.026, toneType: "square", pulses: 1 };
  }
  return { duration: 0.14, cutoffStart: 950, cutoffEnd: 240, frequencyStart: 150, frequencyEnd: 72, noiseGain: 0.024, toneGain: 0.034, toneType: "triangle", pulses: 1 };
}

function createAudioVoices(context: AudioContext) {
  const master = context.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(context.destination);
  masterGain = master;

  const noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.36), context.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  const fadeSamples = Math.max(1, Math.floor(context.sampleRate * 0.01));
  for (let index = 0; index < samples.length; index += 1) {
    const fade = Math.min(1, index / fadeSamples, (samples.length - index - 1) / fadeSamples);
    samples[index] = (Math.random() * 2 - 1) * Math.max(0, fade);
  }

  audioVoices = Array.from({ length: WAR_ROOM_AUDIO_VOICE_LIMIT }, () => {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    const oscillator = context.createOscillator();
    const toneGain = context.createGain();
    const panner = typeof context.createStereoPanner === "function" ? context.createStereoPanner() : null;
    const output = panner ?? context.createGain();

    source.buffer = noiseBuffer;
    source.loop = true;
    filter.type = "lowpass";
    noiseGain.gain.value = 0;
    toneGain.gain.value = 0;
    oscillator.type = "sawtooth";
    oscillator.frequency.value = 80;

    source.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(output);
    oscillator.connect(toneGain);
    toneGain.connect(output);
    output.connect(master);
    source.start();
    oscillator.start();
    return {
      busyUntil: 0,
      filter,
      noiseGain,
      oscillator,
      toneGain,
      panner,
    };
  });
}

function getAudioContext() {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  audioContext ??= new window.AudioContext();
  if (audioVoices.length === 0) createAudioVoices(audioContext);
  return audioContext;
}

export function resumeWarRoomAudio() {
  if (!WAR_ROOM_SYNTH_AUDIO_ENABLED) return;
  const context = getAudioContext();
  if (context?.state === "suspended") void context.resume();
}

export function setWarRoomMuted(value: boolean) {
  muted = value;
  if (audioContext && masterGain) {
    masterGain.gain.setTargetAtTime(muted ? 0 : 1, audioContext.currentTime, 0.012);
  }
  if (!muted) resumeWarRoomAudio();
}

function scheduleEnvelope(gain: GainNode, at: number, duration: number, level: number) {
  gain.gain.cancelScheduledValues(at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
}

export function playWarRoomSound(
  cue: WarRoomSoundCue,
  volume = 1,
  style: WarRoomShotStyle = "rifle",
  options: WarRoomSoundOptions = {},
) {
  if (muted || !WAR_ROOM_SYNTH_AUDIO_ENABLED) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  const now = context.currentTime;
  const safeVolume = Math.max(0, Math.min(1, volume));
  if (safeVolume === 0) return;
  const profile = getWarRoomSoundProfile(cue, { ...options, style });
  const voice = audioVoices.find((candidate) => candidate.busyUntil <= now)
    ?? audioVoices.reduce((earliest, candidate) => candidate.busyUntil < earliest.busyUntil ? candidate : earliest);
  const spatial = options.spatial
    ? getWarRoomSpatialAudioMix(
      options.spatial.source.x,
      options.spatial.source.z,
      options.spatial.listener.x,
      options.spatial.listener.z,
      options.spatial.listener.yaw,
    )
    : { attenuation: 1, pan: 0 };
  const gainScale = safeVolume * spatial.attenuation;
  const pulseGap = profile.duration + 0.075;
  voice.busyUntil = now + profile.duration * profile.pulses + 0.075 * (profile.pulses - 1);
  if (voice.panner) voice.panner.pan.setTargetAtTime(spatial.pan, now, 0.008);

  for (let pulse = 0; pulse < profile.pulses; pulse += 1) {
    const at = now + pulse * pulseGap;
    const pulseScale = pulse === 0 ? 1 : 0.78;
    const pitchScale = getWarRoomPitchVariation(Math.random());
    voice.filter.frequency.cancelScheduledValues(at);
    voice.filter.frequency.setValueAtTime(profile.cutoffStart, at);
    voice.filter.frequency.exponentialRampToValueAtTime(profile.cutoffEnd, at + profile.duration);
    voice.oscillator.type = profile.toneType;
    voice.oscillator.frequency.cancelScheduledValues(at);
    voice.oscillator.frequency.setValueAtTime(profile.frequencyStart * pitchScale, at);
    voice.oscillator.frequency.exponentialRampToValueAtTime(profile.frequencyEnd * pitchScale, at + profile.duration);
    scheduleEnvelope(voice.noiseGain, at, profile.duration, profile.noiseGain * gainScale * pulseScale);
    scheduleEnvelope(voice.toneGain, at, profile.duration, profile.toneGain * gainScale * pulseScale);
  }
}
