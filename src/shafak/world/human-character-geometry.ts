import * as THREE from "three";

export type HumanAnatomicalLimb = "upperArm" | "forearm" | "thigh" | "shin" | "finger";

export type FacetedProfileSection = {
  y: number;
  width: number;
  depth: number;
  offsetZ?: number;
};

const LIMB_PROFILES: Record<HumanAnatomicalLimb, readonly FacetedProfileSection[]> = {
  upperArm: [
    { y: -0.5, width: 0.58, depth: 0.62 },
    { y: -0.28, width: 0.78, depth: 0.82 },
    { y: 0.04, width: 0.98, depth: 0.94 },
    { y: 0.28, width: 0.88, depth: 0.84 },
    { y: 0.5, width: 0.68, depth: 0.7 },
  ],
  forearm: [
    { y: -0.5, width: 0.5, depth: 0.58 },
    { y: -0.28, width: 0.72, depth: 0.76 },
    { y: 0.02, width: 0.9, depth: 0.9 },
    { y: 0.3, width: 0.8, depth: 0.84 },
    { y: 0.5, width: 0.64, depth: 0.7 },
  ],
  thigh: [
    { y: -0.5, width: 0.58, depth: 0.64 },
    { y: -0.28, width: 0.82, depth: 0.86 },
    { y: 0.05, width: 1, depth: 1 },
    { y: 0.32, width: 0.92, depth: 0.94 },
    { y: 0.5, width: 0.7, depth: 0.76 },
  ],
  shin: [
    { y: -0.5, width: 0.48, depth: 0.54 },
    { y: -0.26, width: 0.65, depth: 0.7 },
    { y: 0.02, width: 0.78, depth: 0.8 },
    { y: 0.29, width: 0.88, depth: 0.86 },
    { y: 0.5, width: 0.67, depth: 0.72 },
  ],
  finger: [
    { y: -0.5, width: 0.52, depth: 0.54 },
    { y: -0.22, width: 0.78, depth: 0.74 },
    { y: 0.18, width: 0.7, depth: 0.68 },
    { y: 0.5, width: 0.38, depth: 0.42 },
  ],
};

