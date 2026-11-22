import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const worldStyles = await readFile(new URL("./world-v2.css", import.meta.url), "utf8");
const warRoomStyles = await readFile(new URL("../game/war-room.css", import.meta.url), "utf8");

test("campaign DOM layers leave the shared WebGL canvas visible", () => {
  assert.match(
    worldStyles,
    /\.world-3d-layer\s*\{[^}]*background:\s*transparent;/s,
  );
});

test("tactical battle backgrounds do not cover the shared WebGL canvas", () => {
  assert.match(
    warRoomStyles,
    /\.war-room\[data-phase="battle"\]\s*\{[^}]*background:\s*transparent;/s,
  );
  assert.match(
    warRoomStyles,
    /\.war-room-battle\s*\{[^}]*background:\s*transparent;/s,
  );
});
