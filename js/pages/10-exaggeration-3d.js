// 10 Exaggeration, 3D view: Y Bot's Mixamo Scared clip (Paul's choice: different from the Jump used
// elsewhere, and it matches the 2D balloon fright). Scared.fbx was downloaded at Mixamo's Fright Level
// 100 and Exaggeration 50. Mixamo's own sliders are baked into the file when it's downloaded, so the
// page makes its own two:
//   Fright level (0-100%, 3D only): every joint blends from a calm standing pose (a moment of the
//     Idle clip) to the captured fright. 0 = he stands calmly, 100 = the fright as captured.
//   Exaggeration (Realism to cartoon, shared with 2D): pushes the frightened pose further from calm.
//     k = 1 + amount x 0.45 (Realistic 15% = 1.07, Cartoon 1.45, Too far 1.68). Like an animator
//     pushing a pose, the arms and legs take all of it, the spine, neck and head about a third, and
//     the hips' turn and the fingers none (the hips turn his whole body); no joint is pushed more than
//     30° past the capture at Cartoon, 45° at Too far.
// The figure is lifted or lowered every frame to keep his lowest foot on the floor, because blending
// and pushing a crouch changes how far down the hips sit.
import { studio, addBot } from '../three/studio.js';
import * as THREE from 'three';
import { capturePose, scalePose, feetHeight, swingBone } from '../three/poses.js';
import { clock3d, clockSeconds } from '../three/view.js';

const $ = id => document.getElementById(id);
const CALM_AT = 1.4;                                        // a settled moment of Idle: the calm pose

