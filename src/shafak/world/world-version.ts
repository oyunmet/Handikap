export type WorldVersion = "v2";

export function worldVersionFromSearch(_search: string): WorldVersion {
  return "v2";
}

export function shouldStartInWorld(search: string): boolean {
  const query = new URLSearchParams(search);
  return query.get("selftest") === "1"
    || query.get("world") === "v2"
    || (query.get("debug") === "1" && query.get("scene") === "world");
}
