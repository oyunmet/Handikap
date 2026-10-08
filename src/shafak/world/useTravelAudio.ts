import { useCallback, useEffect, useRef } from "react";

type AudioRig = {
  context: AudioContext;
  master: GainNode;
  sources: AudioNode[];
};

export default function useTravelAudio(enabled: boolean, running: boolean, ambience: boolean) {
  const rigRef = useRef<AudioRig | null>(null);
  const enabledRef = useRef(enabled);
  const runningRef = useRef(running);
  const ambienceRef = useRef(ambience);
  enabledRef.current = enabled;
  runningRef.current = running;
  ambienceRef.current = ambience;

  const start = useCallback(() => {
    if (!enabledRef.current || rigRef.current || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    try {
      const context = new AudioContextClass();
      const master = context.createGain();
      master.gain.value = .22;
      master.connect(context.destination);
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
        source.connect(filter).connect(gain).connect(master);
        source.start();
        sources.push(source);
        return { source, filter, gain };
      };
      const wind = makeNoise(360, .16, "lowpass", .65);
      const battle = makeNoise(840, .055, "bandpass", .42);
      makeNoise(1900, .022, "highpass", .78);
      const drone = context.createOscillator();
      const droneGain = context.createGain();
      drone.type = "sine";
      drone.frequency.value = 48;
      droneGain.gain.value = .035;
      drone.connect(droneGain).connect(master);
      drone.start();
      sources.push(drone);
      rigRef.current = { context, master, sources };
      void context.resume();
      const animate = () => {
        const active = rigRef.current;
        if (!active || active.context.state === "closed") return;
        const now = active.context.currentTime;
        active.master.gain.setTargetAtTime(enabledRef.current && ambienceRef.current ? .22 : 0, now, .12);
        wind.filter.frequency.setTargetAtTime(ambienceRef.current ? 360 : 280, now, .8);
        battle.gain.gain.setTargetAtTime(ambienceRef.current && runningRef.current ? .055 : .03, now, .8);
        requestRef.current = window.requestAnimationFrame(animate);
      };
      animate();
    } catch {
      // Audio is optional: blocked autoplay and unsupported contexts should never block travel.
    }
  }, []);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled && rigRef.current) rigRef.current.master.gain.setTargetAtTime(0, rigRef.current.context.currentTime, .12);
    return undefined;
  }, [enabled]);

  useEffect(() => {
    if (rigRef.current) {
      const { context, master } = rigRef.current;
      master.gain.setTargetAtTime(enabled && ambience ? .22 : 0, context.currentTime, .12);
    }
  }, [ambience, enabled]);

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
