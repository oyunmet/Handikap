import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import type { WarRoomWeaponId } from "../game/war-room-data.ts";
import {
  getWarRoomViewModelAimScaleFactor,
  getWarRoomViewModelGripPoints,
} from "../game/war-room-viewmodel.ts";

type Props = {
  animationRef: MutableRefObject<WarRoomArmsAnimation>;
  weaponScale: number;
  visible: boolean;
};

export type WarRoomArmsAnimation = {
  weaponId: WarRoomWeaponId;
  aiming: boolean;
  reloadProgress: number;
  chargeProgress: number;
  recoil: number;
  loaded: boolean;
};

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function placeCapsule(
  mesh: THREE.Mesh | null,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  direction: THREE.Vector3,
  midpoint: THREE.Vector3,
  quaternion: THREE.Quaternion,
) {
  if (!mesh) return;
  direction.subVectors(end, start);
  const length = Math.max(0.001, direction.length());
  midpoint.addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  quaternion.setFromUnitVectors(Y_AXIS, direction.multiplyScalar(1 / length));
  mesh.quaternion.copy(quaternion);
  // The shared capsule geometry is three units long from cap to cap.
  mesh.scale.set(radius, length / 3, radius);
}

function placeForearm(
  mesh: THREE.Mesh | null,
  start: THREE.Vector3,
  end: THREE.Vector3,
  direction: THREE.Vector3,
  midpoint: THREE.Vector3,
  quaternion: THREE.Quaternion,
) {
  if (!mesh) return;
  direction.subVectors(end, start);
  const length = Math.max(0.001, direction.length());
  midpoint.addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  quaternion.setFromUnitVectors(Y_AXIS, direction.multiplyScalar(1 / length));
  mesh.quaternion.copy(quaternion);
  mesh.scale.set(0.112, length, 0.112);
}

function GripHand({
  handRef,
  palmGeometry,
  fingerGeometry,
  gloveMaterial,
  triggerIndexRef,
  mirror,
}: {
  handRef: MutableRefObject<THREE.Group | null>;
  palmGeometry: THREE.SphereGeometry;
  fingerGeometry: THREE.CapsuleGeometry;
  gloveMaterial: THREE.MeshStandardMaterial;
  triggerIndexRef?: MutableRefObject<THREE.Group | null>;
  mirror: boolean;
}) {
  const fingerOffsets = [-0.055, -0.019, 0.019, 0.055];
  const thumbSide = mirror ? -1 : 1;
  return (
    <group ref={handRef}>
      <mesh
        geometry={palmGeometry}
        material={gloveMaterial}
        position={[0, -0.01, 0]}
        scale={[0.115, 0.072, 0.14]}
        frustumCulled={false}
      />
      {fingerOffsets.map((x, index) => (
        <group
          key={index}
          ref={index === 0 ? triggerIndexRef : undefined}
          position={[x, -0.036, -0.025]}
          rotation={[0.48, 0, index === 0 ? -0.12 : 0]}
        >
          <mesh geometry={fingerGeometry} material={gloveMaterial} position={[0, -0.018, 0]} scale={[0.019, 0.027, 0.019]} />
          <mesh
            geometry={fingerGeometry}
            material={gloveMaterial}
            position={[0, -0.047, -0.017]}
            rotation={[0.52, 0, 0]}
            scale={[0.017, 0.023, 0.017]}
          />
        </group>
      ))}
      <group position={[thumbSide * 0.082, 0.005, -0.01]} rotation={[0.35, 0, thumbSide * 0.78]}>
        <mesh geometry={fingerGeometry} material={gloveMaterial} position={[0, -0.018, 0]} scale={[0.022, 0.034, 0.022]} />
        <mesh
          geometry={fingerGeometry}
          material={gloveMaterial}
          position={[thumbSide * 0.013, -0.045, -0.018]}
          rotation={[0.35, 0, -thumbSide * 0.3]}
          scale={[0.019, 0.027, 0.019]}
        />
      </group>
    </group>
  );
}

