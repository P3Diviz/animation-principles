// 08 Secondary action, 3D view: Y Bot's Mixamo walk is the main action. The secondary action is
// added on top, after the mixer has posed him, by turning the head, neck, spine and arm bones:
//   Subtle: one glance at the camera, then a small wave.
//   Too much: the head never settles, both arms wave and the body twists. The walk gets lost.
import * as THREE from 'three';
import { studio, addBot } from '../three/studio.js';
import { clipTravel, loadClip } from '../three/rig.js';
import { turnBone } from '../three/poses.js';
import { clock3d, clockSeconds } from '../three/view.js';

export const FRAMES = 78;                          // three walk cycles, 3.1 s
const START = -2.6;
const UP = new THREE.Vector3(0, 1, 0), FORWARD = new THREE.Vector3(1, 0, 0);   // he walks along +x
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

  // Turn a bone about a world axis by a number of degrees
  const turn = (name, axis, d) => { if (d) turnBone(rig.bone(name), axis, d * deg); };

  function secondary(s, level) {
    if (level === 'subtle') {
      // A glance at the camera (he looks round towards us), then back
      const g = span(s, .9, 1.2) - span(s, 1.6, 1.9);
      turn('Neck', UP, -20 * g); turn('Head', UP, -30 * g);
      // A small wave with the near hand
      const w = span(s, 2, 2.2) - span(s, 2.7, 2.95);
      turn('RightArm', FORWARD, -75 * w);
      turn('RightForeArm', FORWARD, (-35 + 20 * Math.sin(s * 14)) * w);
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
    secondary(s, settings.dataset.sec);
  });

  return { clock, frames: FRAMES, keys: [0, 26, 52], show: () => stage.start(), hide: () => stage.stop() };
}
