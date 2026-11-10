import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DoubleSide, Shape } from "three";
import {
  getWarRoomHouseInteriorWalls,
  getWarRoomHousePlan,
  type WarRoomBuilding,
} from "../game/war-room-data";

type BuildingProps = { building: WarRoomBuilding };

type HousePalette = {
  wall: string;
  interiorWall: string;
  foundation: string;
  timber: string;
  roof: string;
  roofEdge: string;
  accent: string;
  glass: string;
};

const HOUSE_PALETTES: HousePalette[] = [
  { wall: "#b9ad97", interiorWall: "#765b43", foundation: "#777267", timber: "#594d40", roof: "#504b47", roofEdge: "#393a37", accent: "#89775f", glass: "#71888a" },
  { wall: "#a5a59e", interiorWall: "#53645f", foundation: "#666a68", timber: "#4f504d", roof: "#464d50", roofEdge: "#363d40", accent: "#927e5e", glass: "#73898b" },
  { wall: "#a88e70", interiorWall: "#75503a", foundation: "#75614c", timber: "#4f3c2e", roof: "#51463c", roofEdge: "#3c342e", accent: "#b08a57", glass: "#7b8580" },
  { wall: "#c1b49c", interiorWall: "#675747", foundation: "#827665", timber: "#625345", roof: "#604640", roofEdge: "#483632", accent: "#a98260", glass: "#778386" },
  { wall: "#b5aa94", interiorWall: "#705844", foundation: "#77756c", timber: "#4e4d44", roof: "#46504d", roofEdge: "#343d3a", accent: "#897151", glass: "#748584" },
  { wall: "#aaa99f", interiorWall: "#4b625e", foundation: "#696d69", timber: "#4b514e", roof: "#4b5052", roofEdge: "#363b3e", accent: "#986e5c", glass: "#788b8b" },
  { wall: "#c0b8a5", interiorWall: "#746044", foundation: "#7c7568", timber: "#5b5041", roof: "#535c55", roofEdge: "#3b433e", accent: "#90785a", glass: "#7e8983" },
  { wall: "#b39d7a", interiorWall: "#694b39", foundation: "#79664e", timber: "#584632", roof: "#59483b", roofEdge: "#40342d", accent: "#a0784b", glass: "#7b8580" },
];

