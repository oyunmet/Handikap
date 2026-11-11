export type WarRoomAwarenessState = "patrol" | "alert" | "engaged";

export type WarRoomAwarenessUpdate = {
  awareness: number;
  state: WarRoomAwarenessState;
};

export function updateWarRoomAwareness(
  currentAwareness: number,
  deltaSeconds: number,
  perception: { visible: boolean; heardSound: boolean },
): WarRoomAwarenessUpdate {
  const delta = Number.isFinite(deltaSeconds)
    ? Math.max(0, Math.min(0.1, deltaSeconds))
    : 0;
  const current = Number.isFinite(currentAwareness)
    ? Math.max(0, Math.min(1, currentAwareness))
    : 0;
  let awareness = current;

  if (perception.visible) {
    awareness = Math.min(1, awareness + delta * 2.25);
  } else if (perception.heardSound) {
    awareness = Math.min(1, Math.max(awareness, 0.32) + delta * 0.72);
  } else {
    awareness = Math.max(0, awareness - delta * 0.7);
  }

  return {
    awareness,
    state: awareness >= 0.85 ? "engaged" : awareness >= 0.22 ? "alert" : "patrol",
  };
}
