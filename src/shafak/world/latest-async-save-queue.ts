export type SaveQueueOptions = {
  immediate?: boolean;
};

type PendingSave<T> = {
  value: T;
  immediate: boolean;
};

export function createLatestAsyncSaveQueue<T>(
  save: (value: T) => Promise<void>,
  minimumIntervalMs = 3_000,
) {
  let pending: PendingSave<T> | null = null;
  let saving = false;
  let lastStartedAt = Number.NEGATIVE_INFINITY;
  let scheduled: ReturnType<typeof setTimeout> | null = null;

  const run = async () => {
    if (saving || !pending) return;
    const current = pending;
    pending = null;
    saving = true;
    lastStartedAt = Date.now();
    let succeeded = false;

    try {
      await save(current.value);
      succeeded = true;
    } catch {
      // Keep the latest snapshot locally queued so a later update can retry it.
    } finally {
      saving = false;
      if (!succeeded && !pending) pending = current;
      if (pending && (succeeded || pending !== current)) schedule();
    }
  };

  function schedule() {
    if (saving || !pending) return;
    const waitMs = pending.immediate
      ? 0
      : Math.max(0, minimumIntervalMs - (Date.now() - lastStartedAt));
    if (waitMs === 0) {
      if (scheduled !== null) clearTimeout(scheduled);
      scheduled = null;
      void run();
      return;
    }
    if (scheduled !== null) return;
    scheduled = setTimeout(() => {
      scheduled = null;
      void run();
    }, waitMs);
  }

  return {
    enqueue(value: T, options: SaveQueueOptions = {}) {
      pending = {
        value,
        immediate: Boolean(options.immediate || pending?.immediate),
      };
      if (pending.immediate && scheduled !== null) {
        clearTimeout(scheduled);
        scheduled = null;
      }
      schedule();
    },
  };
}
