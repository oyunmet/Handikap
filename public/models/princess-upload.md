# Princess GLB upload

The final-screen loader looks for the animated character at:

`public/models/princess.glb`

Upload a skinned, low-poly GLB no larger than 3 MiB. Keep textures at 1024 px or smaller and use Draco or Meshopt geometry compression with WebP/KTX2 textures where available. The model should stand upright on +Y and face local +Z toward the final-screen camera.

Animation clips are matched case-insensitively by these names or aliases:

- `Idle` (`Stand`, `Wait`, `Breath`)
- `Walk` (`Walking`, `Run`)
- `Wave` (`Greet`, `Greeting`, `Hello`)
- `Talk` (`Speaking`, `Dialogue`)

The model is requested only when the campaign-ending panel opens. If the file is missing, larger than 3 MiB, or cannot be rendered, the built-in princess silhouette remains visible.
