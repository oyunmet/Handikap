import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { attachHumanCharacterDetails } from "./human-character-details.ts";

const RIGS = [
  {
    name: "player hero",
    bones: [
      "Torso", "Hips", "Shoulder.L", "Shoulder.R", "LowerArm.L", "LowerArm.R",
      "LowerLeg.L", "LowerLeg.R",
    ],
    forearm: "LowerArm.R",
  },
  {
    name: "base character",
    bones: [
      "DEF-spine.003", "DEF-hips", "DEF-shoulder.L", "DEF-shoulder.R",
      "DEF-forearm.L", "DEF-forearm.R", "DEF-shin.L", "DEF-shin.R",
    ],
    forearm: "DEF-forearm.R",
  },
  {
    name: "human armature",
    bones: [
      "Spine2", "Hips", "LeftShoulder", "RightShoulder", "LeftForeArm",
      "RightForeArm", "LeftLeg", "RightLeg",
    ],
    forearm: "RightForeArm",
  },
  {
    name: "night watcher",
    bones: [
      "Rig_Spine", "Rig_Hips", "Rig_LeftShoulder", "Rig_RightShoulder",
      "Rig_LeftForearm", "Rig_RightForearm", "Rig_LeftLowerLeg", "Rig_RightLowerLeg",
    ],
    forearm: "Rig_RightForearm",
  },
];

for (const rigConfig of RIGS) {
  test(`human detail armor follows articulated bones on the ${rigConfig.name} rig`, () => {
    const model = new THREE.Group();
    model.scale.setScalar(0.5);
    const bones = new Map();
    for (const [index, name] of rigConfig.bones.entries()) {
      const bone = new THREE.Bone();
      bone.name = name;
      bone.position.set(index * 0.015, index * 0.03, 0);
      model.add(bone);
      bones.set(name, bone);
    }
    model.updateMatrixWorld(true);

    const details = attachHumanCharacterDetails(model, {
      palette: {
        armor: "#554943",
        armorLight: "#a69a84",
        armorDark: "#302d30",
        trim: "#c49b5b",
      },
      frontSign: 1,
    });
    const forearmBone = bones.get(rigConfig.forearm);
    const forearmMount = model.getObjectByName("human-detail-forearm-mount-1");
    const guard = model.getObjectByName("human-detail-articulated-bracer-1");

    assert.ok(model.getObjectByName("human-detail-tapered-chest-plate"));
    assert.ok(model.getObjectByName("human-detail-belt-buckle"));
    assert.ok(model.getObjectByName("human-detail-faceted-pauldron--1"));
    assert.ok(model.getObjectByName("human-detail-knee-and-shin-guard--1"));
    assert.equal(forearmMount.parent, forearmBone);
    assert.ok(guard.geometry instanceof THREE.CylinderGeometry);

    model.updateMatrixWorld(true);
    const before = guard.getWorldPosition(new THREE.Vector3());
    forearmBone.rotation.x = 0.8;
    model.updateMatrixWorld(true);
    const after = guard.getWorldPosition(new THREE.Vector3());
    assert.ok(before.distanceTo(after) > 0.01, "forearm armor should follow elbow/arm animation");

    details.dispose();
    assert.equal(model.getObjectByName("human-detail-tapered-chest-plate"), undefined);
    assert.equal(model.getObjectByName("human-detail-articulated-bracer-1"), undefined);
  });
}
