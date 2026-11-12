// Pose tools for the Mixamo bots, applied after the mixer has posed the model.
import * as THREE from 'three';

const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
const axisV = new THREE.Vector3();

// Remember a pose: every bone's rotation, and where the hips are.
export function capturePose(rig) {
  return {
    rot: rig.bones.map(b => b.quaternion.clone()),
    hips: rig.bone('Hips').position.clone()
  };
}

// Push the current pose further from a reference pose (exaggeration), or pull it back towards it.
// k = 1 leaves the pose as it is; k = 2 doubles every joint's turn away from the reference;
// k = 0 is the reference pose itself. The hips' movement is scaled by `lift` (default k).
export function scalePose(rig, ref, k, lift = k) {
  rig.bones.forEach((b, i) => {
    // The turn from the reference to now, as an angle about an axis. Scale the angle.
    qa.copy(ref.rot[i]).invert().multiply(b.quaternion);
    if (qa.w < 0) { qa.x = -qa.x; qa.y = -qa.y; qa.z = -qa.z; qa.w = -qa.w; }   // the short way round
    const angle = 2 * Math.acos(Math.min(1, qa.w));
    if (angle < 1e-5) return;
    axisV.set(qa.x, qa.y, qa.z).normalize();
    qb.setFromAxisAngle(axisV, angle * k);
    b.quaternion.copy(ref.rot[i]).multiply(qb);
  });
  const hips = rig.bone('Hips');
  hips.position.lerpVectors(ref.hips, hips.position, lift);
}

// Turn a bone about an axis given in world space (for example "look round": the world up axis),
// on top of whatever the mixer did. The axis is moved into the bone's parent space first.
export function turnBone(bone, worldAxis, angle) {
  bone.parent.updateWorldMatrix(true, false);
  bone.parent.getWorldQuaternion(qa);
  axisV.copy(worldAxis).applyQuaternion(qc.copy(qa).invert()).normalize();
  qb.setFromAxisAngle(axisV, angle);
  bone.quaternion.premultiply(qb);
}

// Lowest point of the feet above the floor, in world units (toes and feet).
const v = new THREE.Vector3();
export function feetHeight(rig) {
  rig.model.updateMatrixWorld(true);
  return Math.min(...['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot'].map(n => rig.bone(n).getWorldPosition(v).y));
}