// Moments in the clip (seconds): cowering, the startled leap up, the frightened stance, sinking back down
export const SCARED = { leap: 1.9, stand: 2.6, sink: 7.3, cower: 8.5 };

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [2.6, 1.3, 4.6], look: [0, .85, .2] });
  const amount = $('amount'), fright = $('fright');
  const exaggeration = () => 1 + amount.value / 100 * .45;
  const share = b => /Hips$/.test(b.name) ? 0
    : /Spine|Neck|Head/.test(b.name) ? .3
    : /Hand(Thumb|Index|Middle|Ring|Pinky)/.test(b.name) ? 0
    : /Hand/.test(b.name) ? .5 : 1;

  let rig = null, calm = null, restFeet = 0, frames = 252;
  const clock = clock3d(canvas, frames);
  const view = { clock, frames, keys: [], ready: null };

  view.ready = addBot(stage, status, 'YBot', 'Idle', { turn: -.5 }).then(async r => {
    if (!r.bones.length) return;
    rig = r;
    rig.setTime(CALM_AT); calm = capturePose(rig); restFeet = feetHeight(rig);
    if (!(await rig.play('Scared'))) return;
    frames = Math.round(rig.duration * 25);
    clock.effect.updateTiming({ duration: frames * 40 });
    view.frames = frames;
    view.keys = [SCARED.leap, SCARED.stand, SCARED.sink, SCARED.cower].map(t => Math.round(t * 25));
    status.textContent = rig.note;
  });

  // Hands out of the legs. In the captured clip his hands sink into his thighs while he sits cowering
  // (Paul spotted it on Mixamo's own preview too: up to 10 cm, measured). Each leg is treated as two
  // capsules (thigh 9 cm, shin 7 cm radius, measured off the Y Bot's mesh); the deepest-sunk hand
  // point is swung out at the elbow to just outside the surface, straight out from the leg's centre
  // line (for a hand resting on a thigh, that is up). A few passes per hand, against both legs.
  const LEGS = [['UpLeg', 'Leg', .09], ['Leg', 'Foot', .07]];
  const POINTS = ['Hand', 'HandMiddle1', 'HandMiddle3', 'HandIndex3', 'HandThumb3'];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), P = new THREE.Vector3(), C = new THREE.Vector3(), T = new THREE.Vector3();
  const HAND = .015, CLEAR = .006;                          // the hand's own thickness, and a small gap
  function deepest(side) {                                  // the hand point furthest inside a leg
    let worst = 0, point = null;
    for (const leg of ['Left', 'Right']) for (const [a, b, r] of LEGS) {
      rig.bone(leg + a).getWorldPosition(A); rig.bone(leg + b).getWorldPosition(B);
      const ab = B.clone().sub(A), l2 = ab.lengthSq();
      for (const name of POINTS) {
        const bone = rig.bone(side + name); if (!bone) continue;
        bone.getWorldPosition(P);
        C.copy(A).addScaledVector(ab, Math.max(0, Math.min(1, P.clone().sub(A).dot(ab) / l2)));
        const depth = r + HAND - P.distanceTo(C);
        if (depth > worst) { worst = depth; point = { p: P.clone(), out: P.clone().sub(C).normalize(), depth }; }
      }
    }
    return point;
  }
  function keepHandsOut(passes) {
    rig.model.updateMatrixWorld(true);
    for (const side of ['Left', 'Right']) for (let pass = 0; pass < passes; pass++) {
      const hit = deepest(side);
      if (!hit) break;
      T.copy(hit.p).addScaledVector(hit.out, hit.depth + CLEAR);
      swingBone(rig.bone(side + 'ForeArm'), hit.p, T);
    }
  }

  // Pose him at clip time t: the capture, blended towards calm by the fright level, then pushed
  function bodyPose(t) {
    rig.model.position.y = 0;
    rig.setTime(t);
    const f = fright.value / 100, k = exaggeration();
    scalePose(rig, calm, f);                                // fright: from calm (0) to the capture (1)
    scalePose(rig, calm, k, 1 + (k - 1) * .7, share, (k - 1) / .45 * 30 * Math.PI / 180);
    rig.model.position.y = restFeet - feetHeight(rig);      // the lowest foot back on the floor
  }

  // Worked out frame by frame, the hand fix would jump wherever the deepest point moves from one leg
  // to the other, or a hand sweeps quickly past a thigh (measured: steps of 32 cm in a frame, against
  // 14 cm without the fix). So, as the springs on 05 do, it's worked out ahead for every frame of the
  // clip whenever a slider changes (about 25 ms), smoothed over neighbouring frames, and played back
  // (scrubbing stays exact). A live pass on top brought the jumps back, so there isn't one.
  const SMOOTH = 3;                                         // frames either side, weighted
  let fixes = null, dirty = true;
  const SIDES = ['Left', 'Right'];
  const angle = q => 2 * Math.acos(Math.min(1, Math.abs(q.w)));
  // A sequence of turns, smoothed: each frame's strongest turn is spread to its neighbours first (so
  // the deepest moments keep their full lift), then averaged (so it eases in and out ahead of them)
  function smoothTurns(list) {
    const n = list.length, at = (l, i) => l[Math.min(n - 1, Math.max(0, i))];
    const wide = list.map((_, i) => {
      let best = list[i];
      for (let d = -SMOOTH; d <= SMOOTH; d++) if (angle(at(list, i + d)) > angle(best)) best = at(list, i + d);
      return best;
    });
    return wide.map((_, i) => {
      const sum = new THREE.Quaternion(0, 0, 0, 0);
      for (let d = -SMOOTH; d <= SMOOTH; d++) {
        const q = at(wide, i + d), w = Math.exp(-(d * d) / (SMOOTH * SMOOTH / 2)), sign = q.w < 0 ? -1 : 1;   // the short way round
        sum.x += q.x * w * sign; sum.y += q.y * w * sign; sum.z += q.z * w * sign; sum.w += q.w * w * sign;
      }
      return sum.normalize();
    });
  }
  // Three rounds: apply the fixes so far, find what is still inside a leg, work out a further fix for
  // it on every frame, smooth that, and add it on. Each round stays smooth; what's left shrinks.
  function prepare() {
    const n = Math.round(rig.duration * 25) + 1;
    const fore = { Left: rig.bone('LeftForeArm'), Right: rig.bone('RightForeArm') };
    fixes = { Left: Array.from({ length: n }, () => new THREE.Quaternion()), Right: Array.from({ length: n }, () => new THREE.Quaternion()) };
    for (let round = 0; round < 3; round++) {
      const extra = { Left: [], Right: [] };
      for (let i = 0; i < n; i++) {
        bodyPose(Math.min(i / 25, rig.duration - .01));
        SIDES.forEach(s => fore[s].quaternion.premultiply(fixes[s][i]));
        const before = { Left: fore.Left.quaternion.clone(), Right: fore.Right.quaternion.clone() };
        keepHandsOut(6);
        SIDES.forEach(s => extra[s].push(fore[s].quaternion.clone().multiply(before[s].invert())));   // the turn this round added
      }
      SIDES.forEach(s => { const more = smoothTurns(extra[s]); fixes[s] = fixes[s].map((q, i) => more[i].clone().multiply(q)); });
    }
    dirty = false;
  }
  const qa = new THREE.Quaternion();
  function pose(t) {
    if (dirty) prepare();
    bodyPose(t);
    const x = t * 25, i = Math.min(fixes.Left.length - 2, Math.floor(x)), k = Math.min(1, x - i);
    for (const s of SIDES) {
      qa.slerpQuaternions(fixes[s][i], fixes[s][i + 1], k);
      rig.bone(s + 'ForeArm').quaternion.premultiply(qa);
    }
  }
  [amount, fright].forEach(s => s.addEventListener('input', () => { dirty = true; }));
  document.querySelectorAll('#presets button').forEach(b => b.addEventListener('click', () => { dirty = true; }));

  stage.onFrame(() => {
    if (!rig || !calm) return;
    pose(Math.min(clockSeconds(clock), rig.duration - .01));
  });

  // pose(t) and rig are also used to measure the poses (hand clearance) from the page.
  // (rig is defined as a getter: Object.assign would copy its value at this moment, which is null.)
  Object.defineProperty(view, 'rig', { get: () => rig });
  return Object.assign(view, { show: () => stage.start(), hide: () => stage.stop(), pose: t => rig && calm && pose(t) });
}
