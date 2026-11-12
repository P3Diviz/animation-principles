// 05 Follow through, 3D view: Y Bot's Mixamo Run To Stop with a long ponytail.
// The hair is a chain of points tied to the back of the head (verlet physics): each point keeps
// its last movement, so when he stops running the hair carries on forward, then swings back and
// settles. Gravity hangs it down; the Stiffness slider pulls it back towards its resting shape.
// It's kept outside the head and upper back. Off: the hair is rigid.
// Watch: the run plays and loops. Drag it: the figure stands (Idle) and follows the pointer.
// The physics runs live, so this view has no timeline.
import * as THREE from 'three';
import { studio, addBot } from '../three/studio.js';
import { std, reducedMotion } from '../three/stage.js';
import { RUN_STOP } from '../three/clips.js';

const $ = id => document.getElementById(id);
const N = 10, SEG = .043;                        // points along the hair, and the gap between them (about 39 cm long)
const LOOP = 1.8 + 1.6;                          // the run, then a hold while the hair settles
const START_X = -1.4;                            // where the run starts (it travels about 2.6 to the right)
const ROWS = 28, SIDES = 10;                     // the hair's tube mesh

// Hair thickness along its length (0 = the tie, 1 = the tip): fuller just below the tie, then tapering
const thickness = u => u < .2 ? .02 + .026 * (u / .2) : .046 * Math.pow(1 - (u - .2) / .8, 1.1) + .004;

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [.2, 1.4, 4.4], look: [0, 1, 0] });
  const main = $('main'), stiffInput = $('stiff');
  const v = new THREE.Vector3(), w = new THREE.Vector3(), q = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);

  // ----- The hair mesh: a tapered tube through the chain, rebuilt each frame -----
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(new Float32Array(ROWS * SIDES * 3), 3);
  geo.setAttribute('position', posAttr);
  const index = [];
  for (let r = 0; r < ROWS - 1; r++) for (let s = 0; s < SIDES; s++) {
    const a = r * SIDES + s, b = r * SIDES + (s + 1) % SIDES, c = a + SIDES, d = b + SIDES;
    index.push(a, c, b, b, c, d);
  }
  geo.setIndex(index);
  const hairMat = std('#9A9AB2', .75);           // a grey between the clay and the joints, so it reads against the dark background
  hairMat.side = THREE.DoubleSide;
  const hair = new THREE.Mesh(geo, hairMat);
  hair.castShadow = true; hair.frustumCulled = false; hair.visible = false;
  stage.scene.add(hair);

  const pts = Array.from({ length: N }, () => new THREE.Vector3());
  const prev = Array.from({ length: N }, () => new THREE.Vector3());
  const curve = new THREE.CatmullRomCurve3(pts);
  const anchor = new THREE.Vector3(), lastAnchor = new THREE.Vector3();
  const back = new THREE.Vector3(), restDir = new THREE.Vector3();
  const headCentre = new THREE.Vector3(), neck = new THREE.Vector3();
  const headRest = new THREE.Quaternion(), headTurn = new THREE.Quaternion();

  let rig = null, t = 0, dragX = 0, targetX = 0, spare = 0;
  const STEP = 1 / 120;
  const mode = () => main.dataset.mode === 'drag' ? 'drag' : 'watch';
  addBot(stage, status, 'YBot', null, { at: [START_X, 0, 0], turn: Math.PI / 2 }).then(async r => {
    if (!r.bones.length) return;
    rig = r;
    // How the head is turned at rest, so the tie point can turn with the head
    rig.model.updateMatrixWorld(true);
    rig.bone('Head').getWorldQuaternion(headRest).invert();
    await startMode();
    hair.visible = true;
  });

  async function startMode() {
    if (!rig) return;
    t = 0; dragX = targetX = 0;
    rig.model.position.x = mode() === 'drag' ? 0 : START_X;
    await rig.play(mode() === 'drag' ? 'Idle' : 'RunToStop');
    rig.setTime(0);
    findAnchor(); resetHair();
  }
  main.addEventListener('statechange', e => { if (e.detail.attr === 'mode') startMode(); });

  // The tie point: high on the back of the head, turning with it. Also the body parts the hair can't pass through.
  function findAnchor() {
    rig.model.updateMatrixWorld(true);
    const head = rig.bone('Head'), top = rig.bone('HeadTop_End');
    head.getWorldPosition(v);
    if (top) top.getWorldPosition(w); else w.copy(v).y += .2;
    headCentre.lerpVectors(v, w, .5);
    // The figure faces +z in its own space, so its back is -z; turn that with the head
    rig.model.getWorldQuaternion(q);
    head.getWorldQuaternion(headTurn).multiply(headRest);
    back.set(0, 0, -1).applyQuaternion(q).applyQuaternion(headTurn);
    anchor.copy(headCentre).addScaledVector(back, .1).addScaledVector(UP, .07);      // tied high on the crown
    // At rest the ponytail stands out from the head a little, then falls
    restDir.set(0, 0, -1).applyQuaternion(q).multiplyScalar(.6).addScaledVector(UP, -.8).normalize();
    rig.bone('Neck').getWorldPosition(neck);
  }
  function resetHair() {
    pts.forEach((p, i) => { p.copy(anchor).addScaledVector(restDir, SEG * i); prev[i].copy(p); });
    lastAnchor.copy(anchor);
  }

  // Push a point out of the head (a sphere)
  function keepOut(p, c, r) {
    v.subVectors(p, c);
    const d = v.length();
    if (d < r && d > 1e-6) p.copy(c).addScaledVector(v, r / d);
  }
  // Below the top of the neck, keep the hair behind his back (a flat limit just behind the neck)
  function keepBehind(p) {
    if (p.y > neck.y + .04) return;
    const d = v.subVectors(p, neck).dot(back);
    if (d < .08) p.addScaledVector(back, .08 - d);
  }

  // One step of the chain
  function stepHair(dt) {
    if (main.dataset.follow === 'off') { resetHair(); return; }
    if (anchor.distanceTo(lastAnchor) > .5) resetHair();       // the loop jumped back to the start
    lastAnchor.copy(anchor);
    const stiff = +stiffInput.value / 100;                      // 0 loose .. 1 stiff
    const pull = 1 - Math.pow(1 - (.006 + .12 * stiff), dt * 60);
    pts[0].copy(anchor); prev[0].copy(anchor);
    for (let i = 1; i < N; i++) {
      const p = pts[i];
      v.subVectors(p, prev[i]).multiplyScalar(.99);            // keep moving (a little air drag)
      prev[i].copy(p);
      p.add(v);
      p.y -= 6 * dt * dt;                                       // gravity
    }
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 1; i < N; i++) {
        const p = pts[i], parent = pts[i - 1];
        if (pass === 0) p.lerp(w.copy(parent).addScaledVector(restDir, SEG), pull);   // back towards its shape
        v.subVectors(p, parent);
        p.copy(parent).addScaledVector(v, SEG / (v.length() || 1));                    // keep its length
        keepOut(p, headCentre, .115); keepBehind(p);                // sized to the Y Bot
        if (p.y < .02) p.y = .02;
      }
    }
  }

  // Rebuild the tube: a ring round the curve at each row, sized by thickness()
  const centre = new THREE.Vector3(), tangent = new THREE.Vector3(), side = new THREE.Vector3(), normal = new THREE.Vector3();
  function drawHair() {
    curve.points = pts;
    for (let r = 0; r < ROWS; r++) {
      const u = r / (ROWS - 1);
      curve.getPointAt(u, centre);
      curve.getTangentAt(u, tangent);
      side.crossVectors(tangent, back).normalize();
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      normal.crossVectors(side, tangent).normalize();
      const rad = thickness(u);
      for (let s = 0; s < SIDES; s++) {
        const a = s / SIDES * Math.PI * 2;
        // a little flatter side to side than front to back, like a real ponytail
        v.copy(centre).addScaledVector(side, Math.cos(a) * rad * .8).addScaledVector(normal, Math.sin(a) * rad);
        posAttr.setXYZ(r * SIDES + s, v.x, v.y, v.z);
      }
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  }

  stage.onFrame(dt => {
    if (!rig) return;
    if (mode() === 'watch') {
      if (!reducedMotion) t = (t + dt) % LOOP;
      rig.setTime(Math.min(t, RUN_STOP.stopped + .79));       // after the stop he holds still
    } else {
      if (!reducedMotion) t += dt;
      rig.setTime(t);
      dragX += (targetX - dragX) * Math.min(1, dt * 10);       // follows the pointer smoothly
      rig.model.position.x = dragX;
    }
    findAnchor();
    // Fixed physics steps of 1/120 s, so the hair moves the same on a fast or a slow computer
    spare = Math.min(spare + dt, .1);
    while (spare >= STEP) { stepHair(STEP); spare -= STEP; }
    drawHair();
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
