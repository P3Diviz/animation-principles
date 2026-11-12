// 03 Staging, 3D view. Loaded by 03-staging.js the first time the learner picks 3D.
// Y Bot is the subject in front; X Bot stands further back. The Subject switch re-aims the lights
// and the Mid and Close shots, so learners see staging decide who we look at.
// Every control writes a data attribute on the stage area (shared with the 2D view);
// this file listens for those changes and applies them to the scene.
import * as THREE from 'three';
import { createStage, std, reducedMotion } from '../three/stage.js';
import { createRig } from '../three/rig.js';
import { createLights, bindLightPlot } from '../three/lights.js';
import { createShots } from '../three/cameras.js';
import { createSilhouette } from '../three/silhouette.js';
import { IDLE_OFFSET } from '../three/clips.js';

// Where each figure stands, and which way it faces (radians round the vertical).
// The plot in 03-staging.html marks them at 12 plot units per scene unit.
const FIGURES = {
  ybot: { file: 'YBot', at: new THREE.Vector3(0, 0, 0), turn: -.35, offset: 0 },
  xbot: { file: 'XBot', at: new THREE.Vector3(-1.6, 0, -1.8), turn: .45, offset: IDLE_OFFSET }
};

// Wide frames the whole set. Mid (waist up) and Close (head and shoulders) follow the subject.
// wedge = the camera wedge's length in the plot. (The reference's shots were framed for the taller
// stand-in mannequin; these are reframed for the 1.8-unit Mixamo bots.)
const SHOTS = {
  wide:  { pos: [0, 2, 6.6],       look: [0, 1, -.4],   wedge: 90 },
  mid:   { pos: [.3, 1.55, 2.2],   look: [0, 1.3, 0],   wedge: 58, follow: true },
  close: { pos: [.25, 1.62, 1.35], look: [0, 1.5, 0],   wedge: 36, follow: true }
};

// Clutter: a busy background that competes with the figures. [shape, size, position, turn, colour]
const GREYS = ['#4A4A66', '#5C5C78', '#3A3A55', '#6B6B88'];
const CLUTTER = [
  ['box', [3.6, .08, .5], [-.3, .9, -4.2], 0, 2],      // shelves along the back
  ['box', [3.6, .08, .5], [-.3, 1.8, -4.2], 0, 2],
  ['box', [.08, 2.2, .5], [-2.1, 1.1, -4.2], 0, 2],
  ['box', [.08, 2.2, .5], [1.5, 1.1, -4.2], 0, 2],
  ['box', [.4, .5, .35], [-1.6, 1.19, -4.2], .2, 1],    // things on the shelves
  ['box', [.6, .3, .35], [-.9, 1.09, -4.2], -.1, 0],
  ['cyl', [.14, .6], [-.2, 1.24, -4.2], 0, 3],
  ['ball', [.2], [.6, 1.14, -4.2], 0, 1],
  ['box', [.5, .45, .35], [1, 2.07, -4.2], .3, 3],
  ['cyl', [.18, .35], [-1.3, 2.02, -4.2], 0, 0],
  ['box', [.3, .6, .3], [.1, 2.14, -4.2], 0, 1],
  ['box', [.7, .7, .7], [3.2, .35, -2.6], .3, 0],       // on the floor
  ['box', [.5, .5, .5], [3.1, .95, -2.5], -.2, 1],
  ['cyl', [.35, 1], [-3.4, .5, -1.2], 0, 3],
  ['cone', [.25, .6], [2.5, .3, 1.4], 0, 1],
  ['box', [1.4, .08, .3], [-2.7, .04, .9], .4, 2],
  ['ball', [.22], [.9, .22, 1.6], 0, 3],
  ['ball', [.16], [-.6, .16, -1], 0, 0],
  ['box', [.4, 1.6, .4], [-3.8, .8, -3.2], 0, 1],
  ['cyl', [.06, 2.6], [2.6, 1.3, -3.6], 0, 3],
  ['ball', [.25], [2.6, 2.7, -3.6], 0, 1]
];
const shapes = {
  box: s => new THREE.BoxGeometry(...s),
  cyl: ([r, h]) => new THREE.CylinderGeometry(r, r, h, 24),
  cone: ([r, h]) => new THREE.ConeGeometry(r, h, 24),
  ball: ([r]) => new THREE.SphereGeometry(r, 24, 16)
};

