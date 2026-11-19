// 10 Exaggeration, 3D view: Y Bot's Mixamo Scared clip (Paul's choice: different from the Jump used
// elsewhere, and it matches the 2D balloon fright). He sits as if on a chair, flinches, leaps up and
// looks round, then sinks back down. Scared.fbx was downloaded at Mixamo's Fright Level 100.
//
// Exaggeration (Realism to cartoon, shared with 2D) exaggerates the MOVEMENT, not the poses (Paul):
// the seated start and end stay exactly as captured at every setting (exaggeration fades out while he
// sits), and the flinch, the leap up and the looks round get bigger. How: a smoothed copy of the clip is worked out once (every joint averaged
// over about half a second, which keeps the slow, held poses and drops the quick action), and each
// frame is pushed away from that copy by k = 1 + amount x 0.45 (Realistic 15% = 1.07, Cartoon 1.45,
// Too far 1.68). Arms, legs, neck and head take all of it, the spine 70%, the hips' turn half, the
// fingers none; no joint is pushed more than 30° past the capture at Cartoon, 45° at Too far.
// Starting pose (Standing to sitting, 3D only): the still parts at the start and end blend from a
// calm standing pose (Idle at 1.4 s) to the captured sitting pose. The fright plays the same.
// Feet: where his feet are on the floor in the capture they're kept on the floor; where the clip
// lifts them they keep its height. Hands are kept out of his legs (see keepHandsOut).
import * as THREE from 'three';
import { studio, addBot } from '../three/studio.js';
import { capturePose, scalePose, feetHeight, swingBone, turnBone } from '../three/poses.js';
import { clock3d, clockSeconds } from '../three/view.js';

const $ = id => document.getElementById(id);
const CALM_AT = 1.4;                                        // a settled moment of Idle: the calm standing pose
// The smoothed copy is wide (about 2 s either side), so it settles near his average stance: the slow
// looks round and the move from sitting to standing count as movement too (with a half-second window
// they were followed by the copy and hardly grew).
const SMOOTH_MOVE = 50;
const PUSH = .9, CAP = 40;                                  // k = 1 + amount x PUSH; at most CAP° past the capture at Cartoon
// The startled leap gets an animator's hop: keeping his feet on the floor stops the hips rising any
// higher, so at the leap he leaves the floor by HOP x (k - 1) / PUSH metres (20 cm at Cartoon, 30 at
// Too far), with his knees bending to tuck his feet up and back while he's off the floor (Paul: the
// feet looked pinned to the floor)
const HOP = .2, TUCK = .7;                                  // tuck: how far the feet come up, against the hop
const hop = t => t < 1.75 || t > 2.3 ? 0 : t < 1.97 ? Math.sin((t - 1.75) / .22 * Math.PI / 2) : Math.cos((t - 1.97) / .33 * Math.PI / 2);
// The scare while he's still sitting (1.15-1.8 s: he hunches forward, hands to his knees) gets a sharp
// forward jerk, bigger for each setting (Paul): LEAN degrees through the spine at Cartoon, and a head jolt
// (15° and the full movement push together folded him to his knees at Cartoon: "a little more" each)
const LEAN = 8, JOLT = 6, SEATED_PUSH = .6;                 // the movement push is 60% while he's still sitting
const jerk = t => t < 1.15 || t > 1.85 ? 0 : t < 1.32 ? Math.sin((t - 1.15) / .17 * Math.PI / 2) : t < 1.55 ? 1 : Math.cos((t - 1.55) / .3 * Math.PI / 2);

