import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { tr } from "./tr.ts";
import { getCampaignCopy } from "./campaign-copy.ts";
import { CAMPAIGN_ACT_COUNT, CAMPAIGN_LEVEL_COUNT } from "../world/campaign-progression.ts";
import { loadCampaignActData } from "../world/campaign-level-data.ts";

const staleCampaignCopy = /\b12 bölüm\b|\b3 bölge\b|\büç bölge\b/i;

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    if (!/\.(ts|tsx|html|json|md)$/.test(entry.name) || /\.test\.(js|ts)$/.test(entry.name)) return [];
    return [path];
  });
}

test("menu campaign title is generated from the campaign counts", () => {
  assert.equal(tr.menuKicker, "KUZEY İLERİ ÜSSÜ · 9 OPERASYON");
  assert.match(tr.menuKicker, new RegExp(`${CAMPAIGN_ACT_COUNT} OPERASYON`));
  assert.equal(CAMPAIGN_LEVEL_COUNT, 450);
});

test("campaign copy changes when campaign data counts change", () => {
  const copy = getCampaignCopy(8, 400);
  assert.equal(copy.menuKicker, "KUZEY İLERİ ÜSSÜ · 8 OPERASYON");
  assert.match(copy.openingDescription, /8 operasyona yayılan/);
  assert.match(copy.openingDescription, /400 bölüm/);
  assert.equal(copy.finalChapterLabel, "BÖLÜM 400 · SON İSTİHBARAT DOSYASI");
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
