---
name: War Room mobile controls
description: Touch-origin joystick behavior and combat HUD ownership in War Room.
---

In mobile War Room play, show a dynamic joystick wherever the player first touches the battle area, then track that pointer until release or cancellation. HUD buttons keep their own input and do not start movement. The joystick itself is not a fixed/custom-layout control; custom placement remains for the combat HUD. Keep status details clear of the buttons and safe areas.

**Why:** The user replaced the fixed-stick behavior with a full-battle-area touch joystick that appears at the touch point.

**How to apply:** Start movement on any non-button battle-area touch, capture it independently from combat-button pointers, and clear it on pointer up/cancel, blur, or page hiding. Keep HUD layout and safe-area rules intact.
