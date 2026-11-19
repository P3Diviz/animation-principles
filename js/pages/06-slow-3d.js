// 06 Slow in and slow out, 3D view: a small blocky racing car pulls away and stops on the same
// Graph Editor curve as the 2D ball (30-frame move, 15-frame hold), with one spacing mark on the
// floor per frame, across the stage as wide as the 2D track. Its wheels roll with the distance
// travelled. The body sits on springy suspension: the nose lifts as it pulls away and dips as it
// brakes, then bounces back past level and settles (follow through, Paul's request). With Linear
// the speed jumps at each key, so the car jolts there.
import * as THREE from 'three';
import { studio } from '../three/studio.js';
import { std } from '../three/stage.js';
import { clock3d, clockSeconds } from '../three/view.js';
import { evaluate } from '../core/bezier.js';

const FPS = 25, FRAMES = 45, MOVE = 30;     // the same timing as the 2D view
const LENGTH = 5.8, START = -LENGTH / 2;    // how far the car's centre goes (metres), centred on the stage
const MARK_Z = .55;                         // the spacing marks run just in front of the car
const CAR = .72;                            // the car is modelled in its own units, then scaled to 1.5 m long

// Suspension: a damped spring on the body's pitch, pushed by the acceleration.
// It bounces about 2.2 times a second and settles in about a second (damping ratio 0.3).
const SPRING = (2 * Math.PI * 2.2) ** 2, DAMP = 2 * .3 * Math.sqrt(SPRING);
const LEAN = .15, MAX_LEAN = 6;             // degrees per m/s² at rest, and the most it can pitch
const STEPS = 8;                            // spring steps per frame

// Distance along the track at time t (seconds into the loop), for curve P.
// Before the move it waits at the start; after it, it holds where the curve ends.
function along(P, t) {
  const u = t * FPS / MOVE;
  if (u <= 0) return 0;
  return evaluate(P, Math.min(1, u)) * LENGTH;
}

// The body's pitch through the whole loop, worked out once per curve so scrubbing is exact:
// the spring is run for two loops (the second starts settled from the first) and the second kept.
export function pitchTable(P) {
  const n = FRAMES * STEPS, dt = 1 / (FPS * STEPS), w = 1 / FPS;
  const accel = t => (along(P, t + w) - 2 * along(P, t) + along(P, t - w)) / (w * w);
  let angle = 0, speed = 0;
  const table = new Float32Array(n + 1);
  for (let loop = 0; loop < 2; loop++) {
    for (let i = 0; i <= n; i++) {
      if (loop) table[i] = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, angle));
      if (i === n) break;
      const target = LEAN * accel(i * dt);              // where the spring would sit at this acceleration
      speed += (SPRING * (target - angle) - DAMP * speed) * dt;
      angle += speed * dt;
    }
  }
  return table;
}

// The car at time t: distance travelled (m) and body pitch (degrees, positive lifts the nose)
export function carPose(P, t, table = pitchTable(P)) {
  const i = Math.min(table.length - 1, Math.max(0, t * FPS * STEPS));
  const i0 = Math.floor(i), k = i - i0;
  const lean = table[i0] + (table[Math.min(table.length - 1, i0 + 1)] - table[i0]) * k;
  return { x: along(P, t), lean };
}

