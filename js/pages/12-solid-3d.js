// 12 Solid drawing, 3D view: a Mixamo bot to walk round (drag to orbit the camera).
// Display: Wireframe (the mesh), Clay (soft, even light), Normals (each face coloured by the way
// it points), Lit (key, fill and rim with shadows, the key slowly circling to show the form).
// Pose: natural (a held moment of Idle, weight on one leg, head tilted) or Twinning
// (shared with 2D): both sides mirror each other exactly, arms hanging the same, head straight.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { studio, addBot } from '../three/studio.js';
import { reducedMotion } from '../three/stage.js';
import { capturePose, scalePose, turnBone } from '../three/poses.js';

const $ = id => document.getElementById(id);
const deg = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0), FRONT = new THREE.Vector3(0, 0, 1);
const NATURAL_TIME = 3.2;   // a moment of Idle with the weight shifted

const MATS = {
  wire: new THREE.MeshBasicMaterial({ color: '#C9C9D3', wireframe: true }),
  normals: new THREE.MeshNormalMaterial()
};

export function create({ stageEl, canvas, status }) {
  const { stage, lights } = studio(stageEl, canvas, { pos: [1.6, 1.5, 3.6], look: [0, .95, 0] });
  const main = $('main'), settings = $('stage');

  // Clay: soft light from the sky and the floor, no key, fill or rim
  const soft = new THREE.HemisphereLight('#F2F2FF', '#3A3A55', 2.2);
  stage.scene.add(soft);

  const orbit = new OrbitControls(stage.camera, canvas);
  orbit.target.set(0, .95, 0);
  Object.assign(orbit, { enableDamping: true, enablePan: false, minDistance: 1.8, maxDistance: 6.5, maxPolarAngle: 88 * deg });
  orbit.update();

  // Keyboard: with the stage focused, the arrow keys walk the camera round (and up and down)
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

  // Both bots, one shown at a time. Each remembers its bind pose and its own materials.
  const bots = {};
  ['YBot', 'XBot'].forEach(file => {
    bots[file] = addBot(stage, status, file, null).then(rig => {
      rig.model.visible = false;
      if (!rig.bones.length) return rig;
      rig.rest = capturePose(rig);                                      // the bind pose (T-pose), before any clip plays
      rig.meshes = []; rig.model.traverse(o => { if (o.isMesh) rig.meshes.push([o, o.material]); });
      return rig;
    });
  });

  let rig = null;
  async function choose() {
    const file = main.dataset.bot === 'ybot' ? 'YBot' : 'XBot';
    const all = await Promise.all(Object.values(bots));
    const r = await bots[file];
    all.forEach(b => { b.model.visible = b === r; });
    rig = r;
    pose(); display();
  }

  // Natural: a held moment of Idle, plus a head tilt. Twinning: the bind pose with both arms
  // lowered by the same amount, so the left and right sides mirror each other exactly.
  async function pose() {
    if (!rig?.rest) return;
    if (settings.dataset.twin === 'on') {
      rig.mixer.stopAllAction();
      scalePose(rig, rig.rest, 0);                                      // back to the bind pose
      turnBone(rig.bone('LeftArm'), FRONT, -72 * deg);
      turnBone(rig.bone('RightArm'), FRONT, 72 * deg);
    } else {
      await rig.play('Idle');
      rig.setTime(NATURAL_TIME);
      turnBone(rig.bone('Head'), FRONT, 9 * deg);
      turnBone(rig.bone('Head'), UP, 18 * deg);
      turnBone(rig.bone('Spine1'), FRONT, -4 * deg);
    }
  }

  function display() {
    if (!rig?.meshes) return;
    const mode = main.dataset.display || 'lit';
    rig.meshes.forEach(([mesh, own]) => {
      mesh.material = mode === 'wire' ? MATS.wire : mode === 'normals' ? MATS.normals : own;
      mesh.castShadow = mode === 'lit';
    });
    const lit = mode === 'lit';
    ['key', 'fill', 'rim'].forEach(n => lights.setOn(n, lit));
    soft.visible = mode === 'clay';
  }

  main.addEventListener('statechange', e => {
    if (e.detail.attr === 'bot') choose();
    if (e.detail.attr === 'display') display();
  });
  settings.addEventListener('statechange', e => { if (e.detail.attr === 'twin') pose(); });
  choose();

  // Lit: the key light slowly circles the figure, so its form shows from every side
  stage.onFrame(dt => {
    orbit.update();
    if (main.dataset.display === 'lit' && !reducedMotion) lights.setAngle('key', lights.lights.key.angle + dt * .35);
  });

  return { show: () => stage.start(), hide: () => stage.stop() };
}
