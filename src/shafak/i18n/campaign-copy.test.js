import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { tr } from "./tr.ts";
import { getCampaignCopy } from "./campaign-copy.ts";
import { CAMPAIGN_ACT_COUNT, CAMPAIGN_LEVEL_COUNT } from "../world/campaign-progression.ts";
import { loadCampaignActData } from "../world/campaign-level-data.ts";

const staleCampaignCopy = /dokuz kapı|dokuzuncu kapı|dokuzuncu bölüm|üç bölge|3 bölge|12 bölüm/i;

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    if (!/\.(ts|tsx|html|json|md)$/.test(entry.name) || /\.test\.(js|ts)$/.test(entry.name)) return [];
    return [path];
  });
}

test("menu campaign title is generated from the campaign counts", () => {
  assert.equal(tr.menuKicker, `${CAMPAIGN_ACT_COUNT} PERDE · ${CAMPAIGN_LEVEL_COUNT} BÖLÜM`);
});

test("campaign copy changes when campaign data counts change", () => {
  const copy = getCampaignCopy(8, 400);
  assert.equal(copy.menuKicker, "8 PERDE · 400 BÖLÜM");
  assert.match(copy.openingDescription, /8 perde/);
  assert.match(copy.openingDescription, /400 bölüm/);
  assert.equal(copy.finalChapterLabel, "BÖLÜM 400 · SON PERDE");
});

test("all campaign acts provide a short story summary for the main menu", async () => {
  for (let actNumber = 1; actNumber <= CAMPAIGN_ACT_COUNT; actNumber += 1) {
    const act = await loadCampaignActData(actNumber);
    assert.ok(act.storySummary?.trim(), `${act.name} needs a story summary`);
    assert.ok(act.storySummary.length <= 140, `${act.name} story summary should fit in the menu`);
  }
});

test("active app and project copy no longer contains obsolete campaign counts", () => {
  const directories = [
    new URL("../", import.meta.url),
    new URL("../../../public/", import.meta.url),
    new URL("../../../docs/", import.meta.url),
  ];
  const rootReadme = new URL("../../../README.md", import.meta.url);
  const files = directories.flatMap((url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/docs/")) {
      return collectSourceFiles(path).filter((file) => !file.endsWith("/ILERLEME.md") && !file.endsWith("/PROGRESS.md"));
    }
    return collectSourceFiles(path);
  });

  files.push(rootReadme.pathname);
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    assert.doesNotMatch(content, staleCampaignCopy, `${file} contains obsolete campaign copy`);
  }
});