export function create({ stageEl, canvas, status }) {
  const area = document.getElementById('stageArea'), plot = document.getElementById('plot');
  const stage = createStage(stageEl, canvas);
  const { scene, add } = stage;

  // The set: a crate and a ball, as in the 2D view
  add(new THREE.BoxGeometry(.9, .9, .9), std('#34344A'), 1.7, .45, -.6).rotation.y = .5;
  add(new THREE.SphereGeometry(.3, 32, 32), std('#9999FF', .35), -1.4, .3, .6);

  const clutter = new THREE.Group();
  const greys = GREYS.map(c => std(c, .7));
  CLUTTER.forEach(([shape, size, [x, y, z], turn, colour]) => {
    add(shapes[shape](size), greys[colour], x, y, z, clutter).rotation.y = turn;
  });
  scene.add(clutter);

  const lights = createLights(scene);
  const shots = createShots(stage.camera, SHOTS, area.dataset.shot);
  const silhouette = createSilhouette(stage);
  const plan = bindLightPlot(plot, lights);

  // The subject: lights and the Mid/Close shots ease over to whoever is chosen
  const focus = new THREE.Vector3(), focusGoal = new THREE.Vector3();
  const subject = () => FIGURES[area.dataset.subject] || FIGURES.ybot;
  focus.copy(subject().at); focusGoal.copy(focus);

  // Both figures, loaded side by side; each plays Idle on its own mixer
  const rigs = [];
  status.textContent = 'Loading models…';
  Promise.all(Object.values(FIGURES).map(async f => {
    const rig = await createRig(f.file);
    rig.model.position.copy(f.at);
    rig.model.rotation.y = f.turn;
    scene.add(rig.model);
    await rig.play('Idle', { offset: f.offset });
    rigs.push(rig);
    return rig.note;
  })).then(notes => {
    status.textContent = [...new Set(notes.filter(Boolean))].join('. ');
    silhouette.refresh();                       // dress the new figures if the test is on
  });

  // Apply one control (or all of them) from the stage area's data attributes
  function apply(attr) {
    const d = area.dataset;
    if (!attr || ['key', 'fill', 'rim'].includes(attr)) ['key', 'fill', 'rim'].forEach(n => lights.setOn(n, d[n] !== 'off'));
    if (!attr || attr === 'shot') shots.set(d.shot || 'wide');
    if (!attr || attr === 'silhouette') silhouette.set(d.silhouette === 'on');
    if (!attr || attr === 'clutter') clutter.visible = d.clutter === 'on';
    if (!attr || attr === 'subject') focusGoal.copy(subject().at);
  }
  apply();
  area.addEventListener('statechange', e => apply(e.detail.attr));

  stage.onFrame(dt => {
    if (!reducedMotion) rigs.forEach(r => r.update(dt));
    // Ease the focus, then re-aim the lights and camera at it
    const k = reducedMotion ? 1 : 1 - Math.pow(1 - .06, dt * 60);
    if (focus.distanceToSquared(focusGoal) > 1e-6) {
      focus.lerp(focusGoal, k);
      lights.setFocus(focus);
    }
    shots.setFocus(focus);
    shots.update(dt);
    plan.drawCamera(shots.pos, shots.look, shots.wedge);   // only writes to the page when it changes
  });
  lights.setFocus(focus);
  stage.renderer.compile(scene, stage.camera);

  return {
    show() { plan.enable(true); stage.start(); },
    hide() { stage.stop(); plan.enable(false); }
  };
}
