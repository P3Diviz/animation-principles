// 11 Appeal, 3D view: Draig built from Three.js primitives (no Mixamo bots on this page), with the
// same controls as 2D: shape language (round / square / pointed), head size, eye size, and a stiff
// pose or one with a line of action; or Compare, two versions side by side.
//
// Sizes come from Draig's 2D viewBox (assets/svg/characters/draig.svg): 280 units = 1 m, feet at
// y = 380. P(x, y) turns a 2D point into metres.
//   - The body (head and body are one plush shape) is a sphere reshaped for each shape language.
//     The belly is painted on as vertex colours, so it always fits the shape.
//   - The face parts are placed on the body's surface by casting a ray at it, so they sit on every
//     shape at every head and eye size, facing out along the surface.
//   - Angles in the pose match the 2D page (11-appeal.js). SVG turns clockwise for positive angles
//     with y down, so a 2D angle a is a turn of -a about z here.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { studio } from '../three/studio.js';
import { std, reducedMotion } from '../three/stage.js';

const $ = id => document.getElementById(id);
const deg = Math.PI / 180;
const U = 1 / 280;                                         // 2D units -> metres
const P = (x, y) => new THREE.Vector2((x - 200) * U, (380 - y) * U);

// Draig's colours, matte like plush
const MAT = {
  body:  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 }),
  dark:  std('#B01C38', .85),
  horn:  std('#F3DDAE', .6),
  wing:  Object.assign(std('#C8203E', .8), { side: THREE.DoubleSide }),
  muzzle: std('#F0566A', .8),
  cheek: std('#FF7A8A', .9),
  white: std('#F6F6FA', .35),
  iris:  std('#22A35A', .3),
  pupil: std('#06140C', .2),
  shine: new THREE.MeshBasicMaterial({ color: '#FFFFFF' }),
  mouth: std('#3E0716', .7),
  brow:  std('#7A0F28', .8),
  line:  new THREE.MeshBasicMaterial({ color: '#9999FF', transparent: true, opacity: .85, depthTest: false })
};
const RED = new THREE.Color('#E0283F'), BELLY = new THREE.Color('#FBE0B4');

// ----- The body: one sphere, reshaped -----
// Half sizes in metres (2D: 68..332 wide, 96..380 tall), and how deep he is front to back.
const BODY = { rx: .471, ry: .507, rz: .42, cy: .507 };
function bodyGeometry(shape) {
  let g = new THREE.SphereGeometry(1, 96, 72);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);                                    // no seam in the shading
  const pos = g.attributes.position, colors = [], c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // Belly: the 2D belly ellipse (centre 200 318, 80 x 74), on the front only, with a soft edge
    const e = Math.hypot(x / .6, (y + .56) / .52);
    const belly = (1 - THREE.MathUtils.smoothstep(e, .82, 1.1)) * THREE.MathUtils.smoothstep(z, .05, .4);
    colors.push(...c.copy(RED).lerp(BELLY, belly).toArray());
    if (shape === 'square') {
      // A rounded box: push each point out until |x|^5 + |y|^5 + |z|^5 = 1
      const k = Math.pow(Math.abs(x) ** 5 + Math.abs(y) ** 5 + Math.abs(z) ** 5, -1 / 5);
      x *= k; y *= k * .97; z *= k;
    } else if (shape === 'pointed') {
      // A teardrop: above the middle the sides close in to a point at the top
      if (y > 0) {
        const r = Math.sqrt(1 - y * y), cone = (1 - y) * 1.1;
        const s = r > 0 ? THREE.MathUtils.lerp(1, Math.min(1, cone / r), y) : 0;
        x *= s; z *= s;
      }
      y *= y > 0 ? 1.03 : 1;
    }
    pos.setXYZ(i, x * BODY.rx, y * BODY.ry + BODY.cy, z * BODY.rz);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
const BODIES = { round: bodyGeometry('round'), square: bodyGeometry('square'), pointed: bodyGeometry('pointed') };

// A part made of a sphere squashed to an ellipsoid
const blob = (mat, sx, sy, sz) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat);
  m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true;
  return m;
};
// A curved stroke (mouth, brows): part of a torus, its middle at the group's origin.
// up = false bends it like a smile, true arches it like a brow.
const arc = (mat, radius, tube, angle, up = false) => {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 32, angle), mat);
  m.rotation.z = (up ? Math.PI / 2 : -Math.PI / 2) - angle / 2;   // centre the arc at the bottom (or top)
  m.position.y = up ? -radius : radius;
  g.add(m);
  return g;
};

