// 11 Appeal, 3D view: the Mixamo Y Bot (Paul's choice).
//   Body type: one slider, skinny (0) to muscular (100) to cuddly (200), blending smoothly between
//     the three builds. Skinny is thin everywhere; muscular has a broad chest and neck and thick arms
//     and legs; cuddly is soft and wide with a slightly bigger head (a bigger head reads younger and
//     friendlier).
//   Pose: Stiff (the bind pose, arms lowered the same amount, as Twinning on 12), Laughing, Hero or
//     Hunched (Mixamo clips Paul downloaded: Laughing.fbx, Hero.fbx, Hunched.fbx). Each build has a
//     pose that suits it (cuddly and laughing, muscular and hero, skinny and hunched), but any build
//     can take any pose, so learners can try the pairings.
//   Still or Moving: hold one chosen moment of the clip, or let it play on the spot.
//   Line of action: a dotted line through his actual bones (supporting foot, hips, chest, head),
//     over any pose, still or moving.
// The 2D Shape language, Head size, Eye size and Compare are 2D only (the bots have no faces).
//
// Body types don't move any bone. Each bone's skin is scaled about the bone in the bone's own space
// (its length runs along its y axis, so x and z are thickness): the bone's inverse bind matrix is
// multiplied by the scale. Joints stay where they are, limbs keep their length, the pose tools and
// the mixer are untouched, and the mesh blends smoothly between bones.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { studio, addBot } from '../three/studio.js';
import { capturePose, scalePose, turnBone } from '../three/poses.js';

const $ = id => document.getElementById(id);
const deg = Math.PI / 180;
const FRONT = new THREE.Vector3(0, 0, 1);

// The clip for each pose, the moment held when Still (seconds), and a turn towards the camera.
// Chosen from contact sheets of each clip: Laughing at its biggest laugh (head thrown to one side),
// Hunched at its deepest stoop, Hero (a fists-up stance) turned so the chest and fists face us.
const POSES = {
  laughing: { clip: 'Laughing', still: 2.5 },
  hero:     { clip: 'Hero',     still: 1.6, turn: .6 },
  hunched:  { clip: 'Hunched',  still: 3.5 }
};

// Thickness of each part, [across, front to back] (1 = as Mixamo made it), and the head's size.
// Neighbouring parts change gently, or the Y Bot's torso segments step out like rings.
const BUILDS = [
  { name: 'Skinny', head: 1,
    Hips: [.8, .8], Spine: [.72, .72], Spine1: [.72, .72], Spine2: [.78, .78], Neck: [.7, .7],
    Shoulder: [.8, .8], Arm: [.6, .6], ForeArm: [.6, .6], Hand: [.9, .9], UpLeg: [.62, .62], Leg: [.62, .62] },
  { name: 'Muscular', head: .97,
    Hips: [1.1, 1.1], Spine: [1.05, 1.05], Spine1: [1.25, 1.15], Spine2: [1.5, 1.3], Neck: [1.45, 1.45],
    Shoulder: [1.35, 1.35], Arm: [1.5, 1.5], ForeArm: [1.4, 1.4], Hand: [1.2, 1.2], UpLeg: [1.35, 1.35], Leg: [1.3, 1.3] },
  { name: 'Cuddly', head: 1.12,
    Hips: [1.32, 1.35], Spine: [1.4, 1.48], Spine1: [1.38, 1.45], Spine2: [1.25, 1.3], Neck: [1.18, 1.18],
    Shoulder: [1.12, 1.12], Arm: [1.25, 1.25], ForeArm: [1.2, 1.2], Hand: [1, 1], UpLeg: [1.32, 1.32], Leg: [1.2, 1.2] }
];
// The build at slider value v (0..200): a blend of the two builds either side
function buildAt(v) {
  const t = Math.min(2, Math.max(0, v / 100)), i = Math.min(1, Math.floor(t)), k = t - i;
  const a = BUILDS[i], b = BUILDS[i + 1], mix = (x, y) => x + (y - x) * k;
  const out = { name: BUILDS[Math.round(t)].name, head: mix(a.head, b.head) };
  for (const part of Object.keys(a)) if (Array.isArray(a[part])) out[part] = [mix(a[part][0], b[part][0]), mix(a[part][1], b[part][1])];
  return out;
}

