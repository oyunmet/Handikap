import * as THREE from "three";

let glowTexture: THREE.CanvasTexture | null = null;

export function getWorldGlowTexture() {
  if (glowTexture || typeof document === "undefined") return glowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.92)");
  gradient.addColorStop(0.18, "rgba(255,236,197,0.76)");
  gradient.addColorStop(0.48, "rgba(255,186,102,0.28)");
  gradient.addColorStop(1, "rgba(255,138,64,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  glowTexture.generateMipmaps = false;
  glowTexture.minFilter = THREE.LinearFilter;
  glowTexture.magFilter = THREE.LinearFilter;
  return glowTexture;
}
