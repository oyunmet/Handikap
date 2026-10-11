const CHAPTER_MUSIC_NOTES = [
  [55, 82.41, 110],
  [61.74, 92.5, 123.47],
  [73.42, 110, 146.83],
] as const;

export function getChapterMusicNotes(chapterId: number): readonly [number, number, number] {
  const safeChapter = Number.isFinite(chapterId) ? Math.max(0, Math.floor(chapterId)) : 0;
  return CHAPTER_MUSIC_NOTES[safeChapter % CHAPTER_MUSIC_NOTES.length];
}
