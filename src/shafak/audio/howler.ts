import { Howl, Howler } from "howler";

let soundEnabled = true;

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
