// 11 Appeal, 3D view: Draig as a little 3D dragon built from Three.js primitives (no Mixamo bots on
// this page), with the same controls as 2D. In 3D the shape language is a whole body type
// (Paul's idea), so learners see shape carry personality:
//   round    chubby: a round tummy, rosy cheeks, a big smile, stubby limbs, tiny wings, a curled tail
//   square   muscular: broad chest, pecs and a six-pack, biceps, a thick neck, a boxier head,
//            determined brows, a grin with fangs, big raised wings
//   pointed  skinny and bedraggled: narrow, ribs showing, hunched, droopy half-closed eyes, worried
//            brows, a small frown, thin knobbly limbs, torn drooping wings, a tail dragging on the floor
// Head size scales the head about the neck; eye size scales the eyes. Stiff or Line of action
// (the 2D angles: a 2D angle a is a turn of -a about z here). Compare: the 2D compare's two settings.
//
// How it's built:
//   - The torso is a sphere reshaped by a profile (width and depth at each height, plus the belly
//     pushed forward). Belly, belly bands, abs and ribs are vertex colours, so they always fit.
//   - Face parts are placed on the head by casting rays at it, and face out along its surface.
//   - Each body type builds its own dragon; switching type swaps it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { studio } from '../three/studio.js';
import { reducedMotion } from '../three/stage.js';

const $ = id => document.getElementById(id);
const deg = Math.PI / 180;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ----- Materials: Draig's colours, with a soft plush sheen -----
const plush = (color, extra = {}) => new THREE.MeshPhysicalMaterial({
  color, roughness: .72, sheen: .3, sheenRoughness: .5, sheenColor: new THREE.Color('#FF7A88'), ...extra });
const MAT = {
  skin:  plush('#FFFFFF', { vertexColors: true }),       // the torso: red, with the belly painted on
  red:   plush('#E0283F'),
  dark:  plush('#A3162F'),
  wing:  plush('#C8203E', { side: THREE.DoubleSide }),
  snout: plush('#F25A6C'),
  cheek: plush('#FF8494'),
  horn:  new THREE.MeshStandardMaterial({ color: '#F3DDAE', roughness: .5 }),
  white: new THREE.MeshStandardMaterial({ color: '#F6F6FA', roughness: .3 }),
  iris:  new THREE.MeshStandardMaterial({ color: '#22A35A', roughness: .25 }),
  pupil: new THREE.MeshStandardMaterial({ color: '#06140C', roughness: .15 }),
  shine: new THREE.MeshBasicMaterial({ color: '#FFFFFF' }),
  mouth: new THREE.MeshStandardMaterial({ color: '#3E0716', roughness: .6 }),
  brow:  plush('#7A0F28'),
  line:  new THREE.MeshBasicMaterial({ color: '#9999FF', transparent: true, opacity: .85, depthTest: false })
};
const COL = { red: new THREE.Color('#E0283F'), belly: new THREE.Color('#FBE0B4'), groove: new THREE.Color('#DDAE72'), rib: new THREE.Color('#A8182F') };