export function WarRoomFirstPersonArms({
  animationRef,
  weaponScale,
  visible,
}: Props) {
  const rightUpperRef = useRef<THREE.Mesh>(null);
  const leftUpperRef = useRef<THREE.Mesh>(null);
  const rightForearmRef = useRef<THREE.Mesh>(null);
  const leftForearmRef = useRef<THREE.Mesh>(null);
  const rightElbowRef = useRef<THREE.Mesh>(null);
  const leftElbowRef = useRef<THREE.Mesh>(null);
  const rightWristRef = useRef<THREE.Group>(null);
  const leftWristRef = useRef<THREE.Group>(null);
  const rightCuffRef = useRef<THREE.Group>(null);
  const leftCuffRef = useRef<THREE.Group>(null);
  const triggerIndexRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => ({
    limb: new THREE.CapsuleGeometry(1, 1, 2, 7),
    forearm: new THREE.CylinderGeometry(0.78, 1.12, 1, 8, 1),
    joint: new THREE.SphereGeometry(1, 7, 5),
    palm: new THREE.SphereGeometry(1, 8, 6),
    finger: new THREE.CapsuleGeometry(1, 1, 1, 5),
    cuff: new THREE.TorusGeometry(0.118, 0.017, 5, 10),
  }), []);
  const material = useMemo(() => ({
    cloth: new THREE.MeshStandardMaterial({ color: "#75583f", roughness: 0.91 }),
    cuff: new THREE.MeshStandardMaterial({ color: "#b18a5e", roughness: 0.76 }),
    glove: new THREE.MeshStandardMaterial({ color: "#8b6347", roughness: 0.88 }),
    seam: new THREE.MeshStandardMaterial({ color: "#c09a6b", roughness: 0.86 }),
  }), []);
  useEffect(() => () => {
    Object.values(geometry).forEach((resource) => resource.dispose());
    Object.values(material).forEach((resource) => resource.dispose());
  }, [geometry, material]);

  const rightShoulder = useMemo(() => new THREE.Vector3(0.78, -0.76, -0.28), []);
  const leftShoulder = useMemo(() => new THREE.Vector3(-0.78, -0.76, -0.28), []);
  const rightElbow = useMemo(() => new THREE.Vector3(0.52, -0.5, -0.24), []);
  const leftElbow = useMemo(() => new THREE.Vector3(-0.48, -0.5, -0.24), []);
  const rightWrist = useMemo(() => new THREE.Vector3(), []);
  const leftWrist = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const midpoint = useMemo(() => new THREE.Vector3(), []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const cuffQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const cuffDirection = useMemo(() => new THREE.Vector3(), []);
  const cuffPosition = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const { weaponId, aiming, reloadProgress, chargeProgress, recoil } = animationRef.current;
    const bow = weaponId === "longbow";
    const crossbow = weaponId === "crossbow";
    const gripScale = weaponScale * getWarRoomViewModelAimScaleFactor(aiming);
    const reloadMix = Math.sin(Math.PI * Math.max(0, Math.min(1, reloadProgress)));
    const gripPoints = getWarRoomViewModelGripPoints(weaponId);
    const rightX = gripPoints.gripR[0];
    const rightY = gripPoints.gripR[1];
    const rightZ = gripPoints.gripR[2] + (bow ? Math.max(0, Math.min(1, chargeProgress)) * 0.42 : 0);
    let leftX = gripPoints.gripL[0];
    let leftY = gripPoints.gripL[1];
    let leftZ = gripPoints.gripL[2];

    // The support hand visits the magazine or loading point, then returns to its grip.
    const reloadX = crossbow || bow ? -0.08 : 0;
    const reloadY = bow ? -0.08 : -0.3;
    const reloadZ = bow ? -0.28 : -0.16;
    leftX += (reloadX - leftX) * reloadMix;
    leftY += (reloadY - leftY) * reloadMix;
    leftZ += (reloadZ - leftZ) * reloadMix;
    rightWrist.set(rightX * gripScale, rightY * gripScale - recoil * 0.012, rightZ * gripScale);
    leftWrist.set(leftX * gripScale, leftY * gripScale, leftZ * gripScale);

    placeCapsule(rightUpperRef.current, rightShoulder, rightElbow, 0.145, direction, midpoint, quaternion);
    placeCapsule(leftUpperRef.current, leftShoulder, leftElbow, 0.145, direction, midpoint, quaternion);
    placeForearm(rightForearmRef.current, rightElbow, rightWrist, direction, midpoint, quaternion);
    placeForearm(leftForearmRef.current, leftElbow, leftWrist, direction, midpoint, quaternion);

    if (rightElbowRef.current) {
      rightElbowRef.current.position.copy(rightElbow);
      rightElbowRef.current.scale.setScalar(0.116);
    }
    if (leftElbowRef.current) {
      leftElbowRef.current.position.copy(leftElbow);
      leftElbowRef.current.scale.setScalar(0.116);
    }

    const updateCuff = (cuff: THREE.Group | null, elbow: THREE.Vector3, wrist: THREE.Vector3) => {
      if (!cuff) return;
      cuffDirection.subVectors(wrist, elbow).normalize();
      cuffPosition.copy(wrist).addScaledVector(cuffDirection, -0.095);
      cuff.position.copy(cuffPosition);
      cuffQuaternion.setFromUnitVectors(Y_AXIS, cuffDirection);
      cuff.quaternion.copy(cuffQuaternion);
    };
    updateCuff(rightCuffRef.current, rightElbow, rightWrist);
    updateCuff(leftCuffRef.current, leftElbow, leftWrist);

    if (rightWristRef.current) rightWristRef.current.position.copy(rightWrist);
    if (leftWristRef.current) leftWristRef.current.position.copy(leftWrist);
    if (triggerIndexRef.current) triggerIndexRef.current.rotation.x = -0.48 * Math.max(0, Math.min(1, recoil));
  });

  return (
    <group name="war-room-procedural-first-person-arms" visible={visible}>
      <mesh ref={rightUpperRef} geometry={geometry.limb} material={material.cloth} frustumCulled={false} />
      <mesh ref={leftUpperRef} geometry={geometry.limb} material={material.cloth} frustumCulled={false} />
      <mesh ref={rightForearmRef} geometry={geometry.forearm} material={material.cloth} frustumCulled={false} />
      <mesh ref={leftForearmRef} geometry={geometry.forearm} material={material.cloth} frustumCulled={false} />
      <mesh ref={rightElbowRef} geometry={geometry.joint} material={material.cloth} frustumCulled={false} />
      <mesh ref={leftElbowRef} geometry={geometry.joint} material={material.cloth} frustumCulled={false} />
      <group ref={rightCuffRef} rotation={[Math.PI / 2, 0, 0]}>
        <mesh geometry={geometry.cuff} material={material.cuff} />
        <mesh geometry={geometry.cuff} material={material.seam} position={[0, 0, -0.026]} scale={0.86} />
      </group>
      <group ref={leftCuffRef} rotation={[Math.PI / 2, 0, 0]}>
        <mesh geometry={geometry.cuff} material={material.cuff} />
        <mesh geometry={geometry.cuff} material={material.seam} position={[0, 0, -0.026]} scale={0.86} />
      </group>
      <GripHand
        handRef={rightWristRef}
        palmGeometry={geometry.palm}
        fingerGeometry={geometry.finger}
        gloveMaterial={material.glove}
        triggerIndexRef={triggerIndexRef}
        mirror={false}
      />
      <GripHand
        handRef={leftWristRef}
        palmGeometry={geometry.palm}
        fingerGeometry={geometry.finger}
        gloveMaterial={material.glove}
        mirror
      />
    </group>
  );
}
