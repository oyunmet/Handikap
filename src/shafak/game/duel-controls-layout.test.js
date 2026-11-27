import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("duel action buttons use grid positions instead of legacy absolute offsets", () => {
  const styles = readFileSync(resolve(projectRoot, "src/shafak/game/world-duel-controls.css"), "utf8");
  const buttonRuleStart = styles.indexOf(".duel-controls--field .duel-control-cluster .duel-control.game-button {");
  assert.notEqual(buttonRuleStart, -1);
  const buttonRule = styles.slice(buttonRuleStart, styles.indexOf("\n}", buttonRuleStart));
  assert.match(buttonRule, /position:\s*relative/);
  assert.match(buttonRule, /inset:\s*auto\s*!important/);

  const utilityRuleStart = styles.indexOf(".duel-controls--field .duel-utility-toggle {");
  assert.notEqual(utilityRuleStart, -1);
  const utilityRule = styles.slice(utilityRuleStart, styles.indexOf("\n}", utilityRuleStart));
  assert.match(utilityRule, /inset:\s*auto\s*!important/);
  assert.match(utilityRule, /transform:\s*none/);

  const portraitStart = styles.indexOf("@media (max-width: 760px) and (orientation: portrait)");
  assert.notEqual(portraitStart, -1);
  const portraitStyles = styles.slice(portraitStart);
  assert.match(portraitStyles, /grid-template-columns:\s*54px 64px/);
  assert.match(portraitStyles, /right:\s*max\(20px,\s*calc\(env\(safe-area-inset-right\)\s*\+\s*16px\)\)/);
});

test("duel controls load their mobile overrides after the base world scene styles", () => {
  const worldScene = readFileSync(resolve(projectRoot, "src/shafak/world/WorldScene.tsx"), "utf8");
  assert.match(worldScene, /import "\.\/world-scene\.css";[\s\S]*import "\.\.\/game\/world-duel-controls\.css";/);
});
