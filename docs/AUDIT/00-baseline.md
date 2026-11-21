# SUNVORIA audit baseline

Date: 2026-11-22

## Environment and repository

| Measurement | Result |
|---|---|
| Node.js / npm | v20.20.0 / 10.8.2 |
| `npm ci` | Passed; 468 packages installed in about 31 s |
| npm install advisory summary | 4 moderate vulnerabilities; deprecated `glob@10.5.0` warning |
| Initial working tree | Clean |
| HEAD | `520d1dc` (`Add tactical menu generated image`); shallow/grafted history exposes one commit |
| Git object pack | 764.91 MiB |
| `public/` | 17 MiB |
| `attached_assets/` | 1.4 GiB |
| `screenshots/` | 352 KiB |
| `artifacts/` | 1.7 MiB |
| `.agents/` | 156 KiB |
| `node_modules/` after install | 588 MiB |

The requested remote tag push was not performed. This project keeps GitHub pushes and deployments under the user's control.

## Checks

| Check | Result |
|---|---|
| `npm run typecheck` | Passed; 0 reported errors (`00-typecheck.txt`) |
| `npm test` | Passed; 830 passed, 0 failed, 53.2 s (`00-test.txt`) |
| `npm run build` | Passed; Vite 8.3.8, 2.95 s wall time (`00-build.txt`) |
| `dist/` | 23 MiB |
| Largest source-code JS output | 719,410 bytes; Draco decoder |

## Largest built JavaScript files

| Bytes | File |
|---:|---|
| 719,410 | `dist/assets/draco_decoder-fzg4nYZr.js` |
| 512,465 | `dist/assets/draco/draco_decoder.js` |
| 378,339 | `dist/assets/vendor~GuestGame~App~PrincessModelReveal-BWNxJ9nF.js` |
| 366,784 | `dist/assets/vendor~GuestGame~App~PrincessModelReveal-2eXaYp3I.js` |
| 304,585 | `dist/assets/WarRoomGame-BY9wnPfr.js` |
| 238,154 | `dist/assets/WorldScene-BB8jSFpJ.js` |
| 209,247 | `dist/assets/vendor~index-CMQX89SQ.js` |
| 175,261 | `dist/assets/vendor~GuestGame~App~PrincessModelReveal-Cl0_y5Ay.js` |
| 143,632 | `dist/assets/vendor~index-D96aYa0E.js` |
| 134,443 | `dist/assets/World3D-BhGLyC2y.js` |

## Largest public GLB/image files

| Bytes | File |
|---:|---|
| 3,053,500 | `public/assets/treasure-chest.glb` |
| 2,902,684 | `public/models/kuzgun-soldier.glb` |
| 2,261,136 | `public/models/base-character.glb` |
| 1,419,904 | `public/assets/wooden-barrel.glb` |
| 698,560 | `public/models/human.glb` |
| 660,208 | `public/models/player-hero.glb` |
| 618,760 | `public/assets/rock-wall.glb` |
| 435,897 | `public/icons/icon-512.png` |
| 435,897 | `public/icons/icon-512-maskable.png` |
| 378,240 | `public/models/gece-nobetcisi.glb` |

## Source files over 300 lines

There are 70 source files over 300 lines (86,468 total lines across the measured source files). This is an inventory only; no files were rewritten.

```text
5668 src/shafak/world/WarRoomScene3D.tsx
4174 src/shafak/world/WorldScene.tsx
3105 src/shafak/world/World3D.tsx
2459 src/shafak/game/WarRoomGame.tsx
1835 src/shafak/App.tsx
1344 src/shafak/world/WorldElements.tsx
1266 src/shafak/game/combat-engine.ts
1098 src/shafak/world/KnightActor.tsx
1032 src/shafak/world/WorldLandscape.tsx
1018 src/shafak/world/WorldRoadEntities.tsx
949 src/shafak/game/war-room-engine.ts
941 src/shafak/game/war-room-data.ts
919 server/profileApi.ts
862 src/shafak/game/store-ui/StorePanel.tsx
744 src/shafak/world/world-road-environment.ts
742 src/shafak/world/WarRoomInteriors.tsx
727 src/shafak/world/opponent-costume.ts
721 src/shafak/world/WarRoomArchitecture.tsx
672 src/shafak/world/World3DV2.tsx
664 server/storeApi.ts
646 src/shafak/world/world-content.ts
637 src/shafak/world/WarRoomModels.tsx
637 src/shafak/game/combat-engine.test.js
630 src/shafak/world/WorldV2Entities.tsx
628 src/shafak/game/war-room-rooms.ts
623 src/shafak/world/WorldModel.tsx
606 src/shafak/game/war-room-camera.test.js
592 src/shafak/world/CityHubScene.tsx
582 server/duelService.ts
568 src/shafak/game/war-room-camera.ts
562 src/shafak/world/WorldV2Actor.tsx
544 src/shafak/world/procedural-hero.ts
544 src/shafak/world/player-model.test.js
542 src/shafak/world/CityHub.tsx
530 src/ui/GameCanvasHost.tsx
524 src/shafak/world/world-natural-geometry.ts
512 src/shafak/world/EquipmentPreview3D.tsx
505 src/shafak/game/war-room-doors.test.js
489 src/shafak/world/princess-character.ts
485 server/storeApi.test.js
481 src/shafak/game/DuelControls.tsx
478 src/shafak/world/WorldStaticBatches.tsx
459 src/shafak/game/war-room-ai.ts
458 src/shafak/world/character-model.test.js
441 src/shafak/world/WorldScenery.tsx
419 src/shafak/world/character-pose.ts
414 src/data/story.ts
404 src/shafak/world/world-renderer.worker.ts
403 src/shafak/world/WarRoomBattlefield.tsx
400 src/shafak/audio/howler.ts
397 src/shafak/game/war-room-rooms.test.js
397 src/shafak/game/war-room-performance.ts
390 src/shafak/game/war-room-viewmodel.ts
371 src/shafak/game/profile.ts
368 src/shafak/world/character-model.ts
361 src/shafak/world/movement.ts
347 src/shafak/world/WarRoomEnvironment.tsx
346 src/shafak/world/world-content.test.js
342 server/vercel-handler.test.js
341 src/shafak/world/WarRoomVillageSetDressing.tsx
337 server/duelService.test.js
335 src/shafak/world/opponent-model-config.ts
324 src/shafak/game/war-room-quality.ts
322 src/shafak/game/war-room-viewmodel-jitter.test.js
318 src/shafak/world/duel-weapon.ts
318 src/shafak/game/war-room-missions.test.js
310 src/shafak/game/war-room-doors.ts
309 src/shafak/world/model-animation.test.js
305 src/shafak/game/WarRoomBriefing.tsx
301 src/shafak/LegalPages.tsx
```
