import { useCallback, useEffect, useRef } from "react";
import { getChapterMusicNotes } from "../audio/chapter-music";

type AudioRig = {
  context: AudioContext;
  master: GainNode;
  ambience: GainNode;
  music: GainNode;
  sources: AudioNode[];
  musicVoices: OscillatorNode[];
  musicChapter: number;
};

export default function useTravelAudio(
  enabled: boolean,
  running: boolean,
  ambience: boolean,
  soundVolume: number,
  musicVolume: number,
  chapterId: number,
) {
  const rigRef = useRef<AudioRig | null>(null);
  const enabledRef = useRef(enabled);
  const runningRef = useRef(running);
  const ambienceRef = useRef(ambience);
  const soundVolumeRef = useRef(soundVolume);
  const musicVolumeRef = useRef(musicVolume);
  const chapterRef = useRef(chapterId);
  enabledRef.current = enabled;
  runningRef.current = running;
  ambienceRef.current = ambience;
  soundVolumeRef.current = soundVolume;
  musicVolumeRef.current = musicVolume;
  chapterRef.current = chapterId;

  const start = useCallback((force = false) => {
    const existing = rigRef.current;
    if (existing) {
      if (existing.context.state === "suspended") {
        void existing.context.resume().catch(() => undefined);
      }
      return;
    }
    if ((!enabledRef.current && !force) || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    try {
      const context = new AudioContextClass();
      const master = context.createGain();
      master.gain.value = .22;
      master.connect(context.destination);
      const ambientBus = context.createGain();
      ambientBus.gain.value = enabledRef.current && ambienceRef.current ? soundVolumeRef.current : 0;
      ambientBus.connect(master);
      const musicBus = context.createGain();
      musicBus.gain.value = enabledRef.current ? musicVolumeRef.current : 0;
      musicBus.connect(master);
      const sources: AudioNode[] = [];
      const makeNoise = (frequency: number, volume: number, filterType: BiquadFilterType, rate = 2) => {
        const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * .22;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = context.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = frequency;
        filter.Q.value = .6;
        const gain = context.createGain();
        gain.gain.value = volume;
        source.playbackRate.value = rate;
        source.connect(filter).connect(gain).connect(ambientBus);
        source.start();
        sources.push(source);
        return { source, filter, gain };
      };
      const wind = makeNoise(360, .16, "lowpass", .65);
      const battle = makeNoise(840, .055, "bandpass", .42);
      makeNoise(1900, .022, "highpass", .78);
      const musicVoices = ([0.5, 1, 1.5] as const).map((multiplier, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index === 1 ? "triangle" : "sine";
        oscillator.frequency.value = getChapterMusicNotes(chapterRef.current)[index] * multiplier;
        gain.gain.value = index === 0 ? .045 : index === 1 ? .016 : .008;
        oscillator.connect(gain).connect(musicBus);
        oscillator.start();
        sources.push(oscillator);
        return oscillator;
      });
      rigRef.current = {
        context,
        master,
        ambience: ambientBus,
        music: musicBus,
        sources,
        musicVoices,
        musicChapter: chapterRef.current,
      };
      void context.resume().catch(() => undefined);
      const animate = () => {
        const active = rigRef.current;
        if (!active || active.context.state === "closed") return;
        const now = active.context.currentTime;
        active.ambience.gain.setTargetAtTime(
          enabledRef.current && ambienceRef.current ? soundVolumeRef.current : 0,
          now,
          .12,
        );
        active.music.gain.setTargetAtTime(enabledRef.current ? musicVolumeRef.current : 0, now, .12);
        wind.filter.frequency.setTargetAtTime(ambienceRef.current ? 360 : 280, now, .8);
        battle.gain.gain.setTargetAtTime(ambienceRef.current && runningRef.current ? .055 : .03, now, .8);
        if (active.musicChapter !== chapterRef.current) {
          const notes = getChapterMusicNotes(chapterRef.current);
          active.musicVoices.forEach((voice, index) => {
            voice.frequency.setTargetAtTime(notes[index] * ([0.5, 1, 1.5] as const)[index], now, .9);
          });
          active.musicChapter = chapterRef.current;
        }
        requestRef.current = window.requestAnimationFrame(animate);
      };
      animate();
    } catch {
      // Audio is optional: blocked autoplay and unsupported contexts should never block travel.
    }
  }, []);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (rigRef.current) {
      const { context, ambience: ambientBus, music } = rigRef.current;
      ambientBus.gain.setTargetAtTime(enabled && ambience ? soundVolume : 0, context.currentTime, .12);
      music.gain.setTargetAtTime(enabled ? musicVolume : 0, context.currentTime, .12);
    }
  }, [ambience, enabled, musicVolume, soundVolume]);

  useEffect(() => () => {
    if (requestRef.current) window.cancelAnimationFrame(requestRef.current);
    const active = rigRef.current;
    if (active) {
      active.sources.forEach((source) => { try { source.disconnect(); } catch { /* already disconnected */ } });
      void active.context.close();
      rigRef.current = null;
    }
  }, []);

  return start;
}
