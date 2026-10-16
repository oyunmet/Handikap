import * as THREE from "three";

export function createRuggedMountainGeometry(seed: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const noise = vertexNoise(x, y, z, seed);
    const angle = Math.atan2(z, x);
    const ridge = Math.sin(angle * 3.2 + seed * 0.001) * 0.08
      + Math.sin(angle * 5.1 - seed * 0.0007) * 0.035;
    const radius = 0.91 + noise * 0.16 + ridge;
    const height = y * (0.9 + noise * 0.24) + (noise - 0.5) * 0.065;

    positions.setXYZ(index, x * radius, height, z * radius);

    const heightShade = THREE.MathUtils.clamp((height + 1) * 0.5, 0, 1);
    const ashVein = noise > 0.83 && heightShade > 0.52 ? 0.12 : 0;
    const shade = THREE.MathUtils.clamp(0.54 + heightShade * 0.34 + ashVein, 0.4, 1);
    colors[index * 3] = shade;
    colors[index * 3 + 1] = shade * 0.98;
    colors[index * 3 + 2] = shade * 0.96;
  }

  positions.needsUpdate = true;
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const rugged = geometry.toNonIndexed();
  geometry.dispose();
  rugged.computeVertexNormals();
  return rugged;
}

function vertexNoise(x: number, y: number, z: number, seed: number) {
  const value = Math.sin(
    (Math.round(x * 100) + seed * 0.13) * 127.1
    + (Math.round(y * 100) - seed * 0.07) * 311.7
    + (Math.round(z * 100) + seed * 0.19) * 74.7,
  ) * 43_758.5453;
  return value - Math.floor(value);
}