const MAT_LINE = new THREE.MeshBasicMaterial({ color: '#9999FF', transparent: true, opacity: .85, depthTest: false });

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [1.3, 1.45, 4.6], look: [0, 1, 0] });
  const build = $('build'), slider = $('body3d');

  const dots = new THREE.Group(); stage.scene.add(dots);
  const dot = new THREE.SphereGeometry(.018, 10, 8);
  for (let i = 0; i < 30; i++) { const d = new THREE.Mesh(dot, MAT_LINE); d.renderOrder = 2; dots.add(d); }
  dots.visible = false;

  let rig = null, rest = null, skins = [], shown = null, moving = false;
  const ready = addBot(stage, status, 'YBot', null).then(r => {
    rig = r;
    r.model.traverse(o => { if (o.isSkinnedMesh) skins.push({ skel: o.skeleton, orig: o.skeleton.boneInverses.map(m => m.clone()) }); });
    rest = r.bones.length ? capturePose(r) : null;             // the bind pose, before any clip plays
  });

  // Scale each bone's skin: thickness from the build, the head uniformly
  function shape(b) {
    const m = new THREE.Matrix4();
    skins.forEach(({ skel, orig }) => skel.bones.forEach((bone, i) => {
      const name = bone.name.replace(/^mixamorig:?/, '').replace(/^(Left|Right)/, '');
      const [across, depth] = b[name] || [1, 1];
      const s = /^Head/.test(name) ? b.head : 1;
      skel.boneInverses[i].copy(m.makeScale(across * s, s, depth * s).multiply(orig[i]));
    }));
  }

  // The dotted line of action: a smooth curve from the supporting foot (the one more nearly under
  // the hips) up through the hips and chest to the top of the head
  const v = () => new THREE.Vector3();
  const pts = [v(), v(), v(), v()], footL = v(), footR = v();
  const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  function drawLine() {
    rig.model.updateMatrixWorld(true);
    rig.bone('Hips').getWorldPosition(pts[1]); rig.bone('Spine2').getWorldPosition(pts[2]);
    (rig.bone('HeadTop_End') || rig.bone('Head')).getWorldPosition(pts[3]);
    rig.bone('LeftToeBase').getWorldPosition(footL); rig.bone('RightToeBase').getWorldPosition(footR);
    pts[0].copy(flat(footL, pts[1]) < flat(footR, pts[1]) ? footL : footR);
    pts[0].y = Math.max(pts[0].y, .02);
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    dots.children.forEach((d, i) => d.position.copy(curve.getPoint(i / (dots.children.length - 1))));
  }

  async function update() {
    const b = buildAt(+slider.value);
    $('bodyName').textContent = b.name; slider.setAttribute('aria-valuetext', b.name);
    $('type3d').textContent = b.name;                          // the caption in the stage corner
    await ready;
    if (!rest) return;
    shape(b);
    const pose = POSES[build.dataset.pose3d];
    moving = !!pose && build.dataset.motion3d === 'moving';
    if (pose) {
      if (shown !== pose.clip) {                               // a new pose starts on its chosen moment
        if (!(await rig.play(pose.clip, { inPlace: true }))) return;
        shown = pose.clip;
        rig.setTime(pose.still);
      }
      if (!moving) rig.setTime(pose.still);
      rig.model.rotation.y = pose.turn || 0;
    } else {
      rig.mixer.stopAllAction(); shown = null; rig.model.rotation.y = 0;
      scalePose(rig, rest, 0);                                 // back to the bind pose (a T-pose)
      turnBone(rig.bone('LeftArm'), FRONT, -72 * deg);          // both arms lowered the same amount, as on 12
      turnBone(rig.bone('RightArm'), FRONT, 72 * deg);
    }
    status.textContent = rig.note;
    dots.visible = build.dataset.line3d === 'on';
    if (dots.visible) drawLine();
  }
  build.addEventListener('statechange', update);
  slider.addEventListener('input', update);
  update();

  // Walk round him: drag, or the arrow keys on the focused stage
  const orbit = new OrbitControls(stage.camera, canvas);
  orbit.target.set(0, 1, 0);
  Object.assign(orbit, { enableDamping: true, enablePan: false, enableZoom: false, maxPolarAngle: 86 * deg });
  orbit.update();
  const sph = new THREE.Spherical(), off = new THREE.Vector3();
  canvas.addEventListener('keydown', e => {
    const d = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[e.key];
    if (!d) return;
    e.preventDefault();
    off.subVectors(stage.camera.position, orbit.target); sph.setFromVector3(off);
    sph.theta += d[0] * deg;
    sph.phi = Math.min(orbit.maxPolarAngle, Math.max(.15, sph.phi + d[1] * deg));
    stage.camera.position.copy(orbit.target).add(off.setFromSpherical(sph));
    orbit.update();
  });

  // Moving: the clip plays on the spot, and the line of action follows him. (It starts on Still, so
  // under reduced motion nothing moves until the learner asks for it.)
  stage.onFrame(dt => {
    if (moving && rig) {
      rig.update(dt);
      if (dots.visible) drawLine();
    }
    orbit.update();
  });

  return { show: () => stage.start(), hide: () => stage.stop() };
}