// Moments in the clip (seconds): sitting, the startled leap up, the frightened stance, sinking back down
export const SCARED = { leap: 1.9, stand: 2.6, sink: 7.3, cower: 8.5 };
// How much of each moment is "sitting still" (for the Starting pose slider): all of it before the
// flinch, none of it while he's up, easing between
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Sitting still: up to 1.1 s (after that the scare begins, and it should grow too), and again once
// he has sat back down
const seated = t => Math.max(1 - smooth(t, 1, 1.2), smooth(t, 7.6, 8.6));
// For the Starting pose slider: the whole time he's sitting, the scare while seated included
const sittingPart = t => Math.max(1 - smooth(t, 1.3, 2.1), smooth(t, 7.4, 8.5));

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [2.6, 1.3, 4.6], look: [0, .85, .2] });
  const amount = $('amount'), sitting = $('sitting');
  const exaggeration = () => 1 + amount.value / 100 * PUSH;
  const share = b => /Hips$/.test(b.name) ? .5
    : /Spine/.test(b.name) ? .7
    : /Hand(Thumb|Index|Middle|Ring|Pinky)/.test(b.name) ? 0
    : /Hand/.test(b.name) ? .5 : 1;

  let rig = null, calm = null, restFeet = 0, frames = 252, n = 0;
  let smoothed = null, feetCaptured = null;                 // per frame of the clip, worked out once
  const clock = clock3d(canvas, frames);
  const view = { clock, frames, keys: [], ready: null };

  view.ready = addBot(stage, status, 'YBot', 'Idle', { turn: -.5 }).then(async r => {
    if (!r.bones.length) return;
    rig = r;
    rig.setTime(CALM_AT); calm = capturePose(rig); restFeet = feetHeight(rig);
    if (!(await rig.play('Scared'))) return;
    frames = Math.round(rig.duration * 25); n = frames + 1;
    clock.effect.updateTiming({ duration: frames * 40 });
    view.frames = frames;
    view.keys = [SCARED.leap, SCARED.stand, SCARED.sink, SCARED.cower].map(t => Math.round(t * 25));
    capture();
    status.textContent = rig.note;
  });

  // The capture, frame by frame: its smoothed copy (each joint's turn averaged over neighbouring
  // frames, the short way round), and how high its lowest foot is
  function capture() {
    const poses = [];
    feetCaptured = [];
    for (let i = 0; i < n; i++) {
      rig.model.position.y = 0;
      rig.setTime(Math.min(i / 25, rig.duration - .01));
      poses.push(capturePose(rig));
      feetCaptured.push(feetHeight(rig));
    }
    const at = i => poses[Math.min(n - 1, Math.max(0, i))];
    smoothed = poses.map((p, i) => {
      const rot = p.rot.map((q0, b) => {
        const sum = new THREE.Quaternion(0, 0, 0, 0);
        for (let d = -SMOOTH_MOVE; d <= SMOOTH_MOVE; d++) {
          const q = at(i + d).rot[b], w = Math.exp(-(d * d) / (SMOOTH_MOVE * SMOOTH_MOVE / 2));
          const sign = q.dot(q0) < 0 ? -1 : 1;
          sum.x += q.x * w * sign; sum.y += q.y * w * sign; sum.z += q.z * w * sign; sum.w += q.w * w * sign;
        }
        return sum.normalize();
      });
      const hips = new THREE.Vector3(); let total = 0;
      for (let d = -SMOOTH_MOVE; d <= SMOOTH_MOVE; d++) { const w = Math.exp(-(d * d) / (SMOOTH_MOVE * SMOOTH_MOVE / 2)); hips.addScaledVector(at(i + d).hips, w); total += w; }
      return { rot, hips: hips.multiplyScalar(1 / total) };
    });
  }

  // The smoothed pose at clip time t (between two frames)
  const ref = { rot: [], hips: new THREE.Vector3() };
  function smoothedAt(t) {
    const x = t * 25, i = Math.min(n - 2, Math.floor(x)), k = Math.min(1, x - i), a = smoothed[i], b = smoothed[i + 1];
    a.rot.forEach((q, j) => { (ref.rot[j] ??= new THREE.Quaternion()).slerpQuaternions(q, b.rot[j], k); });
    ref.hips.lerpVectors(a.hips, b.hips, k);
    return ref;
  }
  const feetAt = t => { const x = t * 25, i = Math.min(n - 2, Math.floor(x)); return feetCaptured[i] + (feetCaptured[i + 1] - feetCaptured[i]) * Math.min(1, x - i); };

  // Pose him at clip time t, before the hand fix
  function bodyPose(t) {
    rig.model.position.y = 0;
    rig.setTime(t);
    // Bigger movement while he's up; none at all while he sits (he fidgets a little there, and the
    // start and end must stay exactly as captured)
    const k = 1 + (exaggeration() - 1) * (1 - seated(t)) * (1 - (1 - SEATED_PUSH) * sittingPart(t));
    if (k > 1.0001) scalePose(rig, smoothedAt(t), k, k, share, (k - 1) / PUSH * CAP * Math.PI / 180);
    const s = sitting.value / 100, toCalm = 1 - (1 - s) * sittingPart(t);
    if (toCalm < 1) scalePose(rig, calm, toCalm);           // the still parts: from standing (0) to sitting (1)
    const more = (k - 1) / PUSH;                             // 0 as captured, 1 at Cartoon, 1.5 at Too far
    if (more > 0 && jerk(t) > 0) {                          // the forward jerk, about his own hip line
      rig.model.updateMatrixWorld(true);
      rig.bone('LeftUpLeg').getWorldPosition(A); rig.bone('RightUpLeg').getWorldPosition(B);
      const across = A.sub(B).normalize(), a = more * jerk(t) * Math.PI / 180;   // towards his left: a positive turn leans him forward
      ['Spine', 'Spine1', 'Spine2'].forEach(n => turnBone(rig.bone(n), across, a * LEAN / 3));
      turnBone(rig.bone('Head'), across, a * JOLT);
    }
    const captured = feetAt(t);
    const floor = captured < restFeet + .03 || toCalm < 1 ? restFeet : captured;   // on the floor, or lifted as in the clip
    const up = HOP * more * hop(t);
    rig.model.position.y = floor - feetHeight(rig) + up;
    if (up > .005) tuckFeet(up * TUCK);
  }
  // While he's off the floor, bend each knee so the foot comes up and back by `lift` metres
  function tuckFeet(lift) {
    rig.model.updateMatrixWorld(true);
    for (const side of SIDES) {
      rig.bone(side + 'Foot').getWorldPosition(P); rig.bone(side + 'ToeBase').getWorldPosition(C);
      const ahead = C.sub(P).setY(0).normalize();           // the way the foot points
      T.copy(P).add(new THREE.Vector3(0, lift, 0)).addScaledVector(ahead, -lift * .6);
      swingBone(rig.bone(side + 'Leg'), P, T);
    }
  }

  // Hands out of the legs. In the captured clip his hands sink into his thighs while he sits (Paul
  // spotted it on Mixamo's own preview too: up to 10 cm, measured). Each leg is treated as two capsules
  // (thigh 9 cm, shin 7 cm radius, measured off the Y Bot's mesh by skin weight); the deepest-sunk hand
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
    for (const side of SIDES) for (let pass = 0; pass < passes; pass++) {
      const hit = deepest(side);
      if (!hit) break;
      T.copy(hit.p).addScaledVector(hit.out, hit.depth + CLEAR);
      swingBone(rig.bone(side + 'ForeArm'), hit.p, T);
    }
  }

  // Worked out frame by frame, the hand fix would jump wherever the deepest point moves from one leg
  // to the other, or a hand sweeps quickly past a thigh (measured: steps of 32 cm in a frame, against
  // 14 cm without the fix). So, as the springs on 05 do, it's worked out ahead for every frame of the
  // clip whenever a slider changes (about 200 ms) and played back (scrubbing stays exact). Twelve rounds:
  // apply the fixes so far, find what is still inside a leg, work out a further fix, smooth it, add it.
  // (Fewer left the hand up to 9 cm into the thigh for a few frames of the exaggerated scare.)
  const SIDES = ['Left', 'Right'], SMOOTH = 3, ROUNDS = 12;
  const angle = q => 2 * Math.acos(Math.min(1, Math.abs(q.w)));
  // A sequence of turns, smoothed: each frame's strongest turn is spread to its neighbours first (so
  // the deepest moments keep their full lift), then averaged (so it eases in and out ahead of them)
  function smoothTurns(list) {
    const at = (l, i) => l[Math.min(n - 1, Math.max(0, i))];
    const wide = list.map((_, i) => {
      let best = list[i];
      for (let d = -SMOOTH; d <= SMOOTH; d++) if (angle(at(list, i + d)) > angle(best)) best = at(list, i + d);
      return best;
    });
    return wide.map((_, i) => {
      const sum = new THREE.Quaternion(0, 0, 0, 0);
      for (let d = -SMOOTH; d <= SMOOTH; d++) {
        const q = at(wide, i + d), w = Math.exp(-(d * d) / (SMOOTH * SMOOTH / 2)), sign = q.w < 0 ? -1 : 1;
        sum.x += q.x * w * sign; sum.y += q.y * w * sign; sum.z += q.z * w * sign; sum.w += q.w * w * sign;
      }
      return sum.normalize();
    });
  }
  let fixes = null, dirty = true;
  function prepare() {
    const fore = { Left: rig.bone('LeftForeArm'), Right: rig.bone('RightForeArm') };
    fixes = { Left: Array.from({ length: n }, () => new THREE.Quaternion()), Right: Array.from({ length: n }, () => new THREE.Quaternion()) };
    for (let round = 0; round < ROUNDS; round++) {
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
    const x = t * 25, i = Math.min(n - 2, Math.floor(x)), k = Math.min(1, x - i);
    for (const s of SIDES) {
      qa.slerpQuaternions(fixes[s][i], fixes[s][i + 1], k);
      rig.bone(s + 'ForeArm').quaternion.premultiply(qa);
    }
  }
  [amount, sitting].forEach(s => s.addEventListener('input', () => { dirty = true; }));
  document.querySelectorAll('#presets button').forEach(b => b.addEventListener('click', () => { dirty = true; }));

  stage.onFrame(() => {
    if (!rig || !smoothed) return;
    pose(Math.min(clockSeconds(clock), rig.duration - .01));
  });

  // pose(t) and rig are also used to measure the poses (hand clearance) from the page.
  // (rig is defined as a getter: Object.assign would copy its value at this moment, which is null.)
  Object.defineProperty(view, 'rig', { get: () => rig });
  return Object.assign(view, { show: () => stage.start(), hide: () => stage.stop(), pose: t => rig && smoothed && pose(t) });
}