// ----- The three body types. Sizes in metres; profiles run from the bottom of the torso (first
// value) to the top (last). -----
const TYPES = {
  round: {
    torso: { y0: .06, y1: .64, rx: [.22, .35, .37, .31, .19], rz: [.2, .3, .32, .26, .16], belly: [0, .05, .08, .04, 0], top: .82, pattern: 'bands' },
    neck: { len: 0, r: 0 },
    head: { r: [.31, .285, .28], p: 2 }, snout: { s: [.15, .1, .12], y: -.08 },
    eye: { x: .115, y: .03, lid: 0 }, brow: { tilt: 0, r: .055, arc: 1.3, t: .012 }, mouth: 'smile', cheeks: true,
    horn: { len: .75, r: .034 }, crest: [.045, .05, .04],
    arm: { r: .058, upper: .085, fore: .075, at: .76, round: .35, rest: 28, swing: -.45 },   // resting out and forward over his tummy
    leg: { r: .095, x: .15, thigh: .13, foot: [.11, .06, .13] },
    wing: { scale: .7, open: 30, sweep: .4, at: .86, tatty: false },
    tail: { pts: [[0, 0, 0], [.12, -.04, -.1], [.26, 0, -.16], [.3, .13, -.12], [.22, .19, -.07]], r: [.085, .028], spade: .7 },
    spines: [.04, .045, .04, .035], hunch: 0
  },
  square: {
    torso: { y0: .15, y1: .74, rx: [.21, .23, .27, .36, .27], rz: [.18, .19, .21, .24, .17], belly: [0, .015, .02, .05, .01], top: .95, pattern: 'abs' },
    neck: { len: .06, r: .1 },
    head: { r: [.28, .25, .27], p: 3 }, snout: { s: [.17, .11, .13], y: -.075 },
    eye: { x: .105, y: .035, lid: .3 }, brow: { tilt: .35, r: .08, arc: .9, t: .016 }, mouth: 'grin', cheeks: false,
    horn: { len: 1.3, r: .045 }, crest: [.06, .075, .06],
    arm: { r: .075, upper: .12, fore: .11, at: .8, bicep: .09, shoulder: .09 },
    leg: { r: .085, x: .14, thigh: .11, foot: [.12, .065, .15] },
    wing: { scale: 1.15, open: 10, sweep: .55, at: .8, tatty: false },
    tail: { pts: [[0, 0, 0], [.16, -.07, -.13], [.38, -.06, -.2], [.52, .07, -.18], [.55, .24, -.12]], r: [.095, .03], spade: 1 },
    spines: [.07, .075, .07, .06], hunch: 0
  },
  pointed: {
    torso: { y0: .2, y1: .7, rx: [.14, .14, .15, .18, .13], rz: [.13, .12, .13, .14, .11], belly: [0, 0, 0, 0, 0], top: .9, pattern: 'ribs' },
    neck: { len: .1, r: .045 },
    head: { r: [.23, .235, .27], p: 2 }, snout: { s: [.11, .08, .16], y: -.07 },
    eye: { x: .095, y: .035, lid: .42 }, brow: { tilt: -.4, r: .05, arc: 1.2, t: .011 }, mouth: 'frown', cheeks: false,
    horn: { len: 1, r: .028, droop: true }, crest: [.05, .03, .045],
    arm: { r: .032, upper: .15, fore: .14, at: .8, elbow: .045 },
    leg: { r: .042, x: .09, knee: .052, foot: [.08, .045, .13] },
    wing: { scale: .95, open: 50, sweep: .3, at: .78, tatty: true },          // limp, hanging out to the sides
    tail: { pts: [[0, 0, 0], [.1, -.13, -.14], [.24, -.225, -.27], [.44, -.23, -.3], [.6, -.22, -.24]], r: [.045, .012], spade: .6, droop: true },
    spines: [.05, .03, .055, .035], hunch: 9
  }
};

const TYPE_NAMES = { round: 'Chubby', square: 'Muscular', pointed: 'Skinny and bedraggled' };

// A smooth curve through evenly spaced values (Catmull-Rom), read at h = 0..1
const profile = vals => h => {
  const n = vals.length - 1, x = Math.min(n, Math.max(0, h * n)), i = Math.min(n - 1, Math.floor(x)), t = x - i;
  const p0 = vals[Math.max(0, i - 1)], p1 = vals[i], p2 = vals[i + 1], p3 = vals[Math.min(n, i + 2)];
  return .5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
};
const smooth = THREE.MathUtils.smoothstep;