// A small blocky racing car, facing +x: nose cone and front wing, a low tub with sidepods,
// the driver's helmet, an engine cover with an air intake, and a rear wing. Big rear wheels,
// smaller front ones, each with a pale hub bar so you can see it turn.
export function buildCar(stage) {
  const car = new THREE.Group();
  car.scale.setScalar(CAR);
  // The body pitches on the suspension. It dives about the front axle when braking and squats about
  // the rear axle when pulling away, as a real car does, so the long low front wing never swings
  // into the floor (measured on every frame of every preset and the extreme handles: the lowest point
  // stays 8 mm above the floor, at the full 6° dive). `pivot` holds the
  // turning point; `body` is offset back by the same amount, so moving the pivot moves nothing.
  const pivot = new THREE.Group(); pivot.position.y = .2; car.add(pivot);
  const body = new THREE.Group(); pivot.add(body);
  const clay = std('#C9C9D3', .45), wing = std('#6E6E84', .5), dark = std('#2A2A3A', .6), helmet = std('#8E8EA0', .25);
  const box = (w, h, d, mat, x, y, z) => stage.add(new THREE.BoxGeometry(w, h, d), mat, x, y - .2, z, body);

  box(1.15, .17, .32, clay, 0, .22, 0);                      // the tub
  box(.6, .14, .2, clay, -.1, .2, .24); box(.6, .14, .2, clay, -.1, .2, -.24);   // sidepods
  box(1.5, .025, .6, dark, 0, .07, 0);                       // the floor
  box(.55, .17, .2, clay, -.42, .34, 0);                     // engine cover
  box(.14, .12, .12, clay, -.2, .44, 0);                     // air intake over the driver
  // Nose: a square cone, wide at the tub and narrow at the tip
  const noseGroup = new THREE.Group();                       // flattens it top to bottom
  noseGroup.position.set(.86, .17 - .2, 0);
  noseGroup.scale.set(1, .6, 1);
  body.add(noseGroup);
  stage.add(new THREE.CylinderGeometry(.05, .14, .6, 4), clay, 0, 0, 0, noseGroup)
    .rotation.set(Math.PI / 4, 0, -Math.PI / 2);             // point it forward (+x), square side up
  // Front wing with end plates
  box(.22, .025, .92, wing, 1.12, .1, 0);
  box(.22, .09, .02, wing, 1.12, .12, .46); box(.22, .09, .02, wing, 1.12, .12, -.46);
  // Rear wing on a pillar, with end plates
  box(.24, .035, .86, wing, -.9, .56, 0);
  box(.04, .24, .05, wing, -.82, .42, 0);
  box(.3, .24, .02, wing, -.9, .5, .43); box(.3, .24, .02, wing, -.9, .5, -.43);
  // The driver's helmet in the cockpit
  stage.add(new THREE.SphereGeometry(.085, 24, 16), helmet, -.02, .36 - .2, 0, body);
  box(.12, .05, .2, dark, .1, .32, 0);                       // cockpit rim in front of the helmet

  const tyre = std('#30303F', .85), hub = std('#A0A0B4', .5);
  const wheels = [];
  for (const [x, r, w, z] of [[-.55, .2, .2, .4], [.62, .16, .15, .37]]) for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(x, r, s * z);
    stage.add(new THREE.CylinderGeometry(r, r, w, 32), tyre, 0, 0, 0, g).rotation.x = Math.PI / 2;
    stage.add(new THREE.BoxGeometry(r * 1.3, .035, w + .01), hub, 0, 0, 0, g);
    g.userData.r = r * CAR;                                  // its real radius, for rolling
    car.add(g); wheels.push(g);
  }
  stage.scene.add(car);
  // Pitch the body: positive lifts the nose (turning about the rear axle), negative dives (front axle)
  const FRONT = .62, REAR = -.55;
  function pitch(degrees) {
    const x = degrees < 0 ? FRONT : REAR;
    pivot.position.x = x; body.position.x = -x;
    pivot.rotation.z = degrees * Math.PI / 180;
  }
  return { car, pitch, wheels };
}

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [0, 1.75, 5.7], look: [0, .25, 0] });
  status.textContent = '';
  // A longer lens than the other pages, so the car stays side-on across the stage like the 2D ball.
  // The camera backs off just enough, for the stage's shape, to keep the whole car in frame at both keys.
  const cam = stage.camera, LOOK = new THREE.Vector3(0, .25, 0), AWAY = new THREE.Vector3(0, 1.5, 5.7).normalize();
  const HALF = LENGTH / 2 + 1.35;                             // the track's half length, the car's nose and a margin
  cam.fov = 24;
  function frame() {
    const fit = HALF / (Math.tan(cam.fov / 2 * Math.PI / 180) * cam.aspect);
    const d = Math.max(6, fit);
    cam.position.copy(LOOK).addScaledVector(AWAY, d);
    cam.lookAt(LOOK);
    // The fog keeps its tuned look (it starts 3 m behind the subject and fades the floor out by
    // 15 m beyond), measured from this camera's distance
    stage.scene.fog.near = d + 3; stage.scene.fog.far = d + 18;
  }
  const { car, pitch, wheels } = buildCar(stage);
  const clock = clock3d(canvas, FRAMES);
  let P = [.33, 0, .67, 1], table = pitchTable(P);

  // 31 spacing marks: where the car's centre is on each frame of the move
  const markMat = new THREE.MeshBasicMaterial({ color: '#9999FF', transparent: true, opacity: .75 });
  const markGeo = new THREE.BoxGeometry(.03, .004, .12);
  const marks = Array.from({ length: MOVE + 1 }, () => {
    const m = new THREE.Mesh(markGeo, markMat);
    m.position.set(0, .002, MARK_Z);
    stage.scene.add(m);
    return m;
  });
  const placeMarks = () => marks.forEach((m, f) => { m.position.x = START + along(P, f / FPS); });
  placeMarks();

  stage.onFrame(() => {
    frame();                                                 // cheap, and follows any resize
    const { x, lean } = carPose(P, clockSeconds(clock), table);
    car.position.x = START + x;
    wheels.forEach(wh => { wh.rotation.z = -x / wh.userData.r; });   // rolling: turn by distance / radius
    pitch(lean);
  });

  return {
    clock, frames: FRAMES,
    setCurve(p) { P = p.slice(); table = pitchTable(P); placeMarks(); },
    show: () => stage.start(),
    hide: () => stage.stop()
  };
}
