import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const readProjectFile = (path) => readFileSync(resolve(projectRoot, path), "utf8");

test("the duel touch UI exposes its four combat actions plus dodge and jump", () => {
  const component = readProjectFile("src/shafak/game/DuelControls.tsx");
  const styles = readProjectFile("src/shafak/game/world-duel-controls.css");

  assert.equal((component.match(/<HeldButton/g) ?? []).length, 6);
  assert.match(component, /button=\{INPUT_BUTTON\.attack\}[\s\S]*?label="SALDIRI"/);
  assert.match(component, /button=\{INPUT_BUTTON\.skillTwo\}[\s\S]*?label="YILDIRIM"/);
  assert.match(component, /button=\{INPUT_BUTTON\.skillOne\}[\s\S]*?label="ATEŞ"/);
  assert.match(component, /button=\{INPUT_BUTTON\.block\}[\s\S]*?label="KALKAN"/);
  assert.match(component, /button=\{INPUT_BUTTON\.dodge\}[\s\S]*?label="KAÇIŞ"[\s\S]*?icon="dodge"/);
  assert.match(component, /button=\{INPUT_BUTTON\.jump\}[\s\S]*?label="ZIPLA"[\s\S]*?icon="jump"/);
  assert.match(component, /Kaçış için 20 dayanıklılık gerekli/);
  assert.match(component, /Sıçrama için 12 dayanıklılık gerekli/);

  assert.match(component, /duel-control-cluster__actions/);
  assert.match(styles, /grid-template-areas:\s*"lightning fire attack"\s*"dodge jump shield"/);
  assert.match(styles, /grid-area:\s*lightning/);
  assert.match(styles, /grid-area:\s*dodge/);
  assert.match(styles, /grid-area:\s*jump/);
  assert.match(styles, /grid-area:\s*shield/);
  assert.match(styles, /grid-area:\s*fire/);
  assert.match(styles, /grid-area:\s*attack/);
});

test("the six touch buttons have usable portrait and landscape hit areas", () => {
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
  assert.match(portraitStyles, /grid-template-columns:\s*repeat\(3,\s*56px\)/);
  assert.match(landscapeStyles, /grid-template-columns:\s*repeat\(3,\s*50px\)/);
  assert.match(styles, /env\(safe-area-inset-(?:left|right|bottom)\)/);
});

test("the duel scene passes jump readiness and combat input to its touch controls", () => {
  const worldScene = readProjectFile("src/shafak/world/WorldScene.tsx");
  const controlsCall = worldScene.match(/<DuelControls[\s\S]*?\/>/)?.[0];
  assert.ok(controlsCall, "the fight scene should render its touch controls");
  assert.match(controlsCall, /skillOneSeconds=/);
  assert.match(controlsCall, /skillTwoSeconds=/);
  assert.match(controlsCall, /attackCooldownSeconds=/);
  assert.match(controlsCall, /jumpCooldownSeconds=/);
  assert.match(controlsCall, /onPress=/);
  assert.match(controlsCall, /onRelease=/);
  assert.match(controlsCall, /onMove=/);
  assert.doesNotMatch(controlsCall, /quickItems|weaponNames|onSurrender|onOpenHelp|onRotateCamera/);
});

test("keyboard users can use shift for dodge and x for jump", () => {
  const worldScene = readProjectFile("src/shafak/world/WorldScene.tsx");
  assert.match(worldScene, /shift:\s*INPUT_BUTTON\.dodge/);
  assert.match(worldScene, /x:\s*INPUT_BUTTON\.jump/);
  assert.match(worldScene, /INPUT_BUTTON\.dodge,[\s\S]*?INPUT_BUTTON\.jump/);
});

test("duel controls load their mobile overrides after the base world scene styles", () => {
  const worldScene = readProjectFile("src/shafak/world/WorldScene.tsx");
  assert.match(worldScene, /import "\.\/world-scene\.css";[\s\S]*import "\.\.\/game\/world-duel-controls\.css";/);
});