// ----- The torso -----
// A point on the torso at height h (0 bottom .. 1 top) and angle a round it (0 = his left side
// to the viewer's right, PI/2 = front, -PI/2 = back). The geometry below uses the same formula.
function torsoShape(t) {
  const rx = profile(t.rx), rz = profile(t.rz), belly = profile(t.belly);
  return (h, a) => {
    const y = 2 * h - 1, c = Math.pow(Math.max(0, 1 - y * y), .225);   // fuller than a sphere, round ends
    const s = Math.sin(a);
    return V(Math.cos(a) * rx(h) * c, t.y0 + h * (t.y1 - t.y0), (s * rz(h) + (s > 0 ? belly(h) * s ** 3 : 0)) * c);
  };
}
function torsoGeometry(t) {
  const at = torsoShape(t);
  let g = new THREE.SphereGeometry(1, 80, 60);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);                                    // no seam in the shading
  const pos = g.attributes.position, colors = [], c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const h = (pos.getY(i) + 1) / 2, a = Math.atan2(pos.getZ(i), pos.getX(i));
    pos.setXYZ(i, ...at(h, a).toArray());
    // Belly: the front, from just above the bottom up to the chest
    const front = Math.sin(a), side = Math.abs(Math.cos(a));
    const wide = t.pattern === 'ribs' ? [.62, .92] : [.05, .7];   // a wide, soft edge: a narrow one reads as a line from the side
    const b = smooth(front, ...wide) * smooth(h, .05, .15) * (1 - smooth(h, t.top - .1, t.top));
    c.copy(COL.red).lerp(COL.belly, b);
    const line = (x, w) => Math.exp(-((x / w) ** 2));
    if (t.pattern === 'bands') {                           // soft grooves across a round tummy
      c.lerp(COL.groove, b * .7 * line(((h * 5 + .5) % 1) - .5, .045));
    } else if (t.pattern === 'abs') {                      // a six-pack and the line under the pecs
      const across = Math.max(line(h - .3, .012), line(h - .45, .012), line(h - .6, .012), line(h - .76, .016));
      c.lerp(COL.groove, b * .8 * Math.max(across * (h < .8 ? 1 : 0), line(Math.cos(a), .03) * (h < .74 ? 1 : 0)));
    } else if (t.pattern === 'ribs') {                     // ribs showing on his sides
      const ribs = h > .45 && h < .85 ? line(((h * 9) % 1) - .5, .1) : 0;
      c.lerp(COL.rib, ribs * smooth(side, .35, .7) * smooth(front, -.5, .1) * .8);
    }
    colors.push(...c.toArray());
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

// The head: a sphere, rounder or boxier (|x|^p + |y|^p + |z|^p = 1)
function headGeometry({ r, p }) {
  let g = new THREE.SphereGeometry(1, 56, 42);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (p !== 2) { const k = Math.pow(Math.abs(x) ** p + Math.abs(y) ** p + Math.abs(z) ** p, -1 / p); x *= k; y *= k; z *= k; }
    pos.setXYZ(i, x * r[0], y * r[1], z * r[2]);
  }
  g.computeVertexNormals();
  return g;
}

// Worked out once per type (they're shared by every dragon of that type)
const CACHE = {};
function shapes(type) {
  if (!CACHE[type]) {
    const T = TYPES[type];
    CACHE[type] = { torso: torsoGeometry(T.torso), head: headGeometry(T.head), at: torsoShape(T.torso) };
  }
  return CACHE[type];
}

// ----- Small builders -----
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
const SPHERE = new THREE.SphereGeometry(1, 32, 24);
const blob = (mat, parent, [sx, sy, sz], x, y, z) => { const m = mesh(SPHERE, mat, parent, x, y, z); m.scale.set(sx, sy, sz); return m; };
// A capsule from a to b
function limb(mat, parent, r, a, b) {
  const d = b.clone().sub(a), m = mesh(new THREE.CapsuleGeometry(r, Math.max(.001, d.length()), 8, 16), mat, parent);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}
