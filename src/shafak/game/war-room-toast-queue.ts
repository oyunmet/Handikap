export type WarRoomToast = {
  id: number;
  message: string;
};

export const WAR_ROOM_TOAST_LIMIT = 3;

export function appendWarRoomToast(
  queue: readonly WarRoomToast[],
  toast: WarRoomToast,
  limit = WAR_ROOM_TOAST_LIMIT,
): WarRoomToast[] {
  const message = toast.message.trim();
  if (!message || limit <= 0 || queue.some((item) => item.id === toast.id)) {
    return [...queue];
  }

  return [...queue, { ...toast, message }].slice(-limit);
}

export function removeWarRoomToast(
  queue: readonly WarRoomToast[],
  id: number,
): WarRoomToast[] {
  return queue.filter((toast) => toast.id !== id);
}
