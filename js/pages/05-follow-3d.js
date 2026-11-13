// 05 Follow through, 3D view: Y Bot's Mixamo Run To Stop wearing a cloak.
// The cloak swings like a chain of three linked pendulums hung from his shoulders: top, middle
// and bottom bands (the same idea as the 2D page's springs: parts pushed by the body's
// acceleration). While he runs, the air holds it out behind him at an angle set by his speed.
// When he stops, it carries on forward (follow through), each band a moment after the one above
// (overlapping action), then settles. Damping is built in, so it can't whip around.
// The cloth is built down from his shoulders and pushed out round his body and legs as it goes,
// so it drapes over them instead of passing through.
// Stiffness: loose fabric bends between the bands (a wave runs down it, the hem lags well behind);
// stiff fabric moves almost as one panel. Off: the cloak hangs straight.
// Watch: the run plays and loops. Drag it: the figure stands (Idle) and follows the pointer.
// The physics runs live, so this view has no timeline.
import * as THREE from 'three';
import { studio, addBot } from '../three/studio.js';
import { std, reducedMotion } from '../three/stage.js';
import { RUN_STOP } from '../three/clips.js';

const $ = id => document.getElementById(id);
const COLS = 13, ROWS = 24;                      // cloth mesh grid (fine enough that a leg can't slip between points)
const BANDS = [.28, .28, .27];                   // lengths of the three bands (shoulders to below the knee)
const TOTAL = BANDS.reduce((a, b) => a + b);
const TOP_W = .36, BOTTOM_W = .66;               // width across the shoulders and at the hem
const LOOP = 1.8 + 2.2;                          // the run, then a hold while the cloak settles
const START_X = -1.4;                            // where the run starts (it travels about 2.6 to the right)
const STEP = 1 / 120, G = 9.8;
const AIR = 2.2;                                 // air drag: holds the cloak out behind as he runs
const deg = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const idx = (i, j) => j * COLS + i;

// His back, measured off the Y Bot's surface: how far it reaches behind the spine at each height,
// from 30% of the hips-to-neck distance below the hips (k = -0.3, his seat) up to the neck (k = 1).
const BACK_DEPTH = [.117, .126, .149, .161, .159, .135, .131, .110, .119, .116, .130, .138, .138, .130];
const BACK_HALF_WIDTH = .21;                     // his torso, side to side (without the arms)
const MARGIN = .03;                              // the cloth rests this far off him
// His legs and arms, as capsules the cloth goes round: [from bone, to bone, radius]
const LIMBS = [['LeftUpLeg', 'LeftLeg', .095], ['LeftLeg', 'LeftFoot', .075],
               ['RightUpLeg', 'RightLeg', .095], ['RightLeg', 'RightFoot', .075],
               ['LeftArm', 'LeftForeArm', .06], ['LeftForeArm', 'LeftHand', .055],
               ['RightArm', 'RightForeArm', .06], ['RightForeArm', 'RightHand', .055]];