// A tube along a curve that thins from r0 to r1 (tails, horns, wing bones)
function taperedTube(curve, r0, r1, tub = 40, rad = 14) {
  const frames = curve.computeFrenetFrames(tub, false), pos = [], idx = [];
  for (let i = 0; i <= tub; i++) {
    const u = i / tub, p = curve.getPointAt(u), r = r0 + (r1 - r0) * u, N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= rad; j++) {
      const v = j / rad * Math.PI * 2, s = Math.sin(v), c = -Math.cos(v);   // the same winding as TubeGeometry
      pos.push(p.x + r * (c * N.x + s * B.x), p.y + r * (c * N.y + s * B.y), p.z + r * (c * N.z + s * B.z));
    }
  }
  for (let i = 1; i <= tub; i++) for (let j = 1; j <= rad; j++) {
    const a = (rad + 1) * (i - 1) + (j - 1), b = (rad + 1) * i + (j - 1), c = (rad + 1) * i + j, d = (rad + 1) * (i - 1) + j;
    idx.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const curveOf = pts => new THREE.CatmullRomCurve3(pts.map(p => Array.isArray(p) ? V(...p) : p));
// A curved stroke (mouth, brows): part of a torus with its middle at the group's origin.
// up = false bends it like a smile, true arches it.
function arc(mat, radius, tube, angle, up = false) {
  const g = new THREE.Group();
  const m = mesh(new THREE.TorusGeometry(radius, tube, 10, 32, angle), mat, g);
  m.rotation.z = (up ? Math.PI / 2 : -Math.PI / 2) - angle / 2;
  m.position.y = up ? -radius : radius;
  return g;
}
// A cone standing on a point, tipped back by `back` radians (spines, crest)
function spike(parent, size, at, back, roll = 0) {
  const m = mesh(new THREE.ConeGeometry(size * .5, size * 1.5, 12), MAT.horn, parent);
  m.rotation.set(-back, 0, roll);
  m.position.copy(at).add(V(0, size * .5, 0).applyEuler(m.rotation));
  return m;
}

// Where a ray meets a mesh that isn't in the scene (used to place parts on the head and snout)
const ray = new THREE.Raycaster();
function hitOn(target, origin, dir) {
  target.updateMatrixWorld(true);
  ray.set(origin, dir);
  const hit = ray.intersectObject(target)[0];
  return hit ? { point: hit.point.clone(), normal: hit.face.normal.clone().transformDirection(target.matrixWorld) } : null;
}
// Put a face part on a surface (in its parent's space), facing out. lookAt works in world space,
// so the part joins its parent first; while building, the parents are only moved, never turned.
function stick(obj, hit, out, parent) {
  parent.add(obj);
  obj.position.copy(hit.point).addScaledVector(hit.normal, out);
  obj.updateWorldMatrix(true, false);
  obj.lookAt(obj.getWorldPosition(V()).add(hit.normal));
}

// The 2D wing outline (Draig's membrane), relative to its pivot (100 205), 280 units = 1 m
const U = 1 / 280, W = (x, y) => [(x - 100) * U, (205 - y) * U];
function wingShape(tatty) {
  const s = new THREE.Shape();
  s.moveTo(...W(104, 214));
  s.bezierCurveTo(...W(70, 190), ...W(40, 150), ...W(22, 110));
  s.bezierCurveTo(...W(46, 118), ...W(62, 112), ...W(70, 98));
  s.bezierCurveTo(...W(78, 124), ...W(94, 132), ...W(108, 128));
  s.bezierCurveTo(...W(104, 150), ...W(108, 176), ...W(118, 196));
  if (!tatty) return s;
  // Torn: nicks cut into the free edge (everything after the leading edge), pulled towards the root
  const pts = s.getPoints(10), root = new THREE.Vector2(...W(104, 214));
  pts.forEach((p, i) => { if (i > 12 && i < pts.length - 3 && i % 4 === 2) p.lerp(root, .28); });
  return new THREE.Shape(pts);
}
const WING_BONES = [
  [[104, 214], [70, 190], [40, 150], [22, 110]],          // the leading edge
  [[100, 206], [80, 176], [72, 140], [70, 100]],          // the two fingers
  [[100, 206], [92, 180], [96, 150], [108, 128]]
].map(pts => new THREE.CubicBezierCurve3(...pts.map(([x, y]) => V(...W(x, y), .008))));

// ----- One dragon of one body type -----
function buildDragon(type) {
  const T = TYPES[type], S = shapes(type), at = S.at;
  const rig = new THREE.Group();                           // leans with the pose (pivot: his feet)
  const hip = T.torso.y0 + .1;
  const upper = new THREE.Group(); upper.position.y = hip; rig.add(upper);   // hunches at the hips
  const body = new THREE.Group(); body.position.y = -hip; upper.add(body);

  // The big smooth shapes (torso, head) don't take shadows: their own shadow edge drew a hard line
  // down the far side of the tummy. They still cast shadows on the floor.
  mesh(S.torso, MAT.skin, body).receiveShadow = false;

  // Legs and feet (planted, so not part of the hunch)
  for (const s of [-1, 1]) {
    const L = T.leg, top = V(s * L.x, hip, .02), ankle = V(s * L.x * 1.05, .08, .06);
    limb(MAT.red, rig, L.r, top, ankle);
    if (L.thigh) blob(MAT.red, rig, [L.thigh, L.thigh * .9, L.thigh], s * L.x, hip - .02, .03);
    if (L.knee) blob(MAT.red, rig, [L.knee, L.knee, L.knee], s * L.x * 1.02, (hip + .08) / 2, .05);
    const [fx, fy, fz] = L.foot;
    blob(MAT.red, rig, L.foot, s * L.x * 1.05, fy * .9, .1);
    for (const k of [-1, 0, 1]) blob(MAT.horn, rig, [.022, .02, .024], s * L.x * 1.05 + k * fx * .5, .025, .1 + fz * .92 - Math.abs(k) * .025);
  }

  // Arms: upper arm, a little bend at the elbow, a hand with three claws
  const arms = [-1, 1].map(s => {
    const A = T.arm, sh = at(A.at, A.round || .15);          // round: how far round to the front the shoulder sits
    const arm = new THREE.Group(); arm.position.set(s * (sh.x - A.r * .6), sh.y, sh.z); body.add(arm);
    limb(MAT.red, arm, A.r, V(), V(0, -A.upper, 0));
    if (A.shoulder) blob(MAT.red, arm, [A.shoulder, A.shoulder, A.shoulder], 0, -.01, 0);
    if (A.bicep) blob(MAT.red, arm, [A.bicep, A.bicep * 1.1, A.bicep], 0, -A.upper * .5, .025);
    const elbow = new THREE.Group(); elbow.position.y = -A.upper; elbow.rotation.x = -.35; arm.add(elbow);
    if (A.elbow) blob(MAT.red, elbow, [A.elbow, A.elbow, A.elbow], 0, 0, 0);
    limb(MAT.red, elbow, A.r * .92, V(), V(0, -A.fore, 0));
    const hand = A.r * 1.25;
    blob(MAT.red, elbow, [hand, hand, hand], 0, -A.fore - hand * .4, 0);
    for (const k of [-1, 0, 1]) blob(MAT.horn, elbow, [.017, .015, .017], k * hand * .6, -A.fore - hand * 1.25, hand * .35);
    arm.userData.side = s;
    return arm;
  });

  // Spines down his back
  T.spines.forEach((size, i) => spike(body, size, at(.9 - i * .16, -Math.PI / 2).add(V(0, 0, .01)), 1.05, type === 'pointed' ? (i % 2 ? .25 : -.2) : 0));

  // Wings: grow from his back, swept back; the right one is the left mirrored
  const shape = wingShape(T.wing.tatty);
  const wings = [-1, 1].map(s => {
    const root = at(T.wing.at, -Math.PI / 2 + s * .35);
    const sweep = new THREE.Group(); sweep.position.copy(root).add(V(0, 0, .03));
    sweep.scale.set(-s * T.wing.scale, T.wing.scale, T.wing.scale);
    sweep.rotation.y = s * T.wing.sweep;                    // how far the tips sweep back
    body.add(sweep);
    const flap = new THREE.Group(); sweep.add(flap);
    mesh(new THREE.ExtrudeGeometry(shape, { depth: .012, bevelEnabled: false, curveSegments: 16 }), MAT.wing, flap);
    WING_BONES.forEach((c, i) => mesh(taperedTube(c, i ? .012 : .018, .006, 20, 8), MAT.dark, flap));
    return flap;
  });

  // Tail: from the bottom of his back, thinning to a spade
  const tail = new THREE.Group(); tail.position.copy(at(.12, -Math.PI / 2)).add(V(.03, 0, .04)); rig.add(tail);
  const tc = curveOf(T.tail.pts);
  mesh(taperedTube(tc, ...T.tail.r), MAT.red, tail);
  const spade = new THREE.Group(); spade.position.copy(tc.getPointAt(1)); tail.add(spade);
  spade.quaternion.setFromUnitVectors(V(0, 1, 0), tc.getTangentAt(1));
  if (T.tail.droop) spade.rotateX(.6);
  const sp = mesh(new THREE.OctahedronGeometry(.1, 0), MAT.dark, spade, 0, .07 * T.tail.spade, 0);
  sp.scale.set(.75 * T.tail.spade, 1.05 * T.tail.spade, .28 * T.tail.spade);

  // Neck and head. The head pivots at the top of the neck; head size scales it from there.
  const neckBase = at(.95, 0).setX(0), H = T.head, hc = H.r[1] * .85;
  const head = new THREE.Group(); head.position.set(0, T.torso.y1 - .05 + T.neck.len, .02); body.add(head);
  if (T.neck.r) limb(MAT.red, body, T.neck.r, neckBase, head.position.clone().add(V(0, .05, 0)));
  mesh(S.head, MAT.red, head, 0, hc, 0).receiveShadow = false;
  const probe = new THREE.Mesh(S.head); probe.position.set(0, hc, 0);   // for placing parts (not drawn)
  const front = (x, y) => hitOn(probe, V(x, y, 3), V(0, 0, -1));
  const above = (x, z) => hitOn(probe, V(x, 3, z), V(0, -1, 0));

  // Snout, nostrils and mouth
  const N = T.snout, snoutHit = front(0, hc + N.y);
  const snout = new THREE.Group(); snout.position.copy(snoutHit.point).add(V(0, 0, N.s[2] * .3)); head.add(snout);
  const snoutMesh = blob(MAT.snout, snout, N.s, 0, 0, 0);
  for (const s of [-1, 1]) blob(MAT.brow, snout, [.016, .011, .01], s * N.s[0] * .25, N.s[1] * .42, N.s[2] * .82);
  const snoutProbe = new THREE.Mesh(SPHERE); snoutProbe.scale.set(...N.s); snoutProbe.position.copy(snout.position);
  const mouthY = snout.position.y - N.s[1] * (T.mouth === 'frown' ? .5 : .32);
  const mouthHit = hitOn(snoutProbe, V(0, mouthY, 3), V(0, 0, -1));
  const mouth = T.mouth === 'frown' ? arc(MAT.mouth, .035, .009, 1.5, true)
    : arc(MAT.mouth, T.mouth === 'grin' ? .085 : .07, .012, T.mouth === 'grin' ? 2.3 : 2.2);
  stick(mouth, mouthHit, -.002, head);
  if (T.mouth === 'grin') for (const s of [-1, 1]) {        // two small fangs at the corners of the grin
    const f = mesh(new THREE.ConeGeometry(.012, .035, 8), MAT.white, mouth, s * .05, .02, .004);
    f.rotation.z = Math.PI;
  }

  // Eyes: white, green iris, pupil, two highlights; droopy or hooded lids on some types
  const eyes = [-1, 1].map(s => {
    const eye = new THREE.Group();
    stick(eye, front(s * T.eye.x, hc + T.eye.y), .012, head);
    const ix = -s * .008;
    blob(MAT.white, eye, [.085, .095, .045], 0, 0, 0);
    blob(MAT.iris, eye, [.055, .055, .02], ix, -.012, .034);
    blob(MAT.pupil, eye, [.028, .03, .012], ix, -.016, .048);
    blob(MAT.shine, eye, [.016, .016, .006], ix + .02, .016, .055);
    blob(MAT.shine, eye, [.007, .007, .004], ix - .018, -.034, .052);
    if (T.eye.lid) {
      const lid = mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * T.eye.lid), MAT.red, eye);
      lid.scale.set(.092, .102, .054);
      lid.rotation.x = .45;                                 // the lid comes down over the front of the eye
    }
    return eye;
  });

  // Brows, cheeks
  for (const s of [-1, 1]) {
    const B = T.brow, brow = arc(MAT.brow, B.r, B.t, B.arc, true);
    stick(brow, front(s * T.eye.x, hc + T.eye.y + .115), -.004, head); brow.rotateZ(s * B.tilt);
    if (T.cheeks) { const c = new THREE.Group(); stick(c, front(s * .17, hc - .05), .004, head); blob(MAT.cheek, c, [.05, .032, .012], 0, 0, 0); }
  }

  // Horns: from the top of the head, curving back (one droops on the bedraggled type)
  for (const s of [-1, 1]) {
    const hit = above(s * H.r[0] * .42, -.03); if (!hit) continue;
    const L = T.horn.len, droop = T.horn.droop && s > 0;
    const b = hit.point.add(V(0, -.01, 0));
    const pts = [b, b.clone().add(V(s * .035 * L, .07 * L, -.04 * L)),
      b.clone().add(V(s * .07 * L, (droop ? .06 : .12) * L, -.12 * L)),
      b.clone().add(V(s * (droop ? .12 : .08) * L, (droop ? .01 : .12) * L, -.2 * L))];
    mesh(taperedTube(curveOf(pts), T.horn.r, .004, 24, 12), MAT.horn, head);
  }
  // Crest: three spikes along the top of the head
  T.crest.forEach((size, i) => {
    const hit = above(0, .06 - i * .1); if (hit) spike(head, size, hit.point.add(V(0, -.005, 0)), .5 + i * .2, type === 'pointed' ? [.3, -.25, .15][i] : 0);
  });

  // The line of action: a dotted curve through the pose (the 2D path, M150 400 C 236 330 262 220 196 62),
  // drawn over him like the 2D dashes. It doesn't lean with the rig, as in 2D.
  const loa = new THREE.Group();
  const P = (x, y) => V((x - 200) / 250, (400 - y) / 250, .5);
  const loaCurve = new THREE.CubicBezierCurve3(P(150, 400), P(236, 330), P(262, 220), P(196, 62));
  const dot = new THREE.SphereGeometry(.016, 10, 8);
  for (let i = 0; i <= 28; i++) { const d = new THREE.Mesh(dot, MAT.line); d.position.copy(loaCurve.getPoint(i / 28)); d.renderOrder = 2; loa.add(d); }

  // Pose: head and eye size, and Stiff or Line of action
  function pose({ head: headSize, eye, pose }) {
    const strong = pose === 'strong';
    head.scale.setScalar(headSize);
    eyes.forEach(e => e.scale.setScalar(eye));
    rig.rotation.z = strong ? -8 * deg : 0;
    upper.rotation.x = T.hunch * (strong ? .5 : 1) * deg;               // the bedraggled one hunches over
    head.rotation.set(T.hunch * (strong ? 1 : 2.2) * deg, 0, strong ? 9 * deg : 0);
    // Arms (2D angles; positive takes the left arm out to his side, negative the right).
    // Stiff: the type's resting angle. Line of action: the left arm raised (97°), the right out (-14°).
    arms.forEach(a => {
      const s = a.userData.side, rest = (T.arm.rest || 0) * -s;
      a.rotation.set(strong ? 0 : T.arm.swing || 0, 0, -(strong ? (s < 0 ? 97 : -14) : rest) * deg);
    });
    // Wings: open is how far out to the side they hang (a turn about the shoulder, as in 2D)
    wings[0].rotation.z = (T.wing.open + (strong ? 14 : 0)) * deg;
    wings[1].rotation.z = (T.wing.open + (strong ? 6 : 0)) * deg;
    tail.rotation.z = strong ? 28 * deg : 0;
    loa.visible = strong;
  }
  return { rig, loa, pose };
}

