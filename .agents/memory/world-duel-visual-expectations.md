---
name: World and duel visual expectations
description: Player-facing requirements for coherent environments, clear duels, and recognizable combatants.
---

World encounter rivals must stay anchored to their encounter locations instead of pacing, following the player, or sliding when revisiting. All animated humanoids across the road, duel, city, and War Room should read as people with recognizable anatomy, faceted details, and joints that follow their rigs—not disconnected primitive shapes. Preserve each character's identity, clothing, equipment, and existing animation clips while improving the fallback and first-person models. During a duel, both fighters must face each other and appear side by side across the screen, not stacked vertically. Use a rear-side camera angle that keeps the player's weapon hand and attack effects clearly visible; never present the player facing the camera. The duel player must retain the same recognizable appearance as the road hero. Keep bosses on a player-like humanoid rig and close to the player's height; distinguish them with well-proportioned armor, silhouette, patterns, and shapes. Attach weapons and equipment to the rig's hand and bones. Keep the arena clear of world scenery and duplicate overlays so both fighters remain visible. Road rewards and hazards must be visually obvious and reachable; seeded content that players cannot see does not satisfy the requirement.

Rig-attached geometry must account for the mount bone's full world scale after fitting, including nested GLB armature scales. Counter-scale geometry by the post-fit bone world scale; separately convert the attachment group's own position from bone-local units, since that offset is transformed before the child scale. Check combined model bounds and ground clearance in world coordinates.

The source player hero GLB's visible face points along native +Z; the runtime wrapper applies a π correction so its corrected local front points -Z. Keep that correction additive to actor movement heading; subtracting it again can turn forward/sideways travel into a visibly wrong facing direction.

**Why:** The user requested that every in-game character look more human and detailed while retaining articulated joint movement. They also reported moving rivals, obscured duel fighters, and a road hero that changed into a different-looking duel figure. A mobile duel screenshot showed the player reading as miniature beside an oversized boss, so keep proportions close and use equipment to distinguish identity. Later mobile screenshots showed the hero facing incorrectly after torso lean had been removed; the remaining error was model-axis yaw being canceled at the actor root. A princess built on the same nested rig exposed that inverse model-fit scale alone can make bone-mounted adornments oversized, while an unconverted local attachment offset can be magnified by the bone.

**How to apply:** For character refinements, preserve GLB rigs and clips, use tapered faceted anatomy for procedural fallbacks and first-person limbs, and attach armor details to the bones that animate those body parts. Check the joints through movement and verify combined bounds. Keep the road hero and duel player visually consistent; keep duel bosses near player scale and distinguish them with cohesive, scale-fitted gear. Project combatants horizontally with the camera over the player's weapon-side shoulder, apply both x and z actor coordinates, and align hit feedback with their screen positions. Test that attached weapons move with the hand during attacks. When the source rig has nested scaling, measure the mount bone's world scale after fitting, compensate child geometry and its bone-local offset independently, then check the final bounds. For travel facing, transform the source GLB's native +Z front through its π wrapper correction and root, then compare it with forward, left, and right movement vectors. Preserve gameplay expectations in both WebGL and 2D fallback paths.

In War Room mobile gameplay, a rendered hero is not enough: the player must be large enough to identify, the active hand-held weapon must be legible, and successful attacks must show an unmistakable hit cue beyond the base reticle.

**Why:** The user repeated that the live phone view still did not make the player, equipped weapon, or impact effects visible.

**How to apply:** Verify an actual in-game mobile capture after visual changes. If the available preview cannot create WebGL, state that limitation and do not claim the combat scene was visually verified.

War Room battle spaces should read as connected, lived-in medieval settlements: a visible open sky, continuous stone streets and paths, and believable domestic interiors. Avoid isolated scenery that makes the world feel fragmented.

**Why:** The user said the battle world felt disconnected and asked for sky, stone walkways, streets, and more home-like interiors.

**How to apply:** Keep environmental additions aligned with room rotation and clear of gameplay paths; use cohesive procedural set dressing that fits mobile performance.

On the road, the hero should keep an upright torso and a level head while standing; ordinary movement should not add a pronounced forward hunch.

**Why:** The user reported that the hero looked bowed while standing after starting the road.

**How to apply:** Check the bound player rig's idle pose and head angle at rest, then use only a small counter-pose if the animation needs it.