// ----- One Draig -----
function buildDraig() {
  const who = new THREE.Group();                          // stands on the floor; the line of action lives here
  const rig = new THREE.Group();                          // everything that leans with the pose (pivot: his feet)
  who.add(rig);
  const add = (o, parent = rig) => { o.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); parent.add(o); return o; };

  const body = add(new THREE.Mesh(BODIES.round, MAT.body));

  // Feet and claws (2D: 152 378 and 248 378)
  for (const s of [-1, 1]) {
    const foot = add(blob(MAT.dark, .13, .068, .16));
    foot.position.set(s * .171, .05, .12);
    for (const k of [-1, 0, 1]) add(blob(MAT.horn, .022, .02, .022)).position.set(s * .171 + k * .055, .03, .27 - Math.abs(k) * .02);
  }

  // Arms: a capsule hanging from the shoulder (2D pivots 98 262 and 302 262), three claws at the end
  const arms = [-1, 1].map(s => {
    const arm = add(new THREE.Group());
    const limb = add(new THREE.Mesh(new THREE.CapsuleGeometry(.06, .13, 6, 16), MAT.dark), arm);
    limb.position.y = -.11;
    for (const k of [-1, 0, 1]) add(blob(MAT.horn, .018, .016, .018), arm).position.set(k * .03, -.235, .03);
    arm.userData.side = s;
    return arm;
  });

  // Wings: the 2D membrane outline, cut from a thin sheet, swept back behind the body.
  // The right wing is the left one mirrored.
  const wingShape = new THREE.Shape();
  const W = (x, y) => [(x - 100) * U, (205 - y) * U];      // relative to the wing's pivot (100 205)
  wingShape.moveTo(...W(104, 214));
  wingShape.bezierCurveTo(...W(70, 190), ...W(40, 150), ...W(22, 110));
  wingShape.bezierCurveTo(...W(46, 118), ...W(62, 112), ...W(70, 98));
  wingShape.bezierCurveTo(...W(78, 124), ...W(94, 132), ...W(108, 128));
  wingShape.bezierCurveTo(...W(104, 150), ...W(108, 176), ...W(118, 196));
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: .014, bevelEnabled: false, curveSegments: 16 });
  const wings = [-1, 1].map(s => {
    const sweep = add(new THREE.Group());                  // placed on his back in apply()
    sweep.userData.side = s;
    sweep.scale.x = -s;                                    // the left wing is drawn pointing left (-x)
    sweep.rotation.y = s * .55;                            // tips swept back
    const flap = add(new THREE.Group(), sweep);
    add(new THREE.Mesh(wingGeo, MAT.wing), flap);
    flap.userData.sweep = sweep;
    return flap;
  });

  // Tail: a tube from his back round to his right, ending in a spade (2D pivot 290 340)
  const tail = add(new THREE.Group());                     // placed on his back in apply()
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.05, 0, .05), new THREE.Vector3(.2, -.05, -.08), new THREE.Vector3(.4, .05, -.14),
    new THREE.Vector3(.44, .24, -.14), new THREE.Vector3(.36, .36, -.12)]);
  add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 40, .045, 12), MAT.dark), tail);
  add(blob(MAT.dark, .045, .045, .045), tail).position.copy(tailCurve.points[4]);
  const spade = add(new THREE.Mesh(new THREE.OctahedronGeometry(.1, 0), MAT.dark), tail);
  spade.scale.set(.75, 1.05, .3);
  spade.position.copy(tailCurve.points[4]).add(new THREE.Vector3(-.02, .1, 0));
  spade.rotation.z = .5;

  // Horns and crest, set on top of the head where they meet the surface
  const horns = [-1, 1].map(s => {
    const h = add(new THREE.Mesh(new THREE.ConeGeometry(.045, .2, 16), MAT.horn));
    h.userData = { x: s * .15, z: -.02, lean: s * -.75, scale: 1, height: .2 };   // splayed out about 43°, as in 2D
    return h;
  });
  const crest = [[-.08, .6], [0, 1], [.08, .6]].map(([x, size]) => {
    const c = add(new THREE.Mesh(new THREE.ConeGeometry(.032, .11, 12), MAT.horn));
    c.userData = { x, z: .02, lean: -x * 2, scale: size, height: .11 };
    return c;
  });

  // Face parts, each placed on the surface. at: its 2D position. Each part's +z faces out.
  const face = [];
  const part = (obj, at, depth = 0, onto = null) => { add(obj); face.push({ obj, at: P(...at), depth, onto }); return obj; };
  // A blob added to a group at a position (Object3D.add returns the parent, so position it first)
  const put = (group, mesh, x, y, z) => { mesh.position.set(x, y, z); group.add(mesh); return mesh; };
  for (const x of [160, 240]) {                            // eyes (2D: 40 x 44), iris and pupil low and inwards
    const eye = new THREE.Group();
    eye.add(blob(MAT.white, .143, .157, .07));
    const ix = x < 200 ? .01 : -.01;
    put(eye, blob(MAT.iris, .09, .09, .03), ix, -.02, .055);
    put(eye, blob(MAT.pupil, .045, .045, .02), ix, -.027, .08);
    put(eye, blob(MAT.shine, .027, .027, .01), ix + .036, .02, .09);
    put(eye, blob(MAT.shine, .011, .011, .006), ix - .03, -.06, .085);
    eye.userData.eye = true;
    part(eye, [x, 186], .02);
  }
  const muzzle = new THREE.Group(), snout = blob(MAT.muzzle, .25, .143, .1);
  muzzle.add(snout);
  for (const s of [-1, 1]) put(muzzle, blob(MAT.brow, .02, .014, .012), s * .054, .06, .085);
  part(muzzle, [200, 252], .04);
  part(arc(MAT.mouth, .09, .013, 2), [200, 268], -.004, snout);   // the smile, on the snout
  // (each face part is a group: placing it sets the group's scale, so a blob's own shape is kept)
  for (const x of [128, 272]) part(new THREE.Group().add(blob(MAT.cheek, .057, .036, .015)), [x, 236], .005);
  for (const x of [158, 242]) part(arc(MAT.brow, .1, .013, 1.3, true), [x, 128], -.006);

  // The line of action: a dotted curve through the pose (2D: M150 400 C 236 330 262 220 196 62),
  // drawn over him like the 2D dashes. It doesn't lean with the rig, as in 2D.
  const loa = new THREE.Group();
  const v3 = (x, y) => { const p = P(x, y); return new THREE.Vector3(p.x, p.y, .45); };
  const loaCurve = new THREE.CubicBezierCurve3(v3(150, 400), v3(236, 330), v3(262, 220), v3(196, 62));
  const dot = new THREE.SphereGeometry(.016, 10, 8);
  for (let i = 0; i <= 26; i++) {
    const d = new THREE.Mesh(dot, MAT.line);
    d.position.copy(loaCurve.getPoint(i / 26));
    d.renderOrder = 2;
    loa.add(d);
  }
  who.add(loa);

  // ----- Posing -----
  const ray = new THREE.Raycaster(), hitPoint = new THREE.Vector3(), normal = new THREE.Vector3();
  const FACE_PIVOT = P(200, 220);
  // Where a ray from in front (or from above) meets the body, in the rig's own space
  function surface(origin, dir, onto = body) {
    ray.set(origin, dir);
    const hit = ray.intersectObject(onto)[0];
    if (!hit) return null;
    hitPoint.copy(hit.point);
    normal.copy(hit.face.normal).transformDirection(onto.matrixWorld);   // the snout is a scaled sphere
    return hit;
  }

  function apply({ shape, head, eye, pose }) {
    const strong = pose === 'strong';
    body.geometry = BODIES[shape] || BODIES.round;
    // Work in the rig's own space: no lean, and at the origin, while the parts are placed
    rig.rotation.set(0, 0, 0);
    who.position.set(0, 0, 0);
    who.updateMatrixWorld(true);

    // Face: head size scales the layout about the face's pivot; Line of action tilts it 9°
    const tilt = strong ? 9 * deg : 0;
    face.forEach(({ obj, at: p, depth, onto }) => {
      const q = p.clone().sub(FACE_PIVOT).multiplyScalar(head).rotateAround(new THREE.Vector2(), tilt).add(FACE_PIVOT);
      if (!surface(new THREE.Vector3(q.x, q.y, 2), new THREE.Vector3(0, 0, -1), onto || body)) { obj.visible = false; return; }
      obj.visible = true;
      const s = head * (obj.userData.eye ? eye : 1);
      obj.scale.setScalar(s);
      obj.position.copy(hitPoint).addScaledVector(normal, depth * s);
      obj.lookAt(obj.position.clone().add(normal));        // face out along the surface
      obj.rotateZ(tilt);
      obj.updateMatrixWorld(true);                         // the smile is placed on the snout next
    });

    // Horns and crest: dropped onto the top of the head
    [...horns, ...crest].forEach(h => {
      const { x, z, lean, scale, height } = h.userData;
      if (!surface(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0))) return;
      h.scale.setScalar(scale);
      h.rotation.set(0, 0, lean);
      // The cone's centre sits up its own axis, so its base is just below the surface
      h.position.copy(hitPoint).add(new THREE.Vector3(0, .35 * height * scale, 0).applyEuler(h.rotation));
    });

    // Arms: hang from the shoulders on the front of his body, as in 2D (found with a ray from in front).
    // Stiff: straight down. Line of action: the left arm raised out (97° in 2D), the right swung out (-14°).
    arms.forEach(arm => {
      const s = arm.userData.side;
      surface(new THREE.Vector3(s * .36, .43, 2), new THREE.Vector3(0, 0, -1));
      arm.position.set(s * .36, .43, hitPoint.z + .01);
      const a2d = strong ? (s < 0 ? 97 : -14) : 0;
      arm.rotation.set(0, 0, -a2d * deg);
    });

    // Wings and tail grow from his back (found with a ray from behind), just inside the surface
    wings.forEach(w => {
      const sweep = w.userData.sweep, s = sweep.userData.side;
      surface(new THREE.Vector3(s * .3, .62, -3), new THREE.Vector3(0, 0, 1));
      sweep.position.set(s * .3, .62, hitPoint.z + .04);
    });
    surface(new THREE.Vector3(.3, .15, -3), new THREE.Vector3(0, 0, 1));
    tail.position.set(.3, .15, hitPoint.z + .06);

    // Wings flap open (2D: left -14, right 6), tail sweeps up (2D -28), the body leans (2D 8)
    wings[0].rotation.z = strong ? 14 * deg : 0;
    wings[1].rotation.z = strong ? 6 * deg : 0;
    tail.rotation.z = strong ? 28 * deg : 0;
    rig.rotation.z = strong ? -8 * deg : 0;
    loa.visible = strong;
    who.position.x = who.userData.at || 0;
  }

  return { who, apply };
}

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [.9, 1.05, 3.1], look: [0, .55, 0] });
  status.textContent = '';
  const main = $('main'), build = $('build'), headSize = $('headSize'), eyeSize = $('eyeSize');

  // Build: one Draig. Compare: the same settings as the 2D compare, side by side.
  const one = buildDraig(), left = buildDraig(), right = buildDraig();
  left.who.userData.at = -.8; right.who.userData.at = .8;
  [one, left, right].forEach(d => stage.scene.add(d.who));
  left.apply({ shape: 'square', pose: 'stiff', head: .82, eye: .55 });
  right.apply({ shape: 'round', pose: 'strong', head: 1.15, eye: 1.2 });

  // Walk round him: drag, or the arrow keys on the focused stage. Kept to the front half,
  // so Left and Right in Compare never swap places.
  const orbit = new OrbitControls(stage.camera, canvas);
  orbit.target.set(0, .55, 0);
  Object.assign(orbit, { enableDamping: true, enablePan: false, enableZoom: false,   // the distance follows the mode
    maxPolarAngle: 86 * deg, minAzimuthAngle: -80 * deg, maxAzimuthAngle: 80 * deg });
  orbit.update();
  const sph = new THREE.Spherical(), off = new THREE.Vector3();
  canvas.addEventListener('keydown', e => {
    const d = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[e.key];
    if (!d) return;
    e.preventDefault();
    off.subVectors(stage.camera.position, orbit.target); sph.setFromVector3(off);
    sph.theta = Math.min(orbit.maxAzimuthAngle, Math.max(orbit.minAzimuthAngle, sph.theta + d[0] * deg));
    sph.phi = Math.min(orbit.maxPolarAngle, Math.max(.15, sph.phi + d[1] * deg));
    stage.camera.position.copy(orbit.target).add(off.setFromSpherical(sph));
    orbit.update();
  });

  // Compare needs the camera further back: it eases there (and back), keeping its direction
  let want = 3.2;
  function update() {
    const compare = main.dataset.mode === 'compare';
    one.who.visible = !compare; left.who.visible = right.who.visible = compare;
    want = compare ? 4.6 : 3.2;
    one.apply({ shape: build.dataset.shape, pose: build.dataset.pose, head: headSize.value / 100, eye: eyeSize.value / 100 });
  }
  build.addEventListener('statechange', update);
  main.addEventListener('statechange', e => { if (e.detail.attr === 'mode') update(); });
  [headSize, eyeSize].forEach(s => s.addEventListener('input', update));
  update();
  off.subVectors(stage.camera.position, orbit.target).setLength(want);
  stage.camera.position.copy(orbit.target).add(off);

  stage.onFrame(dt => {
    off.subVectors(stage.camera.position, orbit.target);
    const d = off.length(), k = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    if (Math.abs(d - want) > .001) stage.camera.position.copy(orbit.target).add(off.setLength(d + (want - d) * k));
    orbit.update();
  });

  return { show: () => stage.start(), hide: () => stage.stop() };
}
