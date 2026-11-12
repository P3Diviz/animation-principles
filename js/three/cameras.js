// Named camera shots with eased moves (never cuts).
//
//   const shots = createShots(camera, {
//     wide: { pos: [0, 2.3, 8], look: [0, 1.2, 0] },
//     mid:  { pos: [.3, 1.55, 2.2], look: [0, 1.3, 0], follow: true }   // follow: relative to the focus
//   });
//   shots.set('mid'); shots.setFocus(subjectPosition);
//   stage.onFrame(dt => shots.update(dt));
import * as THREE from 'three';
import { reducedMotion } from './stage.js';

const EASE = .06;   // share of the remaining distance covered per frame at 60 fps (from the reference)

export function createShots(camera, shots, first = Object.keys(shots)[0]) {
  const focus = new THREE.Vector3();
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  const goalPos = new THREE.Vector3(), goalLook = new THREE.Vector3();
  let shot = shots[first];
  let length = shot.wedge ?? 0;                          // plot wedge length, eased with the camera

  function goal() {
    goalPos.fromArray(shot.pos); goalLook.fromArray(shot.look);
    if (shot.follow) { goalPos.add(focus); goalLook.add(focus); }
  }
  goal(); pos.copy(goalPos); look.copy(goalLook);

  return {
    pos, look,
    get wedge() { return length; },
    set(name) { shot = shots[name]; },
    setFocus(v) { focus.copy(v); },

    // Ease towards the shot. Frame-rate independent; snaps under reduced motion.
    // Returns true while the camera is still moving.
    update(dt) {
      goal();
      const k = reducedMotion ? 1 : 1 - Math.pow(1 - EASE, dt * 60);
      pos.lerp(goalPos, k); look.lerp(goalLook, k);
      length += ((shot.wedge ?? 0) - length) * k;
      camera.position.copy(pos);
      camera.lookAt(look);
      return pos.distanceToSquared(goalPos) > 1e-6 || look.distanceToSquared(goalLook) > 1e-6;
    }
  };
}