// A dragon that can change body type: the old one is swapped for a new build
function dragonSlot(scene, x = 0) {
  const who = new THREE.Group(); who.position.x = x; scene.add(who);
  let type = null, d = null;
  return {
    who,
    set(opts) {
      if (opts.shape !== type) {
        if (d) who.remove(d.rig, d.loa);
        type = TYPES[opts.shape] ? opts.shape : 'round';
        d = buildDragon(type);
        who.add(d.rig, d.loa);
      }
      d.pose(opts);
    }
  };
}

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [.9, 1.1, 3.3], look: [0, .6, 0] });
  status.textContent = '';
  const main = $('main'), build = $('build'), headSize = $('headSize'), eyeSize = $('eyeSize');

  // Build: one dragon. Compare: the same settings as the 2D compare, side by side.
  const one = dragonSlot(stage.scene), left = dragonSlot(stage.scene, -.85), right = dragonSlot(stage.scene, .85);
  left.set({ shape: 'square', pose: 'stiff', head: .82, eye: .55 });
  right.set({ shape: 'round', pose: 'strong', head: 1.15, eye: 1.2 });

  // Walk round him: drag, or the arrow keys on the focused stage. Kept to the front half,
  // so Left and Right in Compare never swap places.
  const orbit = new OrbitControls(stage.camera, canvas);
  orbit.target.set(0, .6, 0);
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
  let want = 3.4;
  function update() {
    const compare = main.dataset.mode === 'compare';
    one.who.visible = !compare; left.who.visible = right.who.visible = compare;
    want = compare ? 4.9 : 3.4;
    one.set({ shape: build.dataset.shape, pose: build.dataset.pose, head: headSize.value / 100, eye: eyeSize.value / 100 });
    $('type3d').textContent = TYPE_NAMES[build.dataset.shape] || TYPE_NAMES.round;   // the caption in the stage corner
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
