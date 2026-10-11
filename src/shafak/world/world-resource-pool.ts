export type DisposableResource = {
  dispose?: () => void;
};

export type ResourceLease<T> = {
  value: T;
  release: () => void;
};

type ResourceEntry<T> = {
  value: T;
  references: number;
  dispose: (value: T) => void;
};

export class WorldResourcePool {
  private readonly entries = new Map<string, ResourceEntry<unknown>>();

  acquire<T extends DisposableResource>(
    key: string,
    create: () => T,
    dispose: (value: T) => void = (value) => value.dispose?.(),
  ): ResourceLease<T> {
    let entry = this.entries.get(key) as ResourceEntry<T> | undefined;
    if (!entry) {
      entry = { value: create(), references: 0, dispose };
      this.entries.set(key, {
        value: entry.value,
        references: entry.references,
        dispose: (value) => dispose(value as T),
      });
      entry = this.entries.get(key) as ResourceEntry<T>;
    }
    entry.references += 1;

    let released = false;
    return {
      value: entry.value,
      release: () => {
        if (released) return;
        released = true;
        const current = this.entries.get(key) as ResourceEntry<T> | undefined;
        if (!current || current.value !== entry?.value) return;
        current.references = Math.max(0, current.references - 1);
        if (current.references === 0) {
          this.entries.delete(key);
          current.dispose(current.value);
        }
      },
    };
  }

  getReferenceCount(key: string): number {
    return this.entries.get(key)?.references ?? 0;
  }

  get size(): number {
    return this.entries.size;
  }
}

export class WorldResourceScope {
  private readonly releases: Array<() => void> = [];
  private disposed = false;

  borrow<T extends DisposableResource>(
    pool: WorldResourcePool,
    key: string,
    create: () => T,
    dispose?: (value: T) => void,
  ): T {
    if (this.disposed) throw new Error("Cannot add a resource to a disposed world scope.");
    const lease = pool.acquire(key, create, dispose);
    this.releases.push(lease.release);
    return lease.value;
  }

  own<T>(resource: T, dispose: (resource: T) => void): T {
    if (this.disposed) throw new Error("Cannot add a resource to a disposed world scope.");
    this.releases.push(() => dispose(resource));
    return resource;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (let index = this.releases.length - 1; index >= 0; index -= 1) {
      this.releases[index]();
    }
    this.releases.length = 0;
  }
}
