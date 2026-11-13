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
  // His left-hand fingers and thumb, and how they sit in the bind pose (straight and open)
  const fingers = side => ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].flatMap(f => [1, 2, 3].map(n => side + 'Hand' + f + n));
  const openHand = { Left: [], Right: [] };
  addBot(stage, status, 'YBot', null, { at: [START, 0, 0], turn: Math.PI / 2 }).then(async r => {
    if (!r.bones.length) return;
    for (const side in openHand)                                    // before any clip plays
      openHand[side] = fingers(side).map(n => r.bone(n)).filter(Boolean).map(b => [b, b.quaternion.clone()]);
    await r.play('Walking', { inPlace: true });
    speed = clipTravel(await loadClip('Walking')) * r.scale / r.duration;   // walk at the speed the steps travel
    rig = r;
  });

  // Which way a palm faces: along the hand crossed with across the knuckles (the other way round
  // for the right hand, which is the mirror image)
  const k1 = new THREE.Vector3(), k2 = new THREE.Vector3(), k3 = new THREE.Vector3(), k4 = new THREE.Vector3(), palmN = new THREE.Vector3();
  const palmFacing = side => () => {
    rig.bone(side + 'Hand').getWorldPosition(k1); rig.bone(side + 'HandMiddle1').getWorldPosition(k2);
    rig.bone(side + 'HandIndex1').getWorldPosition(k3); rig.bone(side + 'HandPinky1').getWorldPosition(k4);
    k2.sub(k1); k3.sub(k4);
    return side === 'Left' ? palmN.crossVectors(k2, k3).normalize() : palmN.crossVectors(k3, k2).normalize();
  };

  // A wave with one arm: upper arm pointing along `upper`, forearm upright and rocking by `rock`
  // (radians) side to side, fingers open, palm turned to face `palm` (world). w blends it in.
  // The natural turn is inwards: towards his middle (for his left hand, seen from here, that's us).
  const INWARD = { Left: new THREE.Vector3(0, 0, 1), Right: new THREE.Vector3(0, 0, -1) };
  function wave(side, upper, rock, w, palm = INWARD[side]) {
    const arm = rig.bone(side + 'Arm'), fore = rig.bone(side + 'ForeArm'), hand = rig.bone(side + 'Hand');
    openHand[side].forEach(([b, open]) => b.quaternion.slerp(open, w));   // fingers open out of the walk's relaxed curl
    aimBone(arm, fore, upper, w);
    aimBone(fore, hand, foreDir.copy(UP).addScaledVector(FORWARD, Math.tan(rock) + .1), w);
    rollBone(fore, hand, palmFacing(side), palm, w);
  }

  // Turn a bone about a world axis by a number of degrees
  const turn = (name, axis, d) => { if (d) turnBone(rig.bone(name), axis, d * deg); };

  function secondary(s, level) {
    if (level === 'subtle') {
      // He looks round at us, and gives a little wave with the hand nearest us while he does
      const g = span(s, .9, 1.25) - span(s, 2.05, 2.4);
      turn('Neck', UP, -20 * g); turn('Head', UP, -30 * g);
      const w = span(s, 1, 1.35) - span(s, 1.9, 2.25);
      // His far (left) arm: upper arm forward, out to his left and a little up, so the hand comes up
      // ahead of him beside his face, not across it; the forearm rocks about 2.4 times a second
      if (w > 0) wave('Left', armDir.copy(FORWARD).multiplyScalar(.6).addScaledVector(TOWARDS_US, -.55).addScaledVector(UP, .3),
                      18 * deg * Math.sin((s - 1) * 15), w);
    }
    if (level === 'much') {
      // Never still: the head looks everywhere, the body twists, and both arms wave wildly above
      // his shoulders, each out to its own side, rocking fast and out of step with each other,
      // palms turned naturally inwards towards each other
      turn('Spine1', UP, 18 * Math.sin(s * 5));
      turn('Neck', UP, 30 * Math.sin(s * 7)); turn('Head', UP, 35 * Math.sin(s * 7 + .6));
      turn('Head', FORWARD, 15 * Math.sin(s * 4.3));
      const lift = .7 + .25 * Math.sin(s * 3.1);                       // the arms pump up and down a little too
      wave('Right', armDir.copy(TOWARDS_US).multiplyScalar(.55).addScaledVector(UP, lift).addScaledVector(FORWARD, .25 * Math.sin(s * 4)),
           32 * deg * Math.sin(s * 19), 1);
      wave('Left', armDir.copy(TOWARDS_US).multiplyScalar(-.55).addScaledVector(UP, lift).addScaledVector(FORWARD, .3 + .2 * Math.sin(s * 3.7)),
           32 * deg * Math.sin(s * 17 + 2), 1);
    }
  }

  stage.onFrame(() => {
    if (!rig) return;
    const s = clockSeconds(clock);
    rig.model.position.x = START + speed * s;
    rig.setTime(s);
    secondary(s, settings.dataset.sec);
  });

  return { clock, frames: FRAMES, keys: [0, 26, 52], show: () => stage.start(), hide: () => stage.stop() };
}
