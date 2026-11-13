// 07 Arc, 3D view: X Bot throws a ball (Mixamo Throw) or walks (Mixamo Walking).
// A motion trail follows one bone (hand, head or foot): the last half second of its path,
// fading out. Show motion path adds the whole path with a dot per frame, like After Effects.
// The ball sits in his palm. Arc: it leaves his hand as the hand comes up past his head and flies
// as a real thrown ball (a parabola) starting along the hand's own line of motion; the arc height
// slider sets how high it goes (a higher throw also goes further). Straight: it leaves later, as
// the hand comes down, and travels in a straight line to the floor.
import * as THREE from 'three';
import { studio, addBot } from '../three/studio.js';
import { std } from '../three/stage.js';
import { clipTravel, loadClip } from '../three/rig.js';
import { capturePose, scalePose, feetHeight } from '../three/poses.js';
import { clock3d, clockSeconds } from '../three/view.js';
import { THROW } from '../three/clips.js';

const FPS = 25;
const $ = id => document.getElementById(id);
const BONES = { hand: 'RightHand', head: 'Head', foot: 'RightFoot' };
const FLIGHT = .9, DISTANCE = 3.2, BALL_R = .065;  // straight throw: seconds, metres; ball radius (fits his hand)
const G = 9.8;
const BALL_SPEED = .65;                             // arc: share of the hand's speed the ball leaves with (keeps it on the stage)
const lerp = (a, b, t) => a + (b - a) * t;
const TRAIL = 13;                                   // trail length in frames (about half a second)
const ACTIONS = {
  throw: { clip: 'Throw', frames: 106, start: -2,    // keys come from the ball's flight once it's worked out
           keys: [THROW.windUp, THROW.releaseUp, THROW.releaseUp + FLIGHT] },

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

  let rig = null, samples = [], ballSamples = [], speed = 0, flight = null;

  // ----- How hard he throws (Arc only: the height slider; Straight is always a full throw) -----
  // A gentler throw has a smaller wind-up and follow-through (every joint's movement from his
  // standing pose scaled down) and a slower forward swing (the throw section of the clip slowed).
  const THROW_FROM = 1.3, THROW_TO = 1.9;             // the forward throw, in clip time
  const power = () => main.dataset.path === 'straight' ? 1 : height.value / 100;
  const swingRate = () => lerp(.65, 1, power());       // speed of the forward throw
  const bodySize = () => lerp(.55, 1, power());        // size of the wind-up and follow-through
  // Loop time -> clip time, with the forward throw played at swingRate()
  function clipTime(s) {
    const r = swingRate(), slow = (THROW_TO - THROW_FROM) / r;
    if (s < THROW_FROM) return s;
    if (s < THROW_FROM + slow) return THROW_FROM + (s - THROW_FROM) * r;
    return THROW_TO + (s - THROW_FROM - slow);
  }
  // ...and back: when (loop time) the clip reaches clip time c
  function loopTime(c) {
    if (c < THROW_FROM) return c;
    const r = swingRate();
    if (c < THROW_TO) return THROW_FROM + (c - THROW_FROM) / r;
    return c + (THROW_TO - THROW_FROM) / r - (THROW_TO - THROW_FROM);
  }
  let standing = null, restFeet = 0;

  // Where the figure stands, and his pose, at loop time s (the walk travels at a steady speed)
  function place(s) {
    const a = action();
    rig.model.position.set(a.start + (a.inPlace ? speed * s : 0), 0, 0);
    if (a.inPlace) { rig.setTime(s); return; }                      // the walk cycles
    rig.setTime(Math.min(clipTime(s), rig.duration - .01));        // the throw holds its last pose
    const k = bodySize();
    if (k < 1 && standing) {
      scalePose(rig, standing, k);
      rig.model.position.y = restFeet - feetHeight(rig);           // keep his feet on the floor
    }
  }
  const bonePos = (name, out) => { rig.model.updateMatrixWorld(true); return rig.bone(name).getWorldPosition(out); };

  // The middle of his palm, where the ball sits: between the wrist and the knuckles, lifted off the
  // palm by the ball's radius (the palm faces along index-to-pinky crossed with wrist-to-knuckles)
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3(), pn = new THREE.Vector3();
  function palmPos(out) {
    bonePos('RightHand', out); bonePos('RightHandMiddle1', pa);
    bonePos('RightHandIndex1', pb); bonePos('RightHandPinky1', pc);
    pn.crossVectors(pb.sub(pc), pc.subVectors(pa, out)).normalize();
    return out.lerp(pa, .55).addScaledVector(pn, BALL_R * .9);
  }
  const trackPos = (name, out) => name === 'RightHand' ? palmPos(out) : bonePos(name, out);   // the hand trail follows the palm

  // Work out the ball's flight once (when a control changes).
  // Arc: it leaves the hand at THROW.releaseUp, moving the way the palm is moving there. Its speed is
  // set so it rises the slider's height above the hand, and from then on it's a real projectile.
  // Straight: it leaves at THROW.release and goes in a straight line to a point on the floor.
  function planFlight() {
    const arc = main.dataset.path !== 'straight';
    const t0 = loopTime(arc ? THROW.releaseUp : THROW.release);
    place(t0); const p0 = palmPos(new THREE.Vector3());
    // The hand's speed and direction as it lets go
    place(t0 - .01); const before = palmPos(new THREE.Vector3());
    place(t0 + .01); const after = palmPos(new THREE.Vector3());
    const vel = after.sub(before).multiplyScalar(50);
    // He throws along the way he faces (straight across the screen), never towards the camera
    const flat = new THREE.Vector3(0, 0, 1).applyQuaternion(rig.model.quaternion).setY(0).normalize();
    if (!arc) {
      // Straight: at the speed his hand was moving, in a straight line to the floor ahead
      const end = p0.clone().addScaledVector(flat, DISTANCE).setY(BALL_R);
      return { arc, t0, p0, end, T: p0.distanceTo(end) / Math.max(6, vel.length()) };
    }
    const up = Math.max(15 * Math.PI / 180, Math.atan2(vel.y, vel.dot(flat)));   // the hand's upward angle
    // It leaves at the speed his palm is moving (so a gentle throw goes a short way and a hard one a
    // long way), at the hand's upward angle. Scaled by BALL_SPEED so the hardest throw still lands on
    // the stage; the same scale at every power, so they stay in proportion.
    const v0 = vel.length() * BALL_SPEED;
    const vy = v0 * Math.sin(up), vh = v0 * Math.cos(up);
    const T = (vy + Math.sqrt(vy * vy + 2 * G * (p0.y - BALL_R))) / G;   // until it reaches the floor
    return { arc, t0, p0, flat, vy, vh, T };
  }

  // Where the ball is at loop time s (null while it's still in his hand)
  function ballAt(s, out) {
    const fl = flight;
    if (!fl || s < fl.t0) return null;
    const u = Math.min(s - fl.t0, fl.T);
    if (!fl.arc) return out.lerpVectors(fl.p0, fl.end, u / fl.T);
    return out.copy(fl.p0).addScaledVector(fl.flat, fl.vh * u).setY(fl.p0.y + fl.vy * u - G * u * u / 2);
  }

  // Sample the chosen bone every frame of the loop (and the ball's flight), for the trail and the path
  function sample() {
    if (!rig) return;
    const a = action(), n = a.frames, name = BONES[main.dataset.bone] || BONES.hand;
    samples = [];
    for (let f = 0; f < n; f++) { place(f / FPS); samples.push(trackPos(name, new THREE.Vector3())); }
    ballSamples = [];
    flight = a.clip === 'Throw' ? planFlight() : null;
    if (flight) for (let f = Math.ceil(flight.t0 * FPS); f <= (flight.t0 + flight.T) * FPS + 1; f++) ballSamples.push(ballAt(f / FPS, new THREE.Vector3()));
    fill(pathGeo, samples); fill(ballPathGeo, ballSamples);
    view.onTiming();
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
    else {                                               // his standing pose, before the throw: the reference for a gentler throw
      rig.model.position.set(a.start, 0, 0);
      rig.setTime(0); standing = capturePose(rig); restFeet = feetHeight(rig);
    }
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
      if (!at) palmPos(ball.position);                         // still in his palm
    }
  });

  const view = {
    clock, show: () => stage.start(), hide: () => stage.stop(),
    get frames() { return action().frames; },
    // Throw: wind-up, release, landing (they move with Straight / Arc and the height). Walk: each step.
    get keys() {
      const times = flight ? [THROW.windUp, flight.t0, flight.t0 + flight.T] : action().keys;
      return times.map(t => Math.round(t * FPS));
    },
    onTiming() {}                                   // the page sets this, to update the timeline
  };
  return view;
}
