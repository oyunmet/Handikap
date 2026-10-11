export type WorldVersion = "legacy" | "v2";

export function worldVersionFromSearch(search: string): WorldVersion {
  return new URLSearchParams(search).get("world") === "v2" ? "v2" : "legacy";
}

export function shouldStartInWorld(search: string): boolean {
  const query = new URLSearchParams(search);
  return query.get("selftest") === "1"
    || worldVersionFromSearch(search) === "v2"
    || (query.get("debug") === "1" && query.get("scene") === "world");
}
