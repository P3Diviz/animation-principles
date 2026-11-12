// 05 Follow through, 3D view: Y Bot's Mixamo Run To Stop with a tail.
// The tail is a chain of 8 points hung from the hips (verlet physics): each point keeps its
// last movement (so it carries on when the body stops), sags a little under gravity, and is
// pulled back towards its rest shape by the Stiffness slider. Off: the tail is rigid.
// Watch: the run plays and loops. Drag it: the figure stands (Idle) and follows the pointer.
// The physics runs live, so this view has no timeline.
import * as THREE from 'three';
import { studio, addBot } from '../three/studio.js';
import { JOINTS } from '../three/rig.js';
import { reducedMotion } from '../three/stage.js';
import { RUN_STOP } from '../three/clips.js';

const $ = id => document.getElementById(id);
const N = 8, SEG = .09;                          // points, and the length of each segment
const LOOP = 1.8 + 1.4;                          // the run, then a hold while the tail settles
const START_X = -1.4;                            // where the run starts (it travels about 2.6 to the right)

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [.2, 1.3, 4.7], look: [0, .85, 0] });
  const main = $('main'), stiffInput = $('stiff');
  const v = new THREE.Vector3(), q = new THREE.Quaternion();

  // The tail: one capsule per segment, thick at the root, thin at the tip
  const parts = [];
  for (let i = 0; i < N - 1; i++) {
    const r = .05 - i * .005;
    const m = stage.add(new THREE.CapsuleGeometry(r, SEG, 4, 10), JOINTS);   // darker than the body, so it reads as a tail
    m.visible = false;
    parts.push(m);
  }
  const pts = Array.from({ length: N }, () => new THREE.Vector3());
  const prev = Array.from({ length: N }, () => new THREE.Vector3());
  const restDir = new THREE.Vector3();           // the tail's rest direction this frame (back and down from the hips)
  const anchor = new THREE.Vector3(), lastAnchor = new THREE.Vector3();

  let rig = null, t = 0, dragX = 0, targetX = 0;
  const mode = () => main.dataset.mode === 'drag' ? 'drag' : 'watch';
  addBot(stage, status, 'YBot', null, { at: [START_X, 0, 0], turn: Math.PI / 2 }).then(async r => {
    if (!r.bones.length) return;
    rig = r;
    await startMode();
    parts.forEach(p => { p.visible = true; });
  });

  async function startMode() {
    if (!rig) return;
    t = 0; dragX = targetX = 0;
    rig.model.position.x = mode() === 'drag' ? 0 : START_X;
    await rig.play(mode() === 'drag' ? 'Idle' : 'RunToStop');
    rig.setTime(0);
    findAnchor(); resetTail();
  }
  main.addEventListener('statechange', e => { if (e.detail.attr === 'mode') startMode(); });

  // Root of the tail: just behind the hips, turned with them
  function findAnchor() {
    rig.model.updateMatrixWorld(true);
    const hips = rig.bone('Hips');
    hips.getWorldPosition(anchor);
    // The figure faces +z in its own space, so its back is -z: the tail rests back and a little down
    rig.model.getWorldQuaternion(q);
    restDir.set(0, -.12, -1).normalize().applyQuaternion(q);
    anchor.addScaledVector(restDir, .1);
    anchor.y -= .04;
  }
  function resetTail() {
    pts.forEach((p, i) => { p.copy(anchor).addScaledVector(restDir, SEG * i); prev[i].copy(p); });
    lastAnchor.copy(anchor);
  }

  // One step of the chain
  function stepTail(dt) {
    const on = main.dataset.follow !== 'off';
    const stiff = +stiffInput.value / 100;                    // 0 loose .. 1 stiff
    if (!on) { resetTail(); return; }
    if (anchor.distanceTo(lastAnchor) > .5) resetTail();      // the loop jumped back to the start
    lastAnchor.copy(anchor);
    pts[0].copy(anchor); prev[0].copy(anchor);
    const pull = 1 - Math.pow(1 - (.02 + .35 * stiff), dt * 60);   // how hard it's pulled back to shape
    for (let i = 1; i < N; i++) {
      const p = pts[i];
      v.subVectors(p, prev[i]).multiplyScalar(.985);          // keep moving (a little damping)
      prev[i].copy(p);
      p.add(v);
      p.y -= 1.2 * dt * dt;                                    // a little gravity
    }
    // Keep each segment the right length, and pull it towards the rest shape
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < N; i++) {
        const p = pts[i], parent = pts[i - 1];
        v.copy(parent).addScaledVector(restDir, SEG);
        if (pass === 0) p.lerp(v, pull);
        v.subVectors(p, parent);
        const d = v.length() || 1;
        p.copy(parent).addScaledVector(v, SEG / d);
        if (p.y < .02) p.y = .02;                              // not through the floor
      }
    }
  }

  function drawTail() {
    const up = new THREE.Vector3(0, 1, 0);
    parts.forEach((m, i) => {
      v.subVectors(pts[i + 1], pts[i]);
      m.position.copy(pts[i]).addScaledVector(v, .5);
      m.quaternion.setFromUnitVectors(up, v.normalize());
    });
  }

  stage.onFrame(dt => {
    if (!rig) return;
    if (mode() === 'watch') {
      if (!reducedMotion) t = (t + dt) % LOOP;
      rig.setTime(Math.min(t, RUN_STOP.stopped + .79));       // after the stop it holds still
    } else {
      if (!reducedMotion) t += dt;
      rig.setTime(t);
      dragX += (targetX - dragX) * Math.min(1, dt * 10);       // follows the pointer smoothly
      rig.model.position.x = dragX;
    }
    findAnchor();
    // Two physics steps per frame keep the chain steady
    for (let i = 0; i < 2; i++) stepTail(dt / 2);
    drawTail();
  });

  // Drag it: pointer position to a point on the floor line, across the stage
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const clampX = x => Math.max(-2.2, Math.min(2.2, x));
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
