# Character animation adapter

The active renderer uses the existing single warrior image with movement-driven pose variables in `WorldScene`. Locomotion and combat use one shared state list: `idle`, `walk`, `run`, `attack`, `block`, `dodge`, `hit`, and `die`. Combat actions override locomotion; the combat scene can pass its action to `CharacterRenderer` without changing movement simulation.

To switch to a sprite sheet, add the image and fill `CHARACTER_SPRITE_SHEET` in `character-animation.ts` with its frame size, columns, and a clip for each state. Set `CHARACTER_ANIMATION_BACKEND` there to `"sprite-sheet"`. The renderer advances looping clips and holds completed one-shot actions; reduced-motion mode displays the first frame.

To add skeletal animation later, implement a React adapter matching `CharacterAnimationAdapter`, register it in `characterAnimationAdapters`, and change `CHARACTER_ANIMATION_BACKEND` to `"skeletal"`. Keep animation rendering in the adapter; deterministic movement and combat state stay in their independent simulation modules.