function HouseWindow({
  x,
  y,
  z,
  width,
  palette,
  shuttered,
}: {
  x: number;
  y: number;
  z: number;
  width: number;
  palette: HousePalette;
  shuttered: boolean;
}) {
  const height = 0.82;
  const frame = 0.1;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0, 0.015]}>
        <boxGeometry args={[width, height, 0.08]} />
        <meshStandardMaterial color={palette.timber} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.065]}>
        <boxGeometry args={[width - frame * 2, height - frame * 2, 0.035]} />
        <meshStandardMaterial
          color={palette.glass}
          emissive={palette.glass}
          emissiveIntensity={0.08}
          roughness={0.42}
          metalness={0.08}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`window-frame-${side}`} position={[side * (width / 2 + 0.025), 0, 0.11]}>
          <boxGeometry args={[frame, height + 0.1, 0.12]} />
          <meshStandardMaterial color={palette.accent} roughness={0.78} />
        </mesh>
      ))}
      <mesh position={[0, height / 2, 0.11]}>
        <boxGeometry args={[width + 0.16, frame, 0.13]} />
        <meshStandardMaterial color={palette.accent} roughness={0.78} />
      </mesh>
      <mesh position={[0, -height / 2, 0.11]}>
        <boxGeometry args={[width + 0.16, frame * 0.8, 0.13]} />
        <meshStandardMaterial color={palette.accent} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0, 0.115]}>
        <boxGeometry args={[0.07, height - 0.12, 0.11]} />
        <meshStandardMaterial color={palette.timber} roughness={0.82} />
      </mesh>
      {shuttered && [-1, 1].map((side) => (
        <group key={`shutter-${side}`} position={[side * (width / 2 + 0.18), 0, 0.02]}>
          <mesh castShadow>
            <boxGeometry args={[0.2, height * 0.88, 0.12]} />
            <meshStandardMaterial color={palette.timber} roughness={0.9} />
          </mesh>
          {[-0.24, 0, 0.24].map((slat) => (
            <mesh key={`shutter-slat-${slat}`} position={[0, slat, 0.068]}>
              <boxGeometry args={[0.22, 0.045, 0.025]} />
              <meshStandardMaterial color={palette.accent} roughness={0.92} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.082]}>
            <boxGeometry args={[0.045, height * 0.72, 0.03]} />
            <meshStandardMaterial color={palette.timber} roughness={0.86} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GableShape({ width, rise, y, z, wall, timber }: { width: number; rise: number; y: number; z: number; wall: string; timber: string }) {
  const shape = new Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  return (
    <group position={[0, y, z]}>
      <mesh>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color={wall} roughness={0.94} side={DoubleSide} />
      </mesh>
      <mesh position={[0, rise * 0.35, 0.025]}>
        <boxGeometry args={[0.14, rise * 0.7, 0.1]} />
        <meshStandardMaterial color={timber} roughness={0.82} />
      </mesh>
    </group>
  );
}

function RoofTileField({
  width,
  run,
  color,
  seed,
  position,
  rotation,
}: {
  width: number;
  run: number;
  color: string;
  seed: number;
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const columns = Math.max(4, Math.ceil(width / 0.76));
  const rows = Math.max(5, Math.ceil(run / 0.48));
  const tiles = useMemo(() => {
    const columnWidth = width / columns;
    const rowDepth = run / rows;
    return Array.from({ length: columns * rows }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return {
        x: -width / 2 + (column + 0.5) * columnWidth,
        z: -run / 2 + (row + 0.5) * rowDepth,
        width: columnWidth - 0.035,
        depth: rowDepth - 0.03,
        variation: Math.sin((index + 1) * 17.13 + seed * 31.7) * 0.055,
      };
    });
  }, [columns, rows, run, seed, width]);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.94, metalness: 0 }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    const tileColor = new THREE.Color(color);
    tiles.forEach((tile, index) => {
      transform.position.set(tile.x, 0.13, tile.z);
      transform.scale.set(tile.width, 0.085, tile.depth);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      tileColor.set(color).offsetHSL(0, 0, tile.variation);
      mesh.setColorAt(index, tileColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [color, tiles]);

  return (
    <group position={position} rotation={rotation}>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, tiles.length]}
        castShadow
        receiveShadow
      />
    </group>
  );
}

function WarRoomInteriorWallLining({
  building,
  palette,
}: {
  building: WarRoomBuilding;
  palette: HousePalette;
}) {
  const plan = getWarRoomHousePlan(building);
  const wallThickness = plan.wallThickness;
  const frontZ = -building.depth / 2;
  const backZ = building.depth / 2;
  const doorSideWidth = (building.width - building.doorWidth) / 2;
  const floors = [
    { id: "ground", baseY: 0, height: building.storyHeight },
    { id: "upper", baseY: building.storyHeight, height: building.upperWallHeight },
  ];
  const panels = floors.flatMap((floor) => {
    const y = floor.baseY + floor.height / 2;
    const panelHeight = floor.height - 0.28;
    const outerWalls = [
      {
        id: `${floor.id}-back`,
        position: [0, y, backZ - wallThickness / 2 - 0.025] as [number, number, number],
        size: [building.width - 0.36, panelHeight, 0.035] as [number, number, number],
      },
      ...([-1, 1] as const).map((side) => ({
        id: `${floor.id}-side-${side}`,
        position: [side * (building.width / 2 - wallThickness / 2 - 0.025), y, 0] as [number, number, number],
        size: [0.035, panelHeight, building.depth - 0.36] as [number, number, number],
      })),
      ...([-1, 1] as const).map((side) => ({
        id: `${floor.id}-front-${side}`,
        position: [
          side * (building.doorWidth / 2 + doorSideWidth / 2),
          y,
          frontZ + wallThickness / 2 + 0.025,
        ] as [number, number, number],
        size: [doorSideWidth - 0.12, panelHeight, 0.035] as [number, number, number],
      })),
    ];
    const partitions = getWarRoomHouseInteriorWalls(building).flatMap((wall) => {
      if (wall.width >= wall.depth) {
        return [-1, 1].map((side) => ({
          id: `${floor.id}-${wall.id}-face-${side}`,
          position: [wall.x, y, wall.z + side * (wall.depth / 2 + 0.025)] as [number, number, number],
          size: [Math.max(0.06, wall.width - 0.1), panelHeight, 0.035] as [number, number, number],
        }));
      }
      return [-1, 1].map((side) => ({
        id: `${floor.id}-${wall.id}-face-${side}`,
        position: [wall.x + side * (wall.width / 2 + 0.025), y, wall.z] as [number, number, number],
        size: [0.035, panelHeight, Math.max(0.06, wall.depth - 0.1)] as [number, number, number],
      }));
    });
    return [...outerWalls, ...partitions];
  });

  return (
    <group>
      {panels.map((panel) => (
        <group key={panel.id} position={panel.position}>
          <mesh>
            <boxGeometry args={panel.size} />
            <meshStandardMaterial color={palette.interiorWall} roughness={0.96} />
          </mesh>
          <mesh position={[0, -panel.size[1] / 2 + 0.24, 0]}>
            <boxGeometry args={[panel.size[0], 0.16, panel.size[2]]} />
            <meshStandardMaterial color={palette.timber} roughness={0.88} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * A lightweight, open-fronted two-storey house shell. The upper floor is split
 * around the exact traversal stair lane so the visual architecture never caps it.
 */
export function WarRoomBuildingShell({ building }: BuildingProps) {
  const palette = HOUSE_PALETTES[((building.style % HOUSE_PALETTES.length) + HOUSE_PALETTES.length) % HOUSE_PALETTES.length];
  const width = building.width;
  const depth = building.depth;
  const groundHeight = building.storyHeight;
  const upperHeight = building.upperWallHeight;
  const plan = getWarRoomHousePlan(building);
  const wallThickness = plan.wallThickness;
  const frontZ = -depth / 2;
  const backZ = depth / 2;
  const stairX = plan.stairX;
  const stairStartZ = plan.stairStartZ;
  const stairEndZ = plan.stairEndZ;
  const stairHalfWidth = plan.stairWidth / 2;
  const balconyRailOpeningWidth = building.doorWidth + 0.6;
  const balconyRailSideWidth = (building.doorWidth + 1 - balconyRailOpeningWidth) / 2;
  const balconyRailSideCenter = balconyRailOpeningWidth / 2 + balconyRailSideWidth / 2;
  const roofRise = Math.min(1.45, depth * 0.23);
  const roofHalfLength = Math.sqrt((depth / 2 + 0.35) ** 2 + roofRise ** 2);
  const roofBaseY = groundHeight + upperHeight;
  const roofAngle = Math.atan2(roofRise, depth / 2 + 0.35);
  const doorLeftWidth = (width - building.doorWidth) / 2;
  const roofRibs = building.style === 2 || building.style === 7;
  const stoneQuoins = building.style === 1 || building.style === 3;
  const timberFrame = building.style === 2 || building.style === 4 || building.style === 7;
  const gableZ = depth / 2 + wallThickness / 2 + 0.015;
  const floorLaneLeft = stairX - stairHalfWidth;
  const floorLaneRight = stairX + stairHalfWidth;
  const frontLandingDepth = stairStartZ + depth / 2;
  const rearLandingDepth = depth / 2 - stairEndZ;

  return (
    <group position={[building.x, 0, building.z]} rotation={[0, building.rotationY, 0]}>
      {/* Stone footings and the ground-floor walking surface. */}
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <boxGeometry args={[width + 0.18, 0.1, depth + 0.18]} />
        <meshStandardMaterial color={palette.foundation} roughness={0.96} />
      </mesh>
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <boxGeometry args={[width - 0.42, 0.06, depth - 0.42]} />
        <meshStandardMaterial color={palette.wall} roughness={0.92} />
      </mesh>
      <WarRoomInteriorWallLining building={building} palette={palette} />

      {/* Ground front: separated jambs leave the full doorway clear. */}
      {[-1, 1].map((side) => (
        <mesh
          key={`front-ground-${side}`}
          position={[side * (building.doorWidth / 2 + doorLeftWidth / 2), groundHeight / 2, frontZ]}
          userData={{
            warRoomCameraOccluderId: `${building.id}-floor-0-front-${side < 0 ? "left" : "right"}`,
          }}
        >
          <boxGeometry args={[doorLeftWidth, groundHeight, wallThickness]} />
          <meshStandardMaterial color={palette.wall} roughness={0.94} />
        </mesh>
      ))}
      {getWarRoomHouseInteriorWalls(building).map((wall) => (
        <mesh
          key={`ground-interior-${wall.id}`}
          position={[wall.x, groundHeight / 2, wall.z]}
          userData={{ warRoomCameraOccluderId: `${building.id}-floor-0-${wall.id}` }}
        >
          <boxGeometry args={[wall.width, groundHeight, wall.depth]} />
          <meshStandardMaterial color={palette.wall} roughness={0.94} />
        </mesh>
      ))}
      <mesh position={[0, groundHeight - 0.14, frontZ]}>
        <boxGeometry args={[building.doorWidth + 0.24, 0.28, wallThickness + 0.08]} />
        <meshStandardMaterial color={palette.timber} roughness={0.84} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`door-jamb-${side}`} position={[side * (building.doorWidth / 2 + 0.07), groundHeight / 2, frontZ - 0.04]} castShadow>
          <boxGeometry args={[0.14, groundHeight, wallThickness + 0.1]} />
          <meshStandardMaterial color={palette.timber} roughness={0.82} />
        </mesh>
      ))}

      {/* Solid back and side walls on the lower storey. */}
      <mesh
        position={[0, groundHeight / 2, backZ]}
        userData={{ warRoomCameraOccluderId: `${building.id}-floor-0-back` }}
      >
        <boxGeometry args={[width, groundHeight, wallThickness]} />
        <meshStandardMaterial color={palette.wall} roughness={0.94} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`ground-side-${side}`}
          position={[side * (width / 2), groundHeight / 2, 0]}
          userData={{
            warRoomCameraOccluderId: `${building.id}-floor-0-${side < 0 ? "west" : "east"}`,
          }}
        >
          <boxGeometry args={[wallThickness, groundHeight, depth]} />
          <meshStandardMaterial color={palette.wall} roughness={0.94} />
        </mesh>
      ))}

      {/* Upper floor: four pieces form a clean stairwell opening and landing. */}
      <mesh position={[( -width / 2 + floorLaneLeft) / 2, groundHeight - 0.075, 0]} receiveShadow>
        <boxGeometry args={[floorLaneLeft + width / 2, 0.15, depth - 0.42]} />
        <meshStandardMaterial color={palette.foundation} roughness={0.94} />
      </mesh>
      <mesh position={[(floorLaneRight + width / 2) / 2, groundHeight - 0.075, 0]} receiveShadow>
        <boxGeometry args={[width / 2 - floorLaneRight, 0.15, depth - 0.42]} />
        <meshStandardMaterial color={palette.foundation} roughness={0.94} />
      </mesh>
      <mesh position={[(floorLaneLeft + floorLaneRight) / 2, groundHeight - 0.075, -depth / 2 + frontLandingDepth / 2]} receiveShadow>
        <boxGeometry args={[floorLaneRight - floorLaneLeft, 0.15, frontLandingDepth]} />
        <meshStandardMaterial color={palette.foundation} roughness={0.94} />
      </mesh>
      <mesh position={[(floorLaneLeft + floorLaneRight) / 2, groundHeight - 0.075, stairEndZ + rearLandingDepth / 2]} receiveShadow>
        <boxGeometry args={[floorLaneRight - floorLaneLeft, 0.15, rearLandingDepth]} />
        <meshStandardMaterial color={palette.foundation} roughness={0.94} />
      </mesh>

      {/* The upper entrance aligns with its door leaf and guarded landing. */}
      {[-1, 1].map((side) => (
        <mesh
          key={`upper-front-${side}`}
          position={[
            side * (building.doorWidth / 2 + doorLeftWidth / 2),
            groundHeight + upperHeight / 2,
            frontZ,
          ]}
          userData={{
            warRoomCameraOccluderId: `${building.id}-floor-1-front-${side < 0 ? "left" : "right"}`,
          }}
        >
          <boxGeometry args={[doorLeftWidth, upperHeight, wallThickness]} />
          <meshStandardMaterial color={palette.wall} roughness={0.94} />
        </mesh>
      ))}
      <mesh
        position={[0, groundHeight + 2.4 + (upperHeight - 2.4) / 2, frontZ]}
        userData={{ warRoomCameraOccluderId: `${building.id}-upper-front-lintel` }}
      >
        <boxGeometry args={[building.doorWidth, Math.max(0.01, upperHeight - 2.4), wallThickness]} />
        <meshStandardMaterial color={palette.wall} roughness={0.94} />
      </mesh>
      <mesh position={[0, groundHeight - 0.075, frontZ - 0.84]} receiveShadow>
        <boxGeometry args={[building.doorWidth + 1, 0.15, 1.68]} />
        <meshStandardMaterial color={palette.foundation} roughness={0.94} />
      </mesh>
      <mesh position={[0, groundHeight + 0.04, frontZ - 0.84]}>
        <boxGeometry args={[building.doorWidth + 0.28, 0.08, 1.72]} />
        <meshStandardMaterial color={palette.timber} roughness={0.84} />
      </mesh>
      <mesh position={[0, groundHeight + 2.4 + (upperHeight - 2.4) / 2, frontZ - 0.04]}>
        <boxGeometry args={[building.doorWidth + 0.24, 0.16, wallThickness + 0.08]} />
        <meshStandardMaterial color={palette.timber} roughness={0.84} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`upper-door-frame-${side}`}>
          <mesh
            position={[
              side * (building.doorWidth / 2 + 0.07),
              groundHeight + 1.2,
              frontZ - 0.04,
            ]}
            castShadow
          >
            <boxGeometry args={[0.14, 2.4, wallThickness + 0.1]} />
            <meshStandardMaterial color={palette.timber} roughness={0.82} />
          </mesh>
          <mesh
            position={[
              side * (building.doorWidth / 2 + 0.5),
              groundHeight + 0.475,
              frontZ - 0.84,
            ]}
          >
            <boxGeometry args={[0.12, 0.95, 1.68]} />
            <meshStandardMaterial color={palette.timber} roughness={0.82} />
          </mesh>
        </group>
      ))}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`upper-balcony-front-rail-${side}`}
          position={[
            side * balconyRailSideCenter,
            groundHeight + 0.475,
            frontZ - 1.68,
          ]}
        >
          <boxGeometry args={[balconyRailSideWidth, 0.95, 0.12]} />
          <meshStandardMaterial color={palette.timber} roughness={0.82} />
        </mesh>
      ))}
      <mesh
        position={[0, groundHeight + upperHeight / 2, backZ]}
        userData={{ warRoomCameraOccluderId: `${building.id}-floor-1-back` }}
      >
        <boxGeometry args={[width, upperHeight, wallThickness]} />
        <meshStandardMaterial color={palette.wall} roughness={0.94} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`upper-side-${side}`}
          position={[side * (width / 2), groundHeight + upperHeight / 2, 0]}
          userData={{
            warRoomCameraOccluderId: `${building.id}-floor-1-${side < 0 ? "west" : "east"}`,
          }}
        >
          <boxGeometry args={[wallThickness, upperHeight, depth]} />
          <meshStandardMaterial color={palette.wall} roughness={0.94} />
        </mesh>
      ))}
      {getWarRoomHouseInteriorWalls(building).map((wall) => (
        <mesh
          key={`upper-interior-${wall.id}`}
          position={[wall.x, groundHeight + upperHeight / 2, wall.z]}
          userData={{ warRoomCameraOccluderId: `${building.id}-floor-1-${wall.id}` }}
        >
          <boxGeometry args={[wall.width, upperHeight, wall.depth]} />
          <meshStandardMaterial color={palette.wall} roughness={0.94} />
        </mesh>
      ))}

      {/* Door trim, story belt, and restrained corner structure. */}
      <mesh position={[0, groundHeight + 0.06, frontZ - 0.17]} castShadow>
        <boxGeometry args={[width + 0.22, 0.18, 0.16]} />
        <meshStandardMaterial color={palette.timber} roughness={0.84} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`belt-side-${side}`} position={[side * (width / 2 + 0.07), groundHeight + 0.06, 0]}>
          <boxGeometry args={[0.15, 0.18, depth + 0.18]} />
          <meshStandardMaterial color={palette.timber} roughness={0.84} />
        </mesh>
      ))}
      {[-1, 1].flatMap((sideX) => [-1, 1].map((sideZ) => (
        <mesh
          key={`corner-post-${sideX}-${sideZ}`}
          position={[sideX * (width / 2 - 0.19), groundHeight + upperHeight / 2, sideZ * (depth / 2 - 0.19)]}
          castShadow
        >
          <boxGeometry args={[0.26, upperHeight, 0.26]} />
          <meshStandardMaterial color={stoneQuoins ? palette.accent : palette.timber} roughness={0.84} />
        </mesh>
      )))}

      {/* Front windows on both levels; shutters vary by house style. */}
      {[-1, 1].map((side) => (
        <HouseWindow
          key={`lower-window-${side}`}
          x={side * width * 0.29}
          y={groundHeight * 0.57}
          z={frontZ - wallThickness / 2 - 0.015}
          width={0.78}
          palette={palette}
          shuttered={building.style === 2 || building.style === 7}
        />
      ))}
      {[-1, 1].map((side) => (
        <HouseWindow
          key={`upper-window-${side}`}
          x={side * width * 0.29}
          y={groundHeight + upperHeight * 0.56}
          z={frontZ - wallThickness / 2 - 0.015}
          width={0.86}
          palette={palette}
          shuttered={building.style === 0 || building.style === 5}
        />
      ))}

      {/* House-specific masonry/timber rhythm, kept deliberately low-poly. */}
      {timberFrame && [-1, 1].map((side) => (
        <mesh key={`front-frame-${side}`} position={[side * (width / 2 - 0.2), groundHeight + upperHeight / 2, frontZ - wallThickness / 2 - 0.025]}>
          <boxGeometry args={[0.16, upperHeight, 0.18]} />
          <meshStandardMaterial color={palette.timber} roughness={0.86} />
        </mesh>
      ))}
      {stoneQuoins && [-1, 1].flatMap((sideX) => [0, 1, 2, 3].map((course) => (
        <mesh
          key={`quoin-${sideX}-${course}`}
          position={[sideX * (width / 2 - 0.12), groundHeight + 0.38 + course * 0.58, frontZ - wallThickness / 2 - 0.08]}
        >
          <boxGeometry args={[0.34, 0.25, 0.18]} />
          <meshStandardMaterial color={palette.accent} roughness={0.94} />
        </mesh>
      )))}

      {/* Gabled roof: exposed gable faces, broad eaves, fascia, and optional battens. */}
      <GableShape width={width + 0.26} rise={roofRise} y={roofBaseY} z={frontZ - 0.03} wall={palette.wall} timber={palette.timber} />
      <GableShape width={width + 0.26} rise={roofRise} y={roofBaseY} z={backZ + 0.03} wall={palette.wall} timber={palette.timber} />
      <group name={`war-room-camera-occluder:roof:${building.id}`} userData={{ warRoomCameraOccluderId: `roof:${building.id}` }}>
        <mesh
          position={[0, roofBaseY + roofRise / 2, -depth / 4 - 0.16]}
          rotation={[-roofAngle, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width + 0.72, 0.18, roofHalfLength]} />
          <meshStandardMaterial color={palette.roof} roughness={0.92} />
        </mesh>
        <RoofTileField
          width={width + 0.72}
          run={roofHalfLength}
          color={palette.roofEdge}
          seed={building.style * 7 + 1}
          position={[0, roofBaseY + roofRise / 2, -depth / 4 - 0.16]}
          rotation={[-roofAngle, 0, 0]}
        />
        <mesh
          position={[0, roofBaseY + roofRise / 2, depth / 4 + 0.16]}
          rotation={[roofAngle, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width + 0.72, 0.18, roofHalfLength]} />
          <meshStandardMaterial color={palette.roof} roughness={0.92} />
        </mesh>
        <RoofTileField
          width={width + 0.72}
          run={roofHalfLength}
          color={palette.roof}
          seed={building.style * 7 + 2}
          position={[0, roofBaseY + roofRise / 2, depth / 4 + 0.16]}
          rotation={[roofAngle, 0, 0]}
        />
        <mesh position={[0, roofBaseY + roofRise + 0.04, 0]} castShadow>
          <boxGeometry args={[width + 0.82, 0.2, 0.28]} />
          <meshStandardMaterial color={palette.roofEdge} roughness={0.9} />
        </mesh>
        {roofRibs && [-1, 0, 1].map((side) => (
          <mesh
            key={`roof-rib-front-${side}`}
            position={[side * (width * 0.28), roofBaseY + roofRise * 0.53, -depth * 0.23]}
            rotation={[-roofAngle, 0, 0]}
          >
            <boxGeometry args={[0.11, 0.1, roofHalfLength * 0.98]} />
            <meshStandardMaterial color={palette.roofEdge} roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Visual staircase aligned to getWarRoomStairProfile / gameplay floor-height sampling. */
export function WarRoomStaircase({ building }: BuildingProps) {
  const palette = HOUSE_PALETTES[((building.style % HOUSE_PALETTES.length) + HOUSE_PALETTES.length) % HOUSE_PALETTES.length];
  const plan = getWarRoomHousePlan(building);
  const stairX = plan.stairX;
  const startZ = plan.stairStartZ;
  const endZ = plan.stairEndZ;
  const halfWidth = plan.stairWidth / 2;
  const run = endZ - startZ;
  const stepCount = Math.max(
    12,
    Math.ceil(Math.max(building.storyHeight / 0.18, run / 0.24)),
  );
  const stepRun = run / stepCount;
  const risePerStep = building.storyHeight / stepCount;
  const angle = Math.atan2(building.storyHeight, run);
  const railLength = Math.sqrt(run * run + building.storyHeight * building.storyHeight);
  const stairMaterial = building.style === 2 || building.style === 4 ? palette.timber : palette.foundation;

  return (
    <group position={[building.x, 0, building.z]} rotation={[0, building.rotationY, 0]}>
      {Array.from({ length: stepCount }, (_, index) => {
        const stepTop = risePerStep * (index + 1);
        const stepZ = startZ + stepRun * (index + 0.5);
        const riserZ = startZ + stepRun * (index + 1) - 0.035;
        return (
          <group key={`stair-step-${index}`}>
            <mesh position={[stairX, stepTop - 0.065, stepZ]} castShadow receiveShadow>
              <boxGeometry args={[halfWidth * 2, 0.13, stepRun + 0.045]} />
              <meshStandardMaterial color={stairMaterial} roughness={0.9} />
            </mesh>
            <mesh
              position={[stairX, stepTop - risePerStep / 2 - 0.02, riserZ]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[halfWidth * 2 - 0.04, risePerStep + 0.045, 0.07]} />
              <meshStandardMaterial color={palette.foundation} roughness={0.94} />
            </mesh>
            <mesh position={[stairX, stepTop + 0.004, stepZ]} receiveShadow>
              <boxGeometry args={[halfWidth * 2 - 0.06, 0.018, stepRun + 0.018]} />
              <meshStandardMaterial color={palette.accent} roughness={0.86} />
            </mesh>
          </group>
        );
      })}

      {/* Rails follow the collision lane and protect the open stairwell. */}
      {[-1, 1].map((side) => {
        const railX = stairX + side * (halfWidth + plan.railingThickness / 2);
        return (
          <group key={`stair-rail-${side}`}>
            {[0.08, plan.railingHeight].map((heightOffset, railIndex) => (
              <mesh
                key={`rail-${railIndex}`}
                position={[railX, heightOffset + building.storyHeight / 2, (startZ + endZ) / 2]}
                rotation={[-angle, 0, 0]}
                castShadow
              >
                <boxGeometry args={[plan.railingThickness, 0.12, railLength + 0.08]} />
                <meshStandardMaterial color={palette.timber} roughness={0.82} />
              </mesh>
            ))}
            {[0.12, 0.52, 0.88].map((progress, postIndex) => (
              <mesh
                key={`rail-post-${postIndex}`}
                position={[
                  railX,
                  progress * building.storyHeight + 0.52,
                  startZ + progress * run,
                ]}
                castShadow
              >
                <boxGeometry args={[0.11, 1.04, 0.11]} />
                <meshStandardMaterial color={palette.timber} roughness={0.84} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
