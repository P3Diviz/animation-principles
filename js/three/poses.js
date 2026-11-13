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
// share(bone), if given, says how much of the push each bone takes (1 = all of it, 0 = none):
// for example less for the spine, so the torso doesn't fold over.
// maxExtra (radians), if given, caps how much further any joint is pushed: small moves are pushed
// in full, but a joint that already turns a long way (an arm swung overhead) isn't flung past it.
export function scalePose(rig, ref, k, lift = k, share = null, maxExtra = Infinity) {
  rig.bones.forEach((b, i) => {
    const kb = share ? 1 + (k - 1) * share(b) : k;
    // The turn from the reference to now, as an angle about an axis. Scale the angle.
    qa.copy(ref.rot[i]).invert().multiply(b.quaternion);
    if (qa.w < 0) { qa.x = -qa.x; qa.y = -qa.y; qa.z = -qa.z; qa.w = -qa.w; }   // the short way round
    const angle = 2 * Math.acos(Math.min(1, qa.w));
    if (angle < 1e-5) return;
    axisV.set(qa.x, qa.y, qa.z).normalize();
    const extra = Math.max(-maxExtra, Math.min(maxExtra, angle * (kb - 1)));
    qb.setFromAxisAngle(axisV, angle + extra);
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

// Point a bone in a direction (world space): turn it so the line from it to `child` (the next bone
// down the limb) points along `dir`. weight 0..1 blends from where the animation had it.
const pA = new THREE.Vector3(), pB = new THREE.Vector3(), now = new THREE.Vector3(), aim = new THREE.Vector3();
const qd = new THREE.Quaternion(), qi = new THREE.Quaternion(), qp = new THREE.Quaternion();
export function aimBone(bone, child, dir, weight = 1) {
  if (weight <= 0) return;
  bone.updateWorldMatrix(true, true);
  bone.getWorldPosition(pA); child.getWorldPosition(pB);
  now.subVectors(pB, pA).normalize();
  aim.copy(dir).normalize();
  qd.setFromUnitVectors(now, aim);                       // the turn needed, in world space
  qd.slerp(qi.identity(), 1 - weight);
  bone.parent.getWorldQuaternion(qp);                    // into the parent's space, then apply
  qd.premultiply(qp.clone().invert()).multiply(qp);
  bone.quaternion.premultiply(qd);
  bone.updateWorldMatrix(false, true);
}

// Roll a bone about its own length (bone to child) so that a direction it carries (for example the
// palm's facing, given by facing()) turns towards `want` (world space). weight 0..1 blends it in.
const ax = new THREE.Vector3(), f1 = new THREE.Vector3(), f2 = new THREE.Vector3();
export function rollBone(bone, child, facing, want, weight = 1) {
  if (weight <= 0) return;
  bone.updateWorldMatrix(true, true);
  bone.getWorldPosition(pA); child.getWorldPosition(pB);
  ax.subVectors(pB, pA).normalize();
  f1.copy(facing()).projectOnPlane(ax).normalize();      // the facing now, across the bone
  f2.copy(want).projectOnPlane(ax).normalize();          // the facing we want, across the bone
  if (f1.lengthSq() < .5 || f2.lengthSq() < .5) return;
  const angle = Math.atan2(f1.clone().cross(f2).dot(ax), f1.dot(f2));
  turnBone(bone, ax, angle * weight);
  bone.updateWorldMatrix(false, true);
}

// Lowest point of the feet above the floor, in world units (toes and feet).
const v = new THREE.Vector3();
export function feetHeight(rig) {
  rig.model.updateMatrixWorld(true);
  return Math.min(...['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot'].map(n => rig.bone(n).getWorldPosition(v).y));
}
