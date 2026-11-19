export interface ObjectPoolOptions<T extends object> {
  create: () => T;
  reset: (value: T) => void;
  capacity: number;
}

export interface ObjectPool<T extends object> {
  acquire(): T | undefined;
  release(value: T): boolean;
  clear(): void;
  forEachActive(callback: (value: T) => void): void;
  readonly activeCount: number;
  readonly allocatedCount: number;
  readonly availableCount: number;
}

export function createObjectPool<T extends object>(options: ObjectPoolOptions<T>): ObjectPool<T> {
  if (!Number.isInteger(options.capacity) || options.capacity < 1) {
    throw new RangeError("Object pool capacity must be a positive integer.");
  }

  const free: T[] = [];
  const active: T[] = [];
  let activeIndices = new WeakMap<T, number>();
  let allocatedCount = 0;

  return {
    acquire() {
      let value = free.pop();
      if (!value) {
        if (allocatedCount >= options.capacity) return undefined;
        value = options.create();
        allocatedCount += 1;
      }
      activeIndices.set(value, active.length);
      active.push(value);
      return value;
    },
    release(value) {
      const index = activeIndices.get(value);
      if (index === undefined) return false;
      const last = active.pop();
      activeIndices.delete(value);
      if (last && index < active.length) {
        active[index] = last;
        activeIndices.set(last, index);
      }
      options.reset(value);
      free.push(value);
      return true;
    },
    clear() {
      for (const value of active) options.reset(value);
      for (const value of free) options.reset(value);
      active.length = 0;
      free.length = 0;
      activeIndices = new WeakMap<T, number>();
      allocatedCount = 0;
    },
    forEachActive(callback) {
      for (let index = 0; index < active.length; index += 1) {
        const value = active[index];
        if (value) callback(value);
      }
    },
    get activeCount() {
      return active.length;
    },
    get allocatedCount() {
      return allocatedCount;
    },
    get availableCount() {
      return free.length;
    },
  };
}
