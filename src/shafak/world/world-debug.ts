export type WorldDebugConfig = {
  enabled: boolean;
  startDistance: number;
  autoWalk: boolean;
};

export function readWorldDebugConfig(search: string, development: boolean): WorldDebugConfig {
  if (!development) return { enabled: false, startDistance: 0, autoWalk: false };
  const params = new URLSearchParams(search);
  const enabled = params.get("worldDebug") === "1";
  const requestedDistance = Number(params.get("worldDistance") ?? 0);
  return {
    enabled,
    startDistance: enabled && Number.isFinite(requestedDistance)
      ? Math.max(0, Math.min(143, requestedDistance))
      : 0,
    autoWalk: enabled && params.get("worldAutoWalk") === "1",
  };
}
