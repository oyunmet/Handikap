import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  getWarRoomFirstPersonLegPose,
  shouldShowWarRoomFirstPersonLegs,
} from "../game/war-room-first-person-legs.ts";
import type { WarRoomRuntime } from "../game/war-room-engine.ts";

type Props = {
  runtimeRef: MutableRefObject<WarRoomRuntime>;
  parentRef: MutableRefObject<THREE.Group | null>;
  cameraPositionRef: MutableRefObject<THREE.Vector3>;
  cameraQuaternionRef: MutableRefObject<THREE.Quaternion>;
  cameraForwardRef: MutableRefObject<THREE.Vector3>;
  movementRef: MutableRefObject<number>;
  walkPhaseRef: MutableRefObject<number>;
  active: boolean;
};

const UP = new THREE.Vector3(0, 1, 0);

function setSegment(
  mesh: THREE.Mesh | null,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  direction: THREE.Vector3,
  midpoint: THREE.Vector3,
) {
  if (!mesh) return;
  direction.subVectors(end, start);
  const length = direction.length();
  if (length < 0.001) return;
  midpoint.addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(UP, direction.multiplyScalar(1 / length));
  mesh.scale.set(radius, length / 3, radius);
}

function setPoint(mesh: THREE.Mesh | null, point: THREE.Vector3, radius: number) {
  if (!mesh) return;
  mesh.position.copy(point);
  mesh.scale.setScalar(radius);
}

export default function WarRoomFirstPersonLegs({
  runtimeRef,
  parentRef,
  cameraPositionRef,
  cameraQuaternionRef,
  cameraForwardRef,
  movementRef,
  walkPhaseRef,
  active,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const leftThighRef = useRef<THREE.Mesh>(null);
  const rightThighRef = useRef<THREE.Mesh>(null);
  const leftShinRef = useRef<THREE.Mesh>(null);
  const rightShinRef = useRef<THREE.Mesh>(null);
  const leftKneeRef = useRef<THREE.Mesh>(null);
  const rightKneeRef = useRef<THREE.Mesh>(null);
  const leftBootRef = useRef<THREE.Mesh>(null);
  const rightBootRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => ({
    limb: new THREE.CapsuleGeometry(1, 1, 2, 7),
    knee: new THREE.SphereGeometry(1, 9, 7),
    boot: new THREE.BoxGeometry(0.18, 0.12, 0.3),
  }), []);
  const materials = useMemo(() => ({
    trousers: new THREE.MeshStandardMaterial({ color: "#65492f", roughness: 0.9 }),
    knee: new THREE.MeshStandardMaterial({ color: "#c39962", roughness: 0.82 }),
    boot: new THREE.MeshStandardMaterial({ color: "#8d673e", roughness: 0.84 }),
  }), []);
  useEffect(() => () => {
    Object.values(geometry).forEach((resource) => resource.dispose());
    Object.values(materials).forEach((resource) => resource.dispose());
  }, [geometry, materials]);
  const inverseCameraQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const worldYawQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const midpoint = useMemo(() => new THREE.Vector3(), []);
  const worldPoint = useMemo(() => new THREE.Vector3(), []);
  const leftPoints = useMemo(() => Array.from({ length: 4 }, () => new THREE.Vector3()), []);
  const rightPoints = useMemo(() => Array.from({ length: 4 }, () => new THREE.Vector3()), []);

  useFrame(() => {
    const group = groupRef.current;
    const parent = parentRef.current;
    if (!group || !parent) return;
    group.visible = active && shouldShowWarRoomFirstPersonLegs(cameraForwardRef.current.y);
    group.scale.setScalar(1 / Math.max(0.001, parent.scale.x));
    if (!group.visible) return;

    const player = runtimeRef.current.player;
    const state = {
      x: player.x,
      z: player.z,
      floorHeight: player.floorHeight,
      jumpHeight: player.jumpHeight,
      yaw: player.facingYaw,
      movement: movementRef.current,
      walkPhase: walkPhaseRef.current,
      crouched: player.crouched,
      prone: player.prone,
    };
    inverseCameraQuaternion.copy(cameraQuaternionRef.current).invert();
    const toCameraLocal = (point: { x: number; y: number; z: number }, target: THREE.Vector3) => {
      worldPoint.set(point.x, point.y, point.z).sub(cameraPositionRef.current);
      target.copy(worldPoint).applyQuaternion(inverseCameraQuaternion);
    };
    const leftPose = getWarRoomFirstPersonLegPose(state, -1);
    const rightPose = getWarRoomFirstPersonLegPose(state, 1);
    const placeLeg = (
      pose: typeof leftPose,
      points: THREE.Vector3[],
      thigh: THREE.Mesh | null,
      shin: THREE.Mesh | null,
      knee: THREE.Mesh | null,
      boot: THREE.Mesh | null,
    ) => {
      toCameraLocal(pose.hip, points[0]);
      toCameraLocal(pose.knee, points[1]);
      toCameraLocal(pose.ankle, points[2]);
      toCameraLocal(pose.toe, points[3]);
      setSegment(thigh, points[0], points[1], 0.11, direction, midpoint);
      setSegment(shin, points[1], points[2], 0.085, direction, midpoint);
      setPoint(knee, points[1], 0.08);
      if (boot) {
        boot.position.copy(points[2]).lerp(points[3], 0.58);
        worldYawQuaternion.setFromAxisAngle(UP, state.yaw);
        boot.quaternion.copy(inverseCameraQuaternion).multiply(worldYawQuaternion);
      }
    };
    placeLeg(leftPose, leftPoints, leftThighRef.current, leftShinRef.current, leftKneeRef.current, leftBootRef.current);
    placeLeg(rightPose, rightPoints, rightThighRef.current, rightShinRef.current, rightKneeRef.current, rightBootRef.current);
  });

  return (
    <group ref={groupRef} name="war-room-first-person-lower-body">
      <mesh ref={leftThighRef} geometry={geometry.limb} material={materials.trousers} frustumCulled={false} />
      <mesh ref={rightThighRef} geometry={geometry.limb} material={materials.trousers} frustumCulled={false} />
      <mesh ref={leftShinRef} geometry={geometry.limb} material={materials.trousers} frustumCulled={false} />
      <mesh ref={rightShinRef} geometry={geometry.limb} material={materials.trousers} frustumCulled={false} />
      <mesh ref={leftKneeRef} geometry={geometry.knee} material={materials.knee} frustumCulled={false} />
      <mesh ref={rightKneeRef} geometry={geometry.knee} material={materials.knee} frustumCulled={false} />
      <mesh ref={leftBootRef} geometry={geometry.boot} material={materials.boot} frustumCulled={false} />
      <mesh ref={rightBootRef} geometry={geometry.boot} material={materials.boot} frustumCulled={false} />
    </group>
  );
}
