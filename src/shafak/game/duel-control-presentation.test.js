import assert from "node:assert/strict";
import test from "node:test";
import { getDuelAttackPresentation } from "./duel-control-presentation.ts";

test("close-range bows clearly switch the attack label to knife", () => {
  const presentation = getDuelAttackPresentation({
    weaponName: "Avcı Yayı",
    isBowActive: true,
    bowCloseRange: true,
    ammoCount: 4,
  });

  assert.equal(presentation.label, "BIÇAK");
  assert.equal(presentation.description, "Av bıçağıyla yakın menzil saldırısı");
  assert.equal(presentation.isDagger, true);
  assert.equal(presentation.ammoEmpty, false);
});

test("dagger weapons use the knife label, including Turkish hançer names", () => {
  const presentation = getDuelAttackPresentation({
    weaponName: "İkiz Hançerler",
    isBowActive: false,
    bowCloseRange: false,
    ammoCount: null,
  });

  assert.equal(presentation.label, "BIÇAK");
  assert.equal(presentation.isDagger, true);
  assert.match(presentation.description, /Bıçakla saldır/);
});

test("ranged attack clearly shows when ammunition is empty", () => {
  const presentation = getDuelAttackPresentation({
    weaponName: "Avcı Yayı",
    isBowActive: true,
    bowCloseRange: false,
    ammoCount: 0,
  });

  assert.equal(presentation.label, "OK YOK");
  assert.equal(presentation.ammoEmpty, true);
});

test("ordinary melee weapons keep the standard attack label", () => {
  const presentation = getDuelAttackPresentation({
    weaponName: "Kül Kılıcı",
    isBowActive: false,
    bowCloseRange: false,
    ammoCount: null,
  });

  assert.equal(presentation.label, "SALDIRI");
  assert.equal(presentation.isDagger, false);
});
