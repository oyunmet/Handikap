---
name: War Room viewmodel rendering
description: Keep the first-person arms and weapon visible in the War Room scene.
---

Render the War Room first-person viewmodel in its own scene, with the active camera passed explicitly to the portal. Draw the world first, clear depth, then draw the viewmodel scene so weapon parts depth-test against each other without being hidden by world geometry. Arms and weapon should share the same locomotion pose; smooth wall-proximity changes before applying a weapon tuck. Never portal to the default camera object as a scene child.

Keep ranged weapons steady while walking: use only a small amount of lateral movement and rotation so the muzzle does not sweep across nearby characters. Preserve visible aim, recoil, reload, and intentional attack animations.

**Why:** A portal to the default camera passed type checks and pose tests but produced no arms or weapon. Independent arm compensation can cancel the shared gait, while stepped wall-proximity samples can make the weapon pop. The user also wants articulated feet visible on a downward look without exposing the full model to camera clipping.

**How to apply:** Keep arm and weapon motion coupled, ease wall-proximity targets, and keep walk sway below a small fraction of its former amplitude. Show articulated legs and feet only when the camera looks down, positioned from the player's actual world pose; verify floor, jump, crouch, and walk poses in a rendered screenshot—preferably with SwiftShader Chromium when Replit's screenshot browser cannot create WebGL. Unit tests and a successful build do not prove the model is visible.
