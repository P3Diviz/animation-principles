// 05 Follow through, 3D view: Y Bot's Mixamo Run To Stop wearing a cloak.
// The cloak swings like two linked pendulums hung from his shoulders: the upper half, and the
// lower half hanging from it (the same idea as the 2D page's springs: parts pushed by the body's
// acceleration). While he runs, the air holds it out behind him at an angle set by his speed.
// When he stops, the cloak carries on forward (follow through), the lower half a moment later
// than the upper (overlapping action), its edges wrapping round his legs, then it settles.
// Damping is built in, so it settles within a second or two and can't whip around.
// Stiffness: how firmly the lower half follows the upper. Off: the cloak hangs straight.
// Watch: the run plays and loops. Drag it: the figure stands (Idle) and follows the pointer.
// The physics runs live, so this view has no timeline.
import * as THREE from 'three';
import { studio, addBot } from '../three/studio.js';
import { std, reducedMotion } from '../three/stage.js';
import { RUN_STOP } from '../three/clips.js';

const $ = id => document.getElementById(id);
const COLS = 9, ROWS = 14;                       // cloth mesh grid
const UPPER = .4, LOWER = .42;                   // lengths of the two halves (shoulders to below the knee)
const TOP_W = .36, BOTTOM_W = .66;               // width across the shoulders and at the hem
const LOOP = 1.8 + 2;                            // the run, then a hold while the cloak settles
const START_X = -1.4;                            // where the run starts (it travels about 2.6 to the right)
const STEP = 1 / 120, G = 9.8;
const AIR = 2.2;                                 // air drag: holds the cloak out behind as he runs (and slows its swing)
const deg = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const idx = (i, j) => j * COLS + i;

export function create({ stageEl, canvas, status }) {
  // Three-quarter view from behind him, so the cloak shows its surface rather than its edge
  const { stage } = studio(stageEl, canvas, { pos: [-2.6, 1.75, 3.9], look: [.1, .95, 0] });
  const main = $('main'), stiffInput = $('stiff');
  const v = new THREE.Vector3(), q = new THREE.Quaternion();
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

  // ----- The swing: two angles from hanging straight down (+ = out behind him, - = forward) -----
  let a1 = 0, w1 = 0, a2 = 0, w2 = 0;              // upper half, lower half: angle and its speed
  let speed = 0, accel = 0;                        // his forward speed and acceleration (smoothed)
  const pin = new THREE.Vector3(), lastPin = new THREE.Vector3();
  const back = new THREE.Vector3(), side = new THREE.Vector3(), fwd = new THREE.Vector3();

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

  // Where the cloak is pinned: across his shoulders, just behind his neck. And which way is back.
  const L = new THREE.Vector3(), R = new THREE.Vector3(), N = new THREE.Vector3();
  function readBody() {
    rig.model.updateMatrixWorld(true);
    rig.bone('LeftArm').getWorldPosition(L); rig.bone('RightArm').getWorldPosition(R); rig.bone('Neck').getWorldPosition(N);
    rig.model.getWorldQuaternion(q);
    back.set(0, 0, -1).applyQuaternion(q);       // he faces +z in his own space
    fwd.copy(back).negate();
    side.crossVectors(UP, back).normalize();
    pin.lerpVectors(L, R, .5).addScaledVector(back, .1);
    pin.y = N.y - .04;
  }

  // His forward speed and acceleration, from the pin's movement (smoothed, so the bounce of each
  // stride doesn't jiggle the cloak). A jump back to the start of the loop is ignored.
  function measure(dt) {
    if (fresh || pin.distanceTo(lastPin) > .5) {
      // Start already moving with him: the cloak streams out at his speed, nothing yanks it
      speed = fresh && mode() === 'drag' ? 0 : runStartSpeed();
      accel = 0; w1 = w2 = 0;
      a1 = a2 = Math.atan(AIR * speed / G);
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

  // One step of the two pendulums. A pivot that slows down throws the pendulum forward; the air
  // pushes it back while he moves; gravity hangs it down; damping settles it.
  function swing(dt) {
    if (main.dataset.follow === 'off') { a1 = a2 = w1 = w2 = 0; return; }
    const stiff = +stiffInput.value / 100;
    const bend = 30 + 260 * stiff, bendDamp = 3 + 10 * stiff;    // how firmly the lower half follows the upper
    const damp = 3.2;                                            // the cloth's own damping
    // Upper half, hung from his shoulders
    const e1 = (accel * Math.cos(a1) - G * Math.sin(a1) + AIR * speed * Math.cos(a1)) / UPPER
      - (AIR + damp) * w1 - bend * .3 * (a1 - a2);
    // Lower half, hung from the upper half's hem (which moves as the upper half swings)
    const jointAccel = accel + UPPER * e1 * Math.cos(a1);
    const e2 = (jointAccel * Math.cos(a2) - G * Math.sin(a2) + AIR * speed * Math.cos(a2)) / LOWER
      - (AIR + damp) * w2 - bend * (a2 - a1) - bendDamp * (w2 - w1);
    w1 += e1 * dt; w2 += e2 * dt;
    a1 += w1 * dt; a2 += w2 * dt;
    // It can't swing through him: at most a little forward (its edges wrap round his legs)
    if (a1 < -12 * deg) { a1 = -12 * deg; w1 = Math.max(0, w1); }
    if (a2 < -22 * deg) { a2 = -22 * deg; w2 = Math.max(0, w2); }
    a1 = clamp(a1, -12 * deg, 75 * deg); a2 = clamp(a2, -22 * deg, 85 * deg);
  }

  // Build the cloth: each column runs down from the shoulders, turning from the upper half's angle
  // to the lower half's. The middle rests against his back; the edges can come further forward.
  const p = new THREE.Vector3(), dir = new THREE.Vector3();
  function drawCloth() {
    const rowLen = (UPPER + LOWER) / (ROWS - 1);
    for (let i = 0; i < COLS; i++) {
      const u = i / (COLS - 1) - .5, edge = Math.abs(u) * 2;    // 0 in the middle, 1 at the edges
      p.copy(pin).addScaledVector(side, u * TOP_W).addScaledVector(back, .04 * (1 - edge * edge));
      for (let j = 0; j < ROWS; j++) {
        const f = j / (ROWS - 1);
        const mix = clamp((f * (UPPER + LOWER) - UPPER * .6) / (UPPER * .8), 0, 1);   // smooth bend at the join
        let a = a1 + (a2 - a1) * (mix * mix * (3 - 2 * mix));
        if (a < 0) a *= .25 + .75 * edge;                                  // the middle can't go far forward
        // the edges flare out and trail a touch behind the middle
        const width = TOP_W + (BOTTOM_W - TOP_W) * f;
        posAttr.setXYZ(idx(i, j), p.x + side.x * u * (width - TOP_W), p.y, p.z + side.z * u * (width - TOP_W));
        // + a slight outward drape, so it falls over his back and hips instead of through them
        dir.copy(back).multiplyScalar(Math.sin(a) + .06 * edge + .17 * (1 - f)).addScaledVector(UP, -Math.cos(a));
        p.addScaledVector(dir.normalize(), rowLen);
        if (p.y < .02) p.y = .02;
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
