// 11 Appeal, 3D view: Draig as a little 3D dragon, modelled in Blender (tools/blender/draig_3d.py
// builds and exports assets/models/draig-round.glb, -square.glb and -pointed.glb). Same controls as 2D.
// In 3D the shape language is a whole body type (Paul's idea), so learners see shape carry personality:
//   round    chubby: a round tummy with belly plates, rosy cheeks, a big smile, stubby limbs, small wings
//   square   muscular: broad chest, pecs and a six-pack, big shoulders and arms, determined brows, a grin
//   pointed  skinny and bedraggled: narrow, ribs showing, hunched, heavy lids, worried brows, a frown,
//            thin knobbly limbs, torn wings, a drooping horn, a tail dragging on the floor
// The models are posed through their named parts, each with its pivot at its origin:
//   Dragon > Legs, Tail, Body > Head > EyeL, EyeR;  Body > ArmL, ArmR, WingL, WingR
// Head size scales the head about the neck; eye size scales the eyes. Stiff or Line of action
// (the 2D angles: a 2D angle a is a turn of -a about z here). Compare: the 2D compare's two settings.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { studio } from '../three/studio.js';
import { reducedMotion } from '../three/stage.js';

const $ = id => document.getElementById(id);
const deg = Math.PI / 180;
const TYPE_NAMES = { round: 'Chubby', square: 'Muscular', pointed: 'Skinny and bedraggled' };
const HUNCH = { round: 0, square: 0, pointed: 9 };          // degrees the bedraggled one stoops at the hips

// ----- Materials, given to each part by its material name from Blender. Draig's colours, plush. -----
const plush = (color, extra = {}) => new THREE.MeshPhysicalMaterial({
  color, roughness: .7, sheen: .35, sheenRoughness: .5, sheenColor: new THREE.Color('#FF7A88'), ...extra });
const MAT = {
  skin:  plush('#FFFFFF', { vertexColors: true }),          // body and head: red, belly and snout painted on
  red:   plush('#E0283F'),
  dark:  plush('#A3162F'),
  wing:  plush('#C21F3B', { side: THREE.DoubleSide }),
  horn:  new THREE.MeshStandardMaterial({ color: '#F3DDAE', roughness: .45 }),
  white: new THREE.MeshPhysicalMaterial({ color: '#F7F7FB', roughness: .15, clearcoat: 1, clearcoatRoughness: .1 }),
  iris:  new THREE.MeshPhysicalMaterial({ color: '#1FA055', roughness: .2, clearcoat: 1, clearcoatRoughness: .1 }),
  pupil: new THREE.MeshPhysicalMaterial({ color: '#05100A', roughness: .1, clearcoat: 1 }),
  shine: new THREE.MeshBasicMaterial({ color: '#FFFFFF' }),
  line:  new THREE.MeshBasicMaterial({ color: '#9999FF', transparent: true, opacity: .85, depthTest: false })
};
// The big smooth shapes don't take shadows: their own shadow edge drew a hard line down the tummy.
const NO_SHADOW_IN = new Set(['Body', 'Head']);

// ----- Loading: one model per body type, loaded the first time it's wanted -----
const loader = new GLTFLoader();
const models = {};
function model(type) {
  models[type] ??= loader.loadAsync(new URL(`../../assets/models/draig-${type}.glb`, import.meta.url).href).then(gltf => {
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      o.material = MAT[o.material.name] || MAT.red;
      o.castShadow = true;
      o.receiveShadow = !NO_SHADOW_IN.has(o.name) && !NO_SHADOW_IN.has(o.parent?.name);
    });
    return gltf.scene;
  });
  return models[type];
}

// The line of action: a dotted curve through the pose (the 2D path, M150 400 C 236 330 262 220 196 62),
// drawn over him like the 2D dashes. It doesn't lean with him, as in 2D.
function lineOfAction() {
  const loa = new THREE.Group();
  const P = (x, y) => new THREE.Vector3((x - 200) / 250, (400 - y) / 250, .5);
  const curve = new THREE.CubicBezierCurve3(P(150, 400), P(236, 330), P(262, 220), P(196, 62));
  const dot = new THREE.SphereGeometry(.016, 10, 8);
  for (let i = 0; i <= 28; i++) {
    const d = new THREE.Mesh(dot, MAT.line);
    d.position.copy(curve.getPoint(i / 28)); d.renderOrder = 2;
    loa.add(d);
  }
  return loa;
}

// One dragon on the stage. set() swaps in the body type's model if it changed, then poses it.
function dragonSlot(scene, x = 0) {
  const who = new THREE.Group(); who.position.x = x; scene.add(who);
  const loa = lineOfAction(); who.add(loa);
  let type = null, d = null, want = null;
  function pose({ head, eye, pose }) {
    if (!d) return;
    const strong = pose === 'strong', h = HUNCH[type];
    const part = d.parts;
    part.Dragon.rotation.z = strong ? -8 * deg : 0;
    part.Body.rotation.x = h * (strong ? .5 : 1) * deg;
    part.Head.scale.setScalar(head);
    part.Head.rotation.set(h * (strong ? 1 : 2.2) * deg, 0, strong ? 9 * deg : 0);
    part.EyeL.scale.setScalar(eye); part.EyeR.scale.setScalar(eye);
    // Arms: Line of action raises the left arm (97° in 2D) and swings the right out (-14°)
    part.ArmL.rotation.z = strong ? -97 * deg : 0;
    part.ArmR.rotation.z = strong ? 14 * deg : 0;
    // Wings open a little (2D: left -14, right 6), the tail sweeps up (2D -28)
    part.WingL.rotation.z = strong ? 14 * deg : 0;
    part.WingR.rotation.z = strong ? -6 * deg : 0;
    part.Tail.rotation.z = strong ? 28 * deg : 0;
    loa.visible = strong;
  }
  return {
    who,
    async set(opts) {
      want = opts;
      const t = TYPE_NAMES[opts.shape] ? opts.shape : 'round';
      if (t !== type) {
        const scene = await model(t);
        if (want !== opts) return;                         // a newer choice arrived while this one loaded
        if (d) who.remove(d.root);
        const root = scene.clone(true);                    // shares the geometry with other copies
        const parts = {};
        root.traverse(o => { if (o.name) parts[o.name] = o; });
        parts.Dragon ??= root;
        d = { root, parts }; type = t;
        who.add(root);
      }
      pose(opts);
    }
  };
}

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [.9, 1.1, 3.3], look: [0, .6, 0] });
  const main = $('main'), build = $('build'), headSize = $('headSize'), eyeSize = $('eyeSize');

  // Build: one dragon. Compare: the same settings as the 2D compare, side by side.
  const one = dragonSlot(stage.scene), left = dragonSlot(stage.scene, -.85), right = dragonSlot(stage.scene, .85);
  status.textContent = 'Loading model…';
  Promise.all([
    left.set({ shape: 'square', pose: 'stiff', head: .82, eye: .55 }),
    right.set({ shape: 'round', pose: 'strong', head: 1.15, eye: 1.2 })
  ]).then(() => { status.textContent = ''; }, e => { console.error(e); status.textContent = 'The 3D dragon could not load'; });

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
    one.set({ shape: build.dataset.shape, pose: build.dataset.pose, head: headSize.value / 100, eye: eyeSize.value / 100 })
      .catch(e => { console.error(e); status.textContent = 'The 3D dragon could not load'; });
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
