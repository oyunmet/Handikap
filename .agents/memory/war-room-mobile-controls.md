---
name: War Room mobile controls
description: Left-side joystick, right-side camera look, and combat HUD ownership in War Room.
---

In mobile War Room play, a touch on the left half of the battle area shows a dynamic joystick at that touch point; a touch drag on the right half controls camera look. These pointers can be active together. HUD buttons keep their own input and do not start either gesture. The joystick is not a fixed/custom-layout control; custom placement remains for the combat HUD. Handle gameplay pointers in capture phase on the battle surface, before the R3F canvas can consume bubbling events, and keep the rendered joystick pointer-transparent.

**Why:** The user explicitly clarified that movement belongs on the left and manual camera look belongs on the right, like Call of Duty Mobile. The scene uses a React Three Fiber canvas, so capture-phase input avoids relying on events bubbling past renderer handlers; the joystick visual must not become a dead touch area.

**How to apply:** Route touch starts by battle-area half, capture movement/look independently, and clear both on pointer up/cancel, blur, or page hiding. Keep HUD layout and safe-area rules intact. Preserve capture-phase listeners and `pointer-events: none` on the dynamic stick when changing the controls.
