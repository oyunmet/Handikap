import { Howl, Howler } from "howler";

let soundEnabled = true;
let gameAudioContext: AudioContext | null = null;

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

type GameCue = "move" | "match" | "combo" | "deny" | "victory" | "defeat";

const cueNotes: Record<GameCue, number[]> = {
  move: [220],
  match: [392, 523],
  combo: [392, 494, 659, 784],
  deny: [165, 130],
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
    const spacing = cue === "combo" || cue === "victory" || cue === "defeat" ? 0.085 : 0.035;
    const duration = cue === "move" || cue === "deny" ? 0.12 : 0.2;

    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * spacing;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = cue === "defeat" || cue === "deny" ? "triangle" : "sine";
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