/** Builds tapered, ring-profiled low-poly anatomy instead of a stock primitive. */
export function createFacetedProfileGeometry(
  sections: readonly FacetedProfileSection[],
  radialSegments = 10,
) {
  if (sections.length < 2) throw new Error("A faceted profile needs at least two sections.");
  if (!Number.isInteger(radialSegments) || radialSegments < 5) {
    throw new Error("A faceted profile needs at least five radial segments.");
  }
  for (let index = 1; index < sections.length; index += 1) {
    if (sections[index].y <= sections[index - 1].y) {
      throw new Error("Faceted profile sections must be ordered from bottom to top.");
    }
  }

  const positions: number[] = [];
  const indices: number[] = [];
  for (const section of sections) {
    for (let side = 0; side < radialSegments; side += 1) {
      const angle = side / radialSegments * Math.PI * 2;
      positions.push(
        Math.cos(angle) * section.width,
        section.y,
        (section.offsetZ ?? 0) + Math.sin(angle) * section.depth,
      );
    }
  }

  for (let ring = 0; ring < sections.length - 1; ring += 1) {
    const bottom = ring * radialSegments;
    const top = (ring + 1) * radialSegments;
    for (let side = 0; side < radialSegments; side += 1) {
      const next = (side + 1) % radialSegments;
      const lowerA = bottom + side;
      const lowerB = bottom + next;
      const upperA = top + side;
      const upperB = top + next;
      indices.push(lowerA, upperA, lowerB, lowerB, upperA, upperB);
    }
  }

  const bottomCenter = positions.length / 3;
  const first = sections[0];
  positions.push(0, first.y, first.offsetZ ?? 0);
  const topCenter = positions.length / 3;
  const last = sections[sections.length - 1];
  positions.push(0, last.y, last.offsetZ ?? 0);
  const topRing = (sections.length - 1) * radialSegments;
  for (let side = 0; side < radialSegments; side += 1) {
    const next = (side + 1) % radialSegments;
    indices.push(bottomCenter, side, next);
    indices.push(topCenter, topRing + next, topRing + side);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createHumanLimbGeometry(limb: HumanAnatomicalLimb, radialSegments = 8) {
  return createFacetedProfileGeometry(LIMB_PROFILES[limb], radialSegments);
}

export function createHumanJointGeometry(radialSegments = 8) {
  return createFacetedProfileGeometry([
    { y: -0.5, width: 0.56, depth: 0.58 },
    { y: -0.28, width: 0.82, depth: 0.84 },
    { y: 0, width: 1, depth: 0.96 },
    { y: 0.27, width: 0.86, depth: 0.84 },
    { y: 0.5, width: 0.54, depth: 0.6 },
  ], radialSegments);
}

export function createHumanTorsoGeometry(radialSegments = 10) {
  return createFacetedProfileGeometry([
    { y: -0.5, width: 0.68, depth: 0.72 },
    { y: -0.34, width: 0.72, depth: 0.76 },
    { y: -0.08, width: 0.84, depth: 0.88 },
    { y: 0.18, width: 1, depth: 1 },
    { y: 0.38, width: 0.94, depth: 0.92 },
    { y: 0.5, width: 0.68, depth: 0.7 },
  ], radialSegments);
}

export function createHumanHeadGeometry(radialSegments = 10) {
  return createFacetedProfileGeometry([
    { y: -0.5, width: 0.28, depth: 0.34, offsetZ: 0.04 },
    { y: -0.32, width: 0.58, depth: 0.62, offsetZ: 0.025 },
    { y: -0.08, width: 0.82, depth: 0.8 },
    { y: 0.18, width: 0.92, depth: 0.86, offsetZ: -0.012 },
    { y: 0.38, width: 0.78, depth: 0.74, offsetZ: -0.02 },
    { y: 0.5, width: 0.46, depth: 0.48, offsetZ: -0.02 },
  ], radialSegments);
}

export function createHumanPalmGeometry(radialSegments = 8) {
  return createFacetedProfileGeometry([
    { y: -0.5, width: 0.56, depth: 0.52 },
    { y: -0.22, width: 0.86, depth: 0.68 },
    { y: 0.12, width: 1, depth: 0.72 },
    { y: 0.38, width: 0.8, depth: 0.62 },
    { y: 0.5, width: 0.58, depth: 0.46 },
  ], radialSegments);
}

export function createFacetedBootGeometry() {
  const footprint = new THREE.Shape();
  footprint.moveTo(-0.32, 0.5);
  footprint.lineTo(0.32, 0.5);
  footprint.lineTo(0.4, 0.16);
  footprint.lineTo(0.47, -0.16);
  footprint.lineTo(0.4, -0.38);
  footprint.lineTo(0.27, -0.5);
  footprint.lineTo(-0.27, -0.5);
  footprint.lineTo(-0.4, -0.38);
  footprint.lineTo(-0.47, -0.16);
  footprint.lineTo(-0.4, 0.16);
  footprint.closePath();

  const geometry = new THREE.ExtrudeGeometry(footprint, {
    depth: 1,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -0.5);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createFacetedArmorPlateGeometry(width: number, height: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.4, height * 0.5);
  shape.lineTo(width * 0.4, height * 0.5);
  shape.lineTo(width * 0.5, height * 0.14);
  shape.lineTo(width * 0.28, -height * 0.34);
  shape.lineTo(0, -height * 0.5);
  shape.lineTo(-width * 0.28, -height * 0.34);
  shape.lineTo(-width * 0.5, height * 0.14);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(width, height) * 0.035,
    bevelThickness: Math.min(depth * 0.24, 0.012),
    curveSegments: 1,
  });
  geometry.translate(0, 0, -depth * 0.5);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
