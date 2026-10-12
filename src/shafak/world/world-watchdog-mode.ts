export function isWorldWatchdogEnabled(search: string): boolean {
  const mode = new URLSearchParams(search).get("watchdog");
  return mode === "on";
}
