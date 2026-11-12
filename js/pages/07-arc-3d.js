// 07 Arc, 3D view: X Bot throws a ball (Mixamo Throw) or walks (Mixamo Walking).
// A motion trail follows one bone (hand, head or foot): the last half second of its path,
// fading out. Show motion path adds the whole path with a dot per frame, like After Effects.
// The thrown ball follows Straight / Arc and the arc height slider, shared with the 2D view.
import * as THREE from 'three';
import { studio, addBot } from '../three/studio.js';
import { std } from '../three/stage.js';
import { clipTravel, loadClip } from '../three/rig.js';
import { clock3d, clockSeconds } from '../three/view.js';
import { THROW } from '../three/clips.js';

const FPS = 25;
const $ = id => document.getElementById(id);
const BONES = { hand: 'RightHand', head: 'Head', foot: 'RightFoot' };
const FLIGHT = .9, DISTANCE = 3.2, BALL_R = .09;   // the ball's flight: seconds, metres, radius
const TRAIL = 13;                                   // trail length in frames (about half a second)
const ACTIONS = {
  throw: { clip: 'Throw', frames: 100, start: -2, keys: [THROW.windUp, THROW.release, THROW.release + FLIGHT] },
  walk:  { clip: 'Walking', frames: 52, start: -1.75, inPlace: true, keys: [0, .52, 1.04, 1.56] }   // a contact every step
};
const TRAIL_COLOUR = new THREE.Color('#9999FF'), BG = new THREE.Color('#0A0A15');

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [.3, 1.5, 6.4], look: [.3, 1, 0] });
  const main = $('main'), height = $('height');
  const action = () => ACTIONS[main.dataset.clip] || ACTIONS.throw;
  const clock = clock3d(canvas, action().frames);
  const v = new THREE.Vector3();

  const ball = stage.add(new THREE.SphereGeometry(BALL_R, 24, 16), std('#9999FF', .35));
  ball.visible = false;

  // Trail (the last half second, fading into the background) and the whole motion path
  const MAX = 140;
  const lineGeo = (n) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return g;
  };
  const trailGeo = lineGeo(TRAIL);
  trailGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true }));
  const pathGeo = lineGeo(MAX), ballPathGeo = lineGeo(MAX);
  const pathMat = new THREE.LineBasicMaterial({ color: '#9999FF', transparent: true, opacity: .35 });
  const path = new THREE.Line(pathGeo, pathMat), dots = new THREE.Points(pathGeo, new THREE.PointsMaterial({ color: '#C9C9FF', size: 4, sizeAttenuation: false }));
  const ballPath = new THREE.Line(ballPathGeo, pathMat), ballDots = new THREE.Points(ballPathGeo, dots.material);
  [trail, path, dots, ballPath, ballDots].forEach(o => { o.frustumCulled = false; stage.scene.add(o); });

  let rig = null, samples = [], ballSamples = [], speed = 0, release = null, releaseVel = null;

  // Where the figure stands at loop time s (the walk travels at a steady speed)
  function place(s) {
    const a = action();
    rig.model.position.x = a.start + (a.inPlace ? speed * s : 0);
    rig.setTime(a.inPlace ? s : Math.min(s, rig.duration - .01));   // the walk cycles; the throw holds its last pose
  }
  const bonePos = (name, out) => { rig.model.updateMatrixWorld(true); return rig.bone(name).getWorldPosition(out); };

  // The ball: in the hand until the release, then straight or in an arc to the floor
  function ballAt(s, out) {
    if (s < THROW.release) return null;
    const u = Math.min(1, (s - THROW.release) / FLIGHT);
    const end = v.set(release.x + DISTANCE, BALL_R, release.z);
    out.lerpVectors(release, end, u);
    if (main.dataset.path !== 'straight') out.y += 4 * (height.value / 100 * 1.6) * u * (1 - u);
    return out;
  }

  // Sample the chosen bone every frame of the loop (and the ball's flight), for the trail and the path
  function sample() {
    if (!rig) return;
    const a = action(), n = a.frames, name = BONES[main.dataset.bone] || BONES.hand;
    samples = [];
    for (let f = 0; f < n; f++) { place(f / FPS); samples.push(bonePos(name, new THREE.Vector3())); }
    if (a.clip === 'Throw') { place(THROW.release); release = bonePos('RightHand', new THREE.Vector3()); }
    ballSamples = [];
    if (a.clip === 'Throw') for (let f = Math.ceil(THROW.release * FPS); f <= (THROW.release + FLIGHT) * FPS; f++) ballSamples.push(ballAt(f / FPS, new THREE.Vector3()).clone());
    fill(pathGeo, samples); fill(ballPathGeo, ballSamples);
  }
  function fill(geo, list) {
    const p = geo.attributes.position;
    list.slice(0, p.count).forEach((s, i) => p.setXYZ(i, s.x, s.y, s.z));
    p.needsUpdate = true;
    geo.setDrawRange(0, Math.min(list.length, p.count));
  }

  async function startAction() {
    if (!rig) return;
    const a = action();
    await rig.play(a.clip, { inPlace: !!a.inPlace });
    if (a.inPlace) speed = clipTravel(await loadClip(a.clip)) * rig.scale / rig.duration;
    clock.effect.updateTiming({ duration: a.frames * 1000 / FPS });
    sample();
    view.onTiming();
  }

  addBot(stage, status, 'XBot', null, { at: [ACTIONS.throw.start, 0, 0], turn: Math.PI / 2 }).then(r => {
    if (!r.bones.length) return;
    rig = r; startAction();
  });

  main.addEventListener('statechange', e => {
    if (e.detail.attr === 'clip') startAction();
    else if (['bone', 'path'].includes(e.detail.attr)) sample();
  });
  height.addEventListener('input', sample);

  stage.onFrame(() => {
    if (!rig || !samples.length) return;
    const s = clockSeconds(clock), f = Math.min(samples.length - 1, Math.floor(s * FPS + 1e-6));
    place(s);
    // Trail: the frames leading up to now, brightest at the newest
    const p = trailGeo.attributes.position, c = trailGeo.attributes.color;
    for (let i = 0; i < TRAIL; i++) {
      const src = samples[Math.max(0, f - (TRAIL - 1 - i))];
      p.setXYZ(i, src.x, src.y, src.z);
      const k = i / (TRAIL - 1);
      c.setXYZ(i, ...BG.clone().lerp(TRAIL_COLOUR, k * k).toArray());
    }
    p.needsUpdate = c.needsUpdate = true;
    const showPath = main.dataset.motionpath === 'on';
    path.visible = dots.visible = showPath;
    // Ball
    const throwing = action().clip === 'Throw';
    ballPath.visible = ballDots.visible = showPath && throwing;
    ball.visible = throwing;
    if (throwing) {
      const at = ballAt(s, ball.position);
      if (!at) ball.position.copy(bonePos('RightHand', v));   // still in the hand
    }
  });

  const view = {
    clock, show: () => stage.start(), hide: () => stage.stop(),
    get frames() { return action().frames; },
    get keys() { return action().keys.map(t => Math.round(t * FPS)); },
    onTiming() {}                                   // the page sets this, to update the timeline
  };
  return view;
}
