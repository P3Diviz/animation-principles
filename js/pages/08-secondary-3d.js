// 08 Secondary action, 3D view: Y Bot's Mixamo walk is the main action. The secondary action is
// added on top, after the mixer has posed him, by turning the head, neck, spine and arm bones:
//   Subtle: he looks round at us and gives a small wave while he does.
//   Too much: the head never settles, both arms wave and the body twists. The walk gets lost.
import * as THREE from 'three';
import { studio, addBot } from '../three/studio.js';
import { clipTravel, loadClip } from '../three/rig.js';
import { turnBone, aimBone, rollBone } from '../three/poses.js';
import { clock3d, clockSeconds } from '../three/view.js';

export const FRAMES = 78;                          // three walk cycles, 3.1 s
const START = -2.6;
const UP = new THREE.Vector3(0, 1, 0), FORWARD = new THREE.Vector3(1, 0, 0);   // he walks along +x
const TOWARDS_US = new THREE.Vector3(0, 0, 1);                                  // the camera is on his right
const armDir = new THREE.Vector3(), foreDir = new THREE.Vector3();
const deg = Math.PI / 180;
const clamp = t => Math.max(0, Math.min(1, t));
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const span = (s, a, b) => smooth((s - a) / (b - a));

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [0, 1.35, 4.8], look: [0, .95, 0] });   // he walks in from the left and out at the right
  const clock = clock3d(canvas, FRAMES);
  const settings = document.getElementById('stage');

  let rig = null, speed = 0;
  addBot(stage, status, 'YBot', 'Walking', { at: [START, 0, 0], turn: Math.PI / 2, inPlace: true }).then(async r => {
    if (!r.bones.length) return;
    speed = clipTravel(await loadClip('Walking')) * r.scale / r.duration;   // walk at the speed the steps travel
    rig = r;
  });

  // Which way his left palm faces: across the knuckles crossed with along the hand
  const k1 = new THREE.Vector3(), k2 = new THREE.Vector3(), k3 = new THREE.Vector3(), k4 = new THREE.Vector3(), palmN = new THREE.Vector3();
  function palmFacing() {
    rig.bone('LeftHand').getWorldPosition(k1); rig.bone('LeftHandMiddle1').getWorldPosition(k2);
    rig.bone('LeftHandIndex1').getWorldPosition(k3); rig.bone('LeftHandPinky1').getWorldPosition(k4);
    return palmN.crossVectors(k2.sub(k1), k3.sub(k4)).normalize();
  }

  // Turn a bone about a world axis by a number of degrees
  const turn = (name, axis, d) => { if (d) turnBone(rig.bone(name), axis, d * deg); };

  function secondary(s, level) {
    if (level === 'subtle') {
      // He looks round at us, and gives a little wave with the hand nearest us while he does
      const g = span(s, .9, 1.25) - span(s, 2.05, 2.4);
      turn('Neck', UP, -20 * g); turn('Head', UP, -30 * g);
      const w = span(s, 1, 1.35) - span(s, 1.9, 2.25);
      if (w > 0) {
        // His far (left) arm: upper arm forward, out to his left and a little up, so the hand comes up
        // ahead of him beside his face, not across it. Forearm upright, rocking side to side in the
        // plane we see; then the forearm is rolled so his palm faces us.
        const arm = rig.bone('LeftArm'), fore = rig.bone('LeftForeArm'), hand = rig.bone('LeftHand');
        aimBone(arm, fore, armDir.copy(FORWARD).multiplyScalar(.6).addScaledVector(TOWARDS_US, -.55).addScaledVector(UP, .3), w);
        const rock = 18 * deg * Math.sin((s - 1) * 15);   // the wave: side to side, about 2.4 times a second
        aimBone(fore, hand, foreDir.copy(UP).addScaledVector(FORWARD, Math.tan(rock) + .1), w);
        rollBone(fore, hand, palmFacing, TOWARDS_US, w);
      }
    }
    if (level === 'much') {
      // Never still: the head looks everywhere, both arms wave, the body twists
      turn('Spine1', UP, 18 * Math.sin(s * 5));
      turn('Neck', UP, 30 * Math.sin(s * 7)); turn('Head', UP, 35 * Math.sin(s * 7 + .6));
      turn('Head', FORWARD, 15 * Math.sin(s * 4.3));
      turn('RightArm', FORWARD, -140 + 30 * Math.sin(s * 11));
      turn('RightForeArm', FORWARD, 40 * Math.sin(s * 15));
      turn('LeftArm', FORWARD, 130 + 30 * Math.sin(s * 9 + 1));
      turn('LeftForeArm', FORWARD, 40 * Math.sin(s * 13 + 2));
    }
  }

  stage.onFrame(() => {
    if (!rig) return;
    const s = clockSeconds(clock);
    rig.model.position.x = START + speed * s;
    rig.setTime(s);
    secondary(s, settings.dataset.sec);  });

  return { clock, frames: FRAMES, keys: [0, 26, 52], show: () => stage.start(), hide: () => stage.stop() };
}
