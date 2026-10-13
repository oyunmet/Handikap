export function isIOSDevice(userAgent: string, platform: string, maxTouchPoints = 0) {
  return /iPhone|iPad|iPod/i.test(userAgent)
    || (platform === "MacIntel" && maxTouchPoints > 1);
}
