// 11 Appeal, 3D view: the Mixamo Y Bot (Paul's choice), with the same controls as 2D, read for a
// figure:
//   Shape language: a body type. Round = chubby (wide soft torso and limbs), Square = muscular
//     (broad chest and neck, thick arms and legs), Pointed = skinny (thin everywhere, stooped).
//   Head size: his head, scaled about the neck. (The bots have no eyes, so Eye size is 2D only.)
//   Pose: Stiff (the bind pose, arms lowered the same amount, as Twinning on 12) or Line of action
//     (the wind-up of the Throw clip: one long curve from the back foot to the raised hand), with a
//     dotted line through his actual bones.
//   Compare: two Y Bots, the 2D compare's two settings side by side.
//
// Body types and head size don't move any bone. Each bone's skin is scaled about the bone in the
// bone's own space (its length runs along its y axis, so x and z are thickness): the bone's inverse
// bind matrix is multiplied by the scale. Joints stay where they are, limbs keep their length, the
// pose tools and the mixer are untouched, and the mesh blends smoothly between bones.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { studio, addBot } from '../three/studio.js';
import { reducedMotion } from '../three/stage.js';
import { capturePose, scalePose, turnBone } from '../three/poses.js';

const $ = id => document.getElementById(id);
const deg = Math.PI / 180;
const FRONT = new THREE.Vector3(0, 0, 1), SIDE = new THREE.Vector3(1, 0, 0);
const TYPE_NAMES = { round: 'Chubby', square: 'Muscular', pointed: 'Skinny' };
// Line of action: the Throw clip's wind-up (hips held in place), leaning back with the throwing arm
// high, turned so the long diagonal from his back foot to his raised hand faces the camera. Chosen
// from a contact sheet of Jump, Throw and Idle moments: the take-off of the jump read as a crouch.
const LINE_POSE = { time: 1.25, turn: 2.2 };

// Thickness of each part, [across, front to back] (1 = as Mixamo made it). Bones not listed stay as they are.
const BUILD = {
  round: {   // neighbouring parts change gently, or the Y Bot's torso segments step out like rings
    Hips: [1.32, 1.35], Spine: [1.4, 1.48], Spine1: [1.38, 1.45], Spine2: [1.25, 1.3], Neck: [1.18, 1.18],
    Shoulder: [1.12, 1.12], Arm: [1.25, 1.25], ForeArm: [1.2, 1.2], UpLeg: [1.32, 1.32], Leg: [1.2, 1.2]
  },
  square: {
    Hips: [1.1, 1.1], Spine: [1.05, 1.05], Spine1: [1.25, 1.15], Spine2: [1.5, 1.3], Neck: [1.45, 1.45],
    Shoulder: [1.35, 1.35], Arm: [1.5, 1.5], ForeArm: [1.4, 1.4], Hand: [1.2, 1.2], UpLeg: [1.35, 1.35], Leg: [1.3, 1.3]
  },
  pointed: {
    Hips: [.8, .8], Spine: [.72, .72], Spine1: [.72, .72], Spine2: [.78, .78], Neck: [.7, .7],
    Shoulder: [.8, .8], Arm: [.6, .6], ForeArm: [.6, .6], Hand: [.9, .9], UpLeg: [.62, .62], Leg: [.62, .62]
  }
};
const STOOP = { round: 0, square: 0, pointed: 1 };          // the skinny one stoops and drops his head

const MAT_LINE = new THREE.MeshBasicMaterial({ color: '#9999FF', transparent: true, opacity: .85, depthTest: false });

