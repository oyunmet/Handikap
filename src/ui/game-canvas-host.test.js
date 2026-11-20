import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function listUiSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return listUiSourceFiles(entryPath);
    if (!/\.(jsx|tsx)$/.test(entry.name)) return [];
    return [entryPath];
  });
}

test("all 3D views share the single canvas mounted by the app shell", () => {
  const sourceFiles = listUiSourceFiles(resolve(projectRoot, "src"));
  const canvasOwners = sourceFiles.filter((filePath) => {
    const source = readFileSync(filePath, "utf8");
    return /<Canvas\b/.test(source);
  });

  assert.deepEqual(
    canvasOwners.map((filePath) => relative(projectRoot, filePath)),
    ["src/ui/GameCanvasHost.tsx"],
  );

  const shell = readFileSync(resolve(projectRoot, "src/ui/GameShell.tsx"), "utf8");
  const app = readFileSync(resolve(projectRoot, "src/shafak/App.tsx"), "utf8");
  assert.match(shell, /<GameCanvasProvider>/);
  assert.match(shell, /<GameCanvasStage\s*\/>/);
  assert.match(app, /<GameShell\b/);
});

test("legacy 3D scenes register viewports instead of mounting extra canvases", () => {
  const scenes = [
    "src/shafak/world/CityHubScene.tsx",
    "src/shafak/world/EquipmentPreview3D.tsx",
    "src/shafak/world/PrincessModelReveal.tsx",
    "src/shafak/world/WarRoomScene3D.tsx",
    "src/shafak/world/World3D.tsx",
    "src/shafak/world/World3DV2.tsx",
  ];

  for (const scenePath of scenes) {
    const source = readFileSync(resolve(projectRoot, scenePath), "utf8");
    assert.match(source, /<GameCanvas\b/, `${scenePath} should use the shared host`);
    assert.doesNotMatch(source, /<Canvas\b/, `${scenePath} must not mount a canvas`);
  }
});

test("shared 3D renderer recovery remounts the app canvas", () => {
  const host = readFileSync(resolve(projectRoot, "src/ui/GameCanvasHost.tsx"), "utf8");
  assert.match(host, /export function useCanvasRendererRecovery\(\)/);
  assert.match(host, /recoverRenderer = useCallback/);
  assert.match(host, /key=\{context\.rendererResetVersion\}/);
});

test("the shared canvas remeasures when a scene reuses its ID with a new viewport", () => {
  const host = readFileSync(resolve(projectRoot, "src/ui/GameCanvasHost.tsx"), "utf8");
  assert.match(host, /viewportIdsByElementRef/);
  assert.match(host, /requestTargetKey/);
  assert.match(host, /\[requestIds, requestTargetKey\]/);
});

test("changing scene children updates the request without unregistering the shared canvas", () => {
  const host = readFileSync(resolve(projectRoot, "src/ui/GameCanvasHost.tsx"), "utf8");
  assert.match(host, /CanvasHostActionsContext/);
  assert.match(host, /useRequiredCanvasActions\(\)/);
  assert.match(host, /const latestRequestRef = useRef\(request\)/);
  assert.match(host, /const registeredRequestRef = useRef<CanvasRequest \| null>\(null\)/);
  assert.match(host, /if \(registeredRequestRef\.current === request\) return/);
  assert.match(host, /context\.register\(request\)/);
  assert.match(host, /context\.unregister\(id\)/);
});
