import type { StoryDialogue } from "./story-dialogue";

export const STORY_DIALOGUE_SEEN_STORAGE_KEY = "shafak-story-dialogues-seen-v1";

export function parseSeenStoryDialogueIds(serialized: string | null) {
  if (!serialized) return [];
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0 && id.length <= 160,
    ))];
  } catch {
    return [];
  }
}

export function markStoryDialogueSeen(seenIds: readonly string[], id: string) {
  return [...new Set([...seenIds, id])];
}

export function shouldShowFirstEntryStoryDialogue(
  dialogue: Pick<StoryDialogue, "id" | "kind">,
  seenIds: readonly string[],
  hasInitialStoreTab = false,
) {
  if (dialogue.kind === "opening" && hasInitialStoreTab) return false;
  if (dialogue.kind === "npc") return true;
  return !seenIds.includes(dialogue.id);
}
