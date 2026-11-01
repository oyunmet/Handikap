---
name: War Room mobile controls
description: Left-side joystick, right-side camera look, and combat HUD ownership in War Room.
---

In mobile War Room play, a touch on the left half of the battle area shows a dynamic joystick at that touch point; a touch drag on the right half controls camera look. These pointers can be active together. HUD buttons keep their own input and do not start either gesture. The joystick is not a fixed/custom-layout control; custom placement remains for the combat HUD.

**Why:** The user explicitly clarified that movement belongs on the left and manual camera look belongs on the right, like Call of Duty Mobile.

**How to apply:** Route touch starts by battle-area half, capture movement/look independently, and clear both on pointer up/cancel, blur, or page hiding. Keep HUD layout and safe-area rules intact.
