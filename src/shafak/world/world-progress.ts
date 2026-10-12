import { WORLD_GATE_INTERVAL_METERS } from "./movement.ts";
import { getWorldChapter } from "./world-content.ts";

export type WorldProgress = {
  distance: number;
  depth: number;
  unlockedThroughChapter: number;
};

export const WORLD_GATE_STOP_OFFSET_METERS = 2.8;
export const WORLD_GATE_INTERACTION_RANGE_METERS = 12;

const WORLD_PROGRESS_KEY = "shafak-world-progress-v1";
const emptyWorldProgress = (): WorldProgress => ({
  distance: 0,
  depth: 0,
  unlockedThroughChapter: 0,
});

function storageKeyFor(userId?: string) {
  return `${WORLD_PROGRESS_KEY}:${userId || "guest"}`;
}

export function normalizeWorldProgress(value: unknown): WorldProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyWorldProgress();
  }
  const saved = value as Partial<WorldProgress>;
  const distance = typeof saved.distance === "number" && Number.isFinite(saved.distance)
    ? Math.max(0, saved.distance)
    : 0;
  const depth = typeof saved.depth === "number" && Number.isFinite(saved.depth)
    ? Math.max(-1, Math.min(1, saved.depth))
    : 0;
  const savedUnlock = typeof saved.unlockedThroughChapter === "number"
    && Number.isSafeInteger(saved.unlockedThroughChapter)
    ? Math.max(0, saved.unlockedThroughChapter)
    : 0;

  // A saved location beyond a chapter boundary proves that its gate was passed.
  const passedChapters = Math.floor(distance / WORLD_GATE_INTERVAL_METERS);
  return {
    distance,
    depth,
    unlockedThroughChapter: Math.max(savedUnlock, passedChapters),
  };
}

export function readWorldProgress(userId?: string): WorldProgress {
  try {
    const raw = globalThis.localStorage?.getItem(storageKeyFor(userId));
    return normalizeWorldProgress(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyWorldProgress();
  }
}

export function saveWorldProgress(progress: WorldProgress, userId?: string) {
  try {
    globalThis.localStorage?.setItem(
      storageKeyFor(userId),
      JSON.stringify(normalizeWorldProgress(progress)),
    );
  } catch {
    // Keep the current run playable when browser storage is unavailable.
  }
}

export function inferWorldProgressFromDefeatedOpponents(
  progress: WorldProgress,
  defeatedOpponentIds: readonly string[],
): WorldProgress {
  const chapterCache = new Map<number, ReturnType<typeof getWorldChapter>>();
  let furthestDistance = -1;
  let furthestChapter = -1;

  for (const id of defeatedOpponentIds) {
    const match = /^ash-road:(\d+):rival:(\d+)$/.exec(id);
    if (!match) continue;
    const chapterId = Number(match[1]);
    const rivalIndex = Number(match[2]);
    if (!Number.isSafeInteger(chapterId) || !Number.isSafeInteger(rivalIndex)) continue;

    let chapter = chapterCache.get(chapterId);
    if (!chapter) {
      try {
        chapter = getWorldChapter(chapterId);
      } catch {
        continue;
      }
      chapterCache.set(chapterId, chapter);
    }
    const rival = chapter.rivals[rivalIndex];
    if (!rival || rival.id !== id || rival.distance <= furthestDistance) continue;
    furthestDistance = rival.distance;
    furthestChapter = chapterId;
  }

  if (furthestDistance < 0) return progress;
  return normalizeWorldProgress({
    ...progress,
    distance: Math.max(progress.distance, furthestDistance + 2),
    unlockedThroughChapter: Math.max(progress.unlockedThroughChapter, furthestChapter),
  });
}

export function unlockWorldGate(
  progress: WorldProgress,
  chapterId: number,
  roomCleared: boolean,
): WorldProgress {
  if (!roomCleared || chapterId !== progress.unlockedThroughChapter) return progress;
  return {
    ...progress,
    unlockedThroughChapter: chapterId + 1,
  };
}

export function limitWorldDistanceAtGate(
  currentDistance: number,
  nextDistance: number,
  unlockedThroughChapter: number,
): number {
  const current = Number.isFinite(currentDistance) ? Math.max(0, currentDistance) : 0;
  const next = Number.isFinite(nextDistance) ? Math.max(0, nextDistance) : current;
  const chapterId = Math.floor(current / WORLD_GATE_INTERVAL_METERS);
  if (chapterId < unlockedThroughChapter) return next;

  const stopDistance =
    (chapterId + 1) * WORLD_GATE_INTERVAL_METERS - WORLD_GATE_STOP_OFFSET_METERS;
  return Math.min(next, stopDistance);
}
