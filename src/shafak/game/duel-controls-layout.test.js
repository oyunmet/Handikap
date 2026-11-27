import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const readProjectFile = (path) => readFileSync(resolve(projectRoot, path), "utf8");

test("the duel touch UI exposes attack, lightning, fire, and shield", () => {
  const component = readProjectFile("src/shafak/game/DuelControls.tsx");
  const styles = readProjectFile("src/shafak/game/world-duel-controls.css");

  assert.equal((component.match(/<HeldButton/g) ?? []).length, 4);
  assert.match(component, /button=\{INPUT_BUTTON\.attack\}[\s\S]*?label="SALDIRI"/);
  assert.match(component, /button=\{INPUT_BUTTON\.skillTwo\}[\s\S]*?label="YILDIRIM"/);
  assert.match(component, /button=\{INPUT_BUTTON\.skillOne\}[\s\S]*?label="ATEŞ"/);
  assert.match(component, /button=\{INPUT_BUTTON\.block\}[\s\S]*?label="KALKAN"/);
  assert.doesNotMatch(component, /INPUT_BUTTON\.(?:jump|dodge|weaponSwitch|quickSlot)/);
  assert.doesNotMatch(component, /ZIPLA|DİĞER|OTHER|utility/i);

  assert.match(component, /duel-control-cluster__actions/);
  assert.match(styles, /grid-template-areas:\s*"lightning shield"\s*"fire attack"/);
  assert.match(styles, /grid-area:\s*lightning/);
  assert.match(styles, /grid-area:\s*shield/);
  assert.match(styles, /grid-area:\s*fire/);
  assert.match(styles, /grid-area:\s*attack/);
});

test("the four touch buttons have usable portrait and landscape hit areas", () => {
  const styles = readProjectFile("src/shafak/game/world-duel-controls.css");

  const portraitStart = styles.indexOf("@media (max-width: 760px) and (orientation: portrait)");
  const landscapeStart = styles.indexOf("@media (max-width: 760px) and (orientation: landscape)");
  assert.notEqual(portraitStart, -1);
  assert.notEqual(landscapeStart, -1);
  const portraitStyles = styles.slice(portraitStart, landscapeStart);
  const landscapeStyles = styles.slice(landscapeStart);

  assert.match(portraitStyles, /width:\s*56px\s*!important/);
  assert.match(portraitStyles, /height:\s*56px\s*!important/);
  assert.match(landscapeStyles, /width:\s*50px\s*!important/);
  assert.match(landscapeStyles, /height:\s*50px\s*!important/);
  assert.match(styles, /env\(safe-area-inset-(?:left|right|bottom)\)/);
});

test("the duel scene passes the four intended combat actions to its touch controls", () => {
  const worldScene = readProjectFile("src/shafak/world/WorldScene.tsx");
  const controlsCall = worldScene.match(/<DuelControls[\s\S]*?\/>/)?.[0];
  assert.ok(controlsCall, "the fight scene should render its touch controls");
  assert.match(controlsCall, /skillOneSeconds=/);
  assert.match(controlsCall, /skillTwoSeconds=/);
  assert.match(controlsCall, /attackCooldownSeconds=/);
  assert.match(controlsCall, /onPress=/);
  assert.match(controlsCall, /onRelease=/);
  assert.match(controlsCall, /onMove=/);
  assert.doesNotMatch(controlsCall, /quickItems|weaponNames|onSurrender|onOpenHelp|onRotateCamera/);
});

test("duel controls load their mobile overrides after the base world scene styles", () => {
  const worldScene = readProjectFile("src/shafak/world/WorldScene.tsx");
  assert.match(worldScene, /import "\.\/world-scene\.css";[\s\S]*import "\.\.\/game\/world-duel-controls\.css";/);
});