// One Y Bot on the stage, with its own body type, head size and pose
async function figure(stage, status, x) {
  const rig = await addBot(stage, status, 'YBot', null, { at: [x, 0, 0] });
  const skins = [];                                          // every skinned mesh, with its original inverse bind matrices
  rig.model.traverse(o => { if (o.isSkinnedMesh) skins.push({ skel: o.skeleton, orig: o.skeleton.boneInverses.map(m => m.clone()) }); });
  const rest = rig.bones.length ? capturePose(rig) : null;   // the bind pose, before any clip plays
  const dots = new THREE.Group(); stage.scene.add(dots);
  const dot = new THREE.SphereGeometry(.018, 10, 8);
  for (let i = 0; i < 30; i++) { const d = new THREE.Mesh(dot, MAT_LINE); d.renderOrder = 2; dots.add(d); }

  // Scale each bone's skin: thickness from the body type, the head uniformly by head size
  function shape(type, head) {
    const build = BUILD[type] || BUILD.round, m = new THREE.Matrix4();
    skins.forEach(({ skel, orig }) => skel.bones.forEach((b, i) => {
      const name = b.name.replace(/^mixamorig:?/, '').replace(/^(Left|Right)/, '');
      const [across, depth] = build[name] || [1, 1];
      const s = /^Head/.test(name) ? head : 1;
      skel.boneInverses[i].copy(m.makeScale(across * s, s, depth * s).multiply(orig[i]));
    }));
  }

  // The dotted line of action: a smooth curve from the back foot (the one further from the raised
  // hand) through the hips and chest to the raised hand (whichever hand is higher)
  const pts = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const footL = new THREE.Vector3(), footR = new THREE.Vector3(), handL = new THREE.Vector3(), handR = new THREE.Vector3();
  let lineOn = false, onStage = true;
  function drawLine(show) {
    lineOn = show; dots.visible = show && onStage;
    if (!show || !rig.bones.length) return;
    rig.model.updateMatrixWorld(true);
    rig.bone('Hips').getWorldPosition(pts[1]); rig.bone('Spine2').getWorldPosition(pts[2]);
    rig.bone('LeftHand').getWorldPosition(handL); rig.bone('RightHand').getWorldPosition(handR);
    pts[3].copy(handL.y > handR.y ? handL : handR);
    rig.bone('LeftToeBase').getWorldPosition(footL); rig.bone('RightToeBase').getWorldPosition(footR);
    pts[0].copy(footL.distanceTo(pts[3]) > footR.distanceTo(pts[3]) ? footL : footR);
    pts[0].y = Math.max(pts[0].y, .02);
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    dots.children.forEach((d, i) => d.position.copy(curve.getPoint(i / (dots.children.length - 1))));
  }

  let shown = null;
  async function set({ shape: type, head, pose }) {
    shape(type, head);
    if (!rest) return;
    const strong = pose === 'strong', stoop = STOOP[type] || 0;
    if (strong) {
      if (shown !== 'throw') { await rig.play('Throw', { inPlace: true }); shown = 'throw'; }
      rig.setTime(LINE_POSE.time);
      rig.model.rotation.y = LINE_POSE.turn;
    } else {
      rig.mixer.stopAllAction(); shown = null; rig.model.rotation.y = 0;
      scalePose(rig, rest, 0);                                // back to the bind pose (a T-pose)
      turnBone(rig.bone('LeftArm'), FRONT, -72 * deg);         // both arms lowered the same amount, as on 12
      turnBone(rig.bone('RightArm'), FRONT, 72 * deg);
    }
    if (stoop) {                                              // skinny: rounded shoulders, head hanging
      turnBone(rig.bone('Spine1'), SIDE, 8 * deg);
      turnBone(rig.bone('Spine2'), SIDE, 8 * deg);
      turnBone(rig.bone('Head'), SIDE, 14 * deg);
    }
    drawLine(strong);
  }
  return { rig, set, show(on) { onStage = on; rig.model.visible = on; dots.visible = on && lineOn; } };
}

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [1.3, 1.45, 4.3], look: [0, 1, 0] });
  const main = $('main'), build = $('build'), headSize = $('headSize');

  // Build: one figure. Compare: the 2D compare's two settings, side by side.
  const LEFT = { shape: 'square', pose: 'stiff', head: .82 }, RIGHT = { shape: 'round', pose: 'strong', head: 1.15 };
  const ready = Promise.all([figure(stage, status, 0), figure(stage, status, -.9), figure(stage, status, .9)]);

  // Walk round him: drag, or the arrow keys on the focused stage. Kept to the front half,
  // so Left and Right in Compare never swap places.
  const orbit = new OrbitControls(stage.camera, canvas);
  orbit.target.set(0, 1, 0);
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
  let want = 4.6;
  async function update() {
    const compare = main.dataset.mode === 'compare';
    want = compare ? 6.4 : 4.6;
    $('type3d').textContent = TYPE_NAMES[build.dataset.shape] || TYPE_NAMES.round;   // the caption in the stage corner
    const [one, left, right] = await ready;
    one.show(!compare); left.show(compare); right.show(compare);
    await one.set({ shape: build.dataset.shape, pose: build.dataset.pose, head: headSize.value / 100 });
  }
  ready.then(async ([, left, right]) => { await left.set(LEFT); await right.set(RIGHT); update(); });
  build.addEventListener('statechange', update);
  main.addEventListener('statechange', e => { if (e.detail.attr === 'mode') update(); });
  headSize.addEventListener('input', update);
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