export function create({ stageEl, canvas, status }) {
  // Three-quarter view from behind him, so the cloak shows its surface rather than its edge
  const { stage } = studio(stageEl, canvas, { pos: [-2.6, 1.75, 3.9], look: [.1, .95, 0] });
  const main = $('main'), stiffInput = $('stiff');
  const v = new THREE.Vector3(), w = new THREE.Vector3(), q = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);

  // ----- The cloth mesh -----
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(new Float32Array(COLS * ROWS * 3), 3);
  geo.setAttribute('position', posAttr);
  const index = [];
  for (let j = 0; j < ROWS - 1; j++) for (let i = 0; i < COLS - 1; i++) {
    const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), d = idx(i + 1, j + 1);
    index.push(a, c, b, b, c, d);
  }
  geo.setIndex(index);
  const mat = std('#8E8E9A', .9);
  mat.side = THREE.DoubleSide;
  const cloak = new THREE.Mesh(geo, mat);
  cloak.castShadow = true; cloak.frustumCulled = false; cloak.visible = false;
  stage.scene.add(cloak);

  // ----- The swing: each band's angle from hanging straight down (+ = out behind him, - = forward) -----
  const ang = [0, 0, 0], spin = [0, 0, 0], turn = [0, 0, 0];
  let speed = 0, accel = 0;                        // his forward speed and acceleration (smoothed)
  const pin = new THREE.Vector3(), lastPin = new THREE.Vector3();
  const back = new THREE.Vector3(), side = new THREE.Vector3(), fwd = new THREE.Vector3();
  const bones = {};
  ['Hips', 'Neck', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand',
   'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot']
    .forEach(n => { bones[n] = new THREE.Vector3(); });
  const spine = new THREE.Vector3();               // hips to neck, this frame

  let rig = null, t = 0, dragX = 0, targetX = 0, spare = 0, fresh = true;
  const mode = () => main.dataset.mode === 'drag' ? 'drag' : 'watch';
  addBot(stage, status, 'YBot', null, { at: [START_X, 0, 0], turn: Math.PI / 2 }).then(async r => {
    if (!r.bones.length) return;
    rig = r;
    await startMode();
    cloak.visible = true;
  });

  async function startMode() {
    if (!rig) return;
    t = 0; dragX = targetX = 0;
    rig.model.position.x = mode() === 'drag' ? 0 : START_X;
    await rig.play(mode() === 'drag' ? 'Idle' : 'RunToStop');
    rig.setTime(0);
    fresh = true;
  }
  main.addEventListener('statechange', e => { if (e.detail.attr === 'mode') startMode(); });

  // Where the cloak is pinned (across his shoulders, just behind his neck), which way is back,
  // and where his body and legs are
  function readBody() {
    rig.model.updateMatrixWorld(true);
    for (const n in bones) rig.bone(n).getWorldPosition(bones[n]);
    rig.model.getWorldQuaternion(q);
    back.set(0, 0, -1).applyQuaternion(q);       // he faces +z in his own space
    fwd.copy(back).negate();
    side.crossVectors(UP, back).normalize();
    pin.lerpVectors(bones.LeftArm, bones.RightArm, .5).addScaledVector(back, .12);
    pin.y = bones.Neck.y - .04;
    spine.subVectors(bones.Neck, bones.Hips);
  }

  // His forward speed and acceleration, from the pin's movement (smoothed, so the bounce of each
  // stride doesn't jiggle the cloak). A jump back to the start of the loop is ignored.
  function measure(dt) {
    if (fresh || pin.distanceTo(lastPin) > .5) {
      // Start already moving with him: the cloak streams out at his speed, nothing yanks it
      speed = runStartSpeed();
      accel = 0;
      ang.fill(Math.atan(AIR * speed / G)); spin.fill(0);
      lastPin.copy(pin); fresh = false;
      return;
    }
    const s = v.subVectors(pin, lastPin).dot(fwd) / dt;
    lastPin.copy(pin);
    const k = 1 - Math.exp(-dt / .08);             // smoothing over about 80 ms
    const newSpeed = speed + (s - speed) * k;
    accel += ((newSpeed - speed) / dt - accel) * k;
    speed = newSpeed;
  }
  function runStartSpeed() {
    if (mode() !== 'watch') return 0;
    const h = new THREE.Vector3(), h2 = new THREE.Vector3();
    rig.setTime(0); rig.model.updateMatrixWorld(true); rig.bone('Hips').getWorldPosition(h);
    rig.setTime(.1); rig.model.updateMatrixWorld(true); rig.bone('Hips').getWorldPosition(h2);
    rig.setTime(Math.min(t, RUN_STOP.stopped + .79)); readBody();
    return h2.sub(h).dot(fwd) * 10;
  }

  // One step of the chain. Each band hangs from the bottom of the one above: when that point
  // slows down, the band is thrown forward; the air pushes it back while he moves; gravity hangs
  // it down; the fabric's stiffness pulls neighbouring bands into line; damping settles it.
  function swing(dt) {
    if (main.dataset.follow === 'off') { ang.fill(0); spin.fill(0); return; }
    const s = +stiffInput.value / 100;              // 0 loose .. 1 stiff
    // Spread evenly along the slider: each step up doubles-ish how firmly the bands hold together
    const bend = 6 * Math.pow(50, s), bendDamp = lerp(2.5, 14, s);
    const damp = lerp(3.4, 5.5, s);                 // stiff fabric settles sooner
    const forwardLimit = lerp(-50, -15, s) * deg;   // stiff fabric doesn't swing as far forward
    let pivotAccel = accel;
    for (let k = 0; k < 3; k++) {
      const a = ang[k], L = BANDS[k];
      let e = (pivotAccel * Math.cos(a) - G * Math.sin(a) + AIR * speed * Math.cos(a)) / L - (AIR + damp) * spin[k];
      if (k > 0) e -= bend * (a - ang[k - 1]) + bendDamp * (spin[k] - spin[k - 1]);
      if (k < 2) e -= .4 * bend * (a - ang[k + 1]);   // the band below pulls back a little
      turn[k] = e;
      pivotAccel += L * e * Math.cos(a);             // the next band hangs from this one's hem
    }
    for (let k = 0; k < 3; k++) {
      spin[k] += turn[k] * dt;
      ang[k] = ang[k] + spin[k] * dt;
      if (ang[k] < forwardLimit) { ang[k] = forwardLimit; spin[k] = Math.max(0, spin[k]); }
      ang[k] = Math.min(ang[k], 85 * deg);
    }
  }

  // The angle at a distance d down the cloak, blending smoothly from band to band
  const MID = [BANDS[0] / 2, BANDS[0] + BANDS[1] / 2, BANDS[0] + BANDS[1] + BANDS[2] / 2];
  function angleAt(d) {
    if (d <= MID[0]) return ang[0];
    if (d >= MID[2]) return ang[2];
    const k = d < MID[1] ? 0 : 1, f = (d - MID[k]) / (MID[k + 1] - MID[k]);
    return lerp(ang[k], ang[k + 1], f * f * (3 - 2 * f));
  }

  // Keep a point behind his back. His torso is treated as an oval round the spine: within its
  // width, the cloth must be at least the measured depth behind the spine (less towards the
  // sides, so it wraps round him). It's only ever pushed backwards, so it can't pop out the front.
  // Below his seat the same oval carries on down his legs (the backs of the thighs and calves), so
  // the cloak can't swing forward between them. Beside him, the cloak can wrap round his sides,
  // but stops just behind the middle of his body, so it never reaches the front of his arms.
  const onSpine = new THREE.Vector3();
  const LEG_DEPTH = .11;
  function keepBehindBack(p) {
    const len = spine.length() || 1;
    const k = w.subVectors(p, bones.Hips).dot(spine) / (len * len);   // 0 at the hips, 1 at the neck
    if (k > 1.05) return;
    onSpine.copy(bones.Hips).addScaledVector(spine, k);
    v.subVectors(p, onSpine);
    const lat = v.dot(side) / BACK_HALF_WIDTH, behind = v.dot(back);
    let depth = lerp(.06, .17, stiffNow);                              // beside him: not as far forward as his arms
                                                                       // (stiff fabric doesn't wrap round as far)
    if (Math.abs(lat) < 1) {
      let d = LEG_DEPTH;
      if (k >= -.3) {
        const f = clamp((k + .3) * 10, 0, BACK_DEPTH.length - 1), i = Math.min(Math.floor(f), BACK_DEPTH.length - 2);
        d = lerp(BACK_DEPTH[i], BACK_DEPTH[i + 1], f - i);
      } else if (k > -.5) d = lerp(LEG_DEPTH, BACK_DEPTH[0], (k + .5) / .2);   // seat into legs
      depth = (d + MARGIN + .05 * stiffNow) * Math.sqrt(1 - lat * lat);   // stiff fabric stands a little off him
    }
    if (behind < depth) p.addScaledVector(back, depth - behind);
  }

  // Push a point out of a capsule round a limb (bone segment a-b), always out behind it
  function pushOut(p, a, b, r) {
    v.subVectors(b, a);
    const len2 = v.lengthSq() || 1;
    const k = clamp(w.subVectors(p, a).dot(v) / len2, 0, 1);
    w.copy(a).addScaledVector(v, k);                // nearest point on the bone
    v.subVectors(p, w);
    const d = v.length();
    if (d >= r) return false;
    if (d < 1e-6) v.copy(back); else v.multiplyScalar(1 / d);
    const fwdPart = v.dot(back);
    if (fwdPart < 0) v.addScaledVector(back, -2 * fwdPart);   // in front of the limb: go round behind it instead
    p.copy(w).addScaledVector(v, r);
    return true;
  }

  // Seen from behind, a limb blocks everything in front of it: cloth within its width (side to side)
  // and along its length must stay behind it, so the cloak can't wrap round in front of an arm or leg.
  function keepBehindLimb(p, a, b, r) {
    v.subVectors(b, a);
    const len2 = v.lengthSq() || 1;
    const k = w.subVectors(p, a).dot(v) / len2;
    if (k < 0 || k > 1) return;
    w.copy(a).addScaledVector(v, k);                // the point on the limb at this cloth point's height
    v.subVectors(p, w);
    if (Math.abs(v.dot(side)) >= r) return;         // beside the limb: free to hang there
    const behind = v.dot(back);
    if (behind < r) p.addScaledVector(back, r - behind);
  }

  // Build the cloth: each column runs down from the shoulders at the bands' angles, and is pushed
  // out round his body and legs as it goes, so the rest of the column drapes from there.
  const p = new THREE.Vector3(), dir = new THREE.Vector3(), out = new THREE.Vector3();
  let stiffNow = .4;                                  // the Stiffness slider, 0 .. 1, read once per frame
  function drawCloth() {
    stiffNow = +stiffInput.value / 100;
    const rowLen = TOTAL / (ROWS - 1);
    for (let i = 0; i < COLS; i++) {
      const u = i / (COLS - 1) - .5, edge = Math.abs(u) * 2;    // 0 in the middle, 1 at the edges
      p.copy(pin).addScaledVector(side, u * TOP_W).addScaledVector(back, .04 * (1 - edge * edge));
      for (let j = 0; j < ROWS; j++) {
        const f = j / (ROWS - 1);
        // the cloak widens towards the hem: spread this point out sideways from the column line
        out.copy(p).addScaledVector(side, u * (BOTTOM_W - TOP_W) * f);
        // limbs, then his back and legs, then limbs again (so one push can't leave it inside another)
        for (const [a, b, r] of LIMBS) pushOut(out, bones[a], bones[b], r + MARGIN);
        keepBehindBack(out);
        for (const [a, b, r] of LIMBS) { pushOut(out, bones[a], bones[b], r + MARGIN); keepBehindLimb(out, bones[a], bones[b], r + MARGIN); }
        if (out.y < .02) out.y = .02;
        posAttr.setXYZ(idx(i, j), out.x, out.y, out.z);
        // carry on down from where the cloth actually is (after any push), minus the widening
        p.copy(out).addScaledVector(side, -u * (BOTTOM_W - TOP_W) * f);
        // + a slight outward drape, so it falls over his back and hips
        const a = angleAt(f * TOTAL);
        dir.copy(back).multiplyScalar(Math.sin(a) + .06 * edge + lerp(.17, .26, stiffNow) * (1 - f)).addScaledVector(UP, -Math.cos(a));
        p.addScaledVector(dir.normalize(), rowLen);
      }
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  }

  stage.onFrame(dt => {
    if (!rig) return;
    if (mode() === 'watch') {
      if (!reducedMotion) t = (t + dt) % LOOP;
      rig.setTime(Math.min(t, RUN_STOP.stopped + .79));             // after the stop he holds still
    } else {
      if (!reducedMotion) t += dt;
      rig.setTime(t);
      dragX += (targetX - dragX) * Math.min(1, dt * 10);             // follows the pointer smoothly
      rig.model.position.x = dragX;
    }
    readBody();
    if (dt > 0) measure(dt);
    spare = Math.min(spare + dt, .1);
    while (spare >= STEP) { swing(STEP); spare -= STEP; }
    drawCloth();
  });

  // Drag it: pointer position to a point on the floor line, across the stage
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const clampX = x => clamp(x, -2.2, 2.2);
  function pointerX(e) {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -((e.clientY - r.top) / r.height * 2 - 1) }, stage.camera);
    if (ray.ray.intersectPlane(plane, hit)) targetX = clampX(hit.x);
  }
  canvas.addEventListener('pointerdown', e => { if (mode() !== 'drag') return; canvas.setPointerCapture(e.pointerId); pointerX(e); });
  canvas.addEventListener('pointermove', e => { if (mode() === 'drag' && canvas.hasPointerCapture(e.pointerId)) pointerX(e); });
  document.addEventListener('keydown', e => {
    if (main.dataset.view !== '3d' || mode() !== 'drag' || e.target.closest?.('input')) return;
    if (e.key === 'ArrowLeft') { targetX = clampX(targetX - .9); e.preventDefault(); }
    if (e.key === 'ArrowRight') { targetX = clampX(targetX + .9); e.preventDefault(); }
  });

  return { show: () => stage.start(), hide: () => stage.stop() };
}
