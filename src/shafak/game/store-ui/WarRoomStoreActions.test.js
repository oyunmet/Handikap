import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import WarRoomStoreActions from "./WarRoomStoreActions.tsx";

function renderActions(overrides = {}) {
  return renderToStaticMarkup(createElement(WarRoomStoreActions, {
    itemId: "war_room_blaster_r",
    primaryEquipped: false,
    secondaryEquipped: false,
    disabled: false,
    busy: false,
    onEquip() {},
    ...overrides,
  }));
}

test("owned War Room store item offers separate main and reserve equip actions", () => {
  const markup = renderActions();

  assert.match(markup, /ANA YUVA · KUŞAN/);
  assert.match(markup, /YEDEK YUVA · KUŞAN/);
  assert.equal((markup.match(/<button/g) ?? []).length, 2);
});

test("an already equipped War Room slot is announced and cannot be reselected", () => {
  const markup = renderActions({ primaryEquipped: true });

  assert.match(markup, /ANA YUVA · KUŞANILDI/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /YEDEK YUVA · KUŞAN/);
});
