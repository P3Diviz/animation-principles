// 06 Slow in and slow out, 3D view: a simple clay car pulls away and stops on the same
// Graph Editor curve as the 2D ball (30-frame move, 15-frame hold), with one spacing mark
// on the floor per frame. Its wheels roll with the distance travelled, and the body pitches
// a little with the acceleration: the nose lifts as it pulls away and dips as it brakes.
// With Linear the speed jumps at each key, so the car jolts there.
import * as THREE from 'three';
import { studio } from '../three/studio.js';
import { std } from '../three/stage.js';
import { clock3d, clockSeconds } from '../three/view.js';
import { evaluate } from '../core/bezier.js';

const FPS = 25, FRAMES = 45, MOVE = 30;     // the same timing as the 2D view
const START = -2.2, LENGTH = 4.4;           // where the car's centre starts, and how far it goes (metres);
                                            // room either side for curves that overshoot or pull back first
const WHEEL = .16;                          // wheel radius
const LEAN = .2, MAX_LEAN = 4;              // body pitch: degrees per m/s², and its limit
const MARK_Z = .62;                         // the spacing marks run just in front of the car

// Distance along the track at time t (seconds into the loop), for curve P.
// Before the move it waits at the start; after it, it holds where the curve ends.
function along(P, t) {
  const u = t * FPS / MOVE;
  if (u <= 0) return 0;
  if (u >= 1) return evaluate(P, 1) * LENGTH;
  return evaluate(P, u) * LENGTH;
}

// The car at time t: distance travelled (m) and body pitch (degrees). The acceleration is read
// over ±2 frames, so a sudden change of speed (Linear) shows as a short jolt, not a single-frame flick.
export function carPose(P, t) {
  const w = 2 / FPS, x = along(P, t);
  const a = (along(P, t + w) - 2 * x + along(P, t - w)) / (w * w);
  return { x, lean: Math.max(-MAX_LEAN, Math.min(MAX_LEAN, a * LEAN)) };
}

// The car: a body and cabin that pitch together about the axles, and four wheels.
// Each wheel has a pale hub bar so you can see it turn.
function buildCar(stage) {
  const car = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = WHEEL;                                   // pitch about axle height
  const clay = std('#C9C9D3', .5);
  stage.add(new THREE.BoxGeometry(1.2, .3, .62), clay, 0, .17, 0, body);
  stage.add(new THREE.BoxGeometry(.62, .26, .52), clay, -.08, .45, 0, body);
  car.add(body);

  const tyre = std('#3A3A4C', .8), hub = std('#8E8EA0', .5);
  const wheels = [];
  for (const x of [-.4, .4]) for (const z of [-.31, .31]) {
    const w = new THREE.Group();
    w.position.set(x, WHEEL, z);
    stage.add(new THREE.CylinderGeometry(WHEEL, WHEEL, .1, 32), tyre, 0, 0, 0, w).rotation.x = Math.PI / 2;
    stage.add(new THREE.BoxGeometry(.22, .04, .11), hub, 0, 0, 0, w);
    car.add(w); wheels.push(w);
  }
  stage.scene.add(car);
  return { car, body, wheels };
}

export function create({ stageEl, canvas, status }) {
  const { stage } = studio(stageEl, canvas, { pos: [0, 1.7, 5.3], look: [0, .3, 0] });
  status.textContent = '';
  const { car, body, wheels } = buildCar(stage);
  const clock = clock3d(canvas, FRAMES);
  let P = [.33, 0, .67, 1];

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
    const { x, lean } = carPose(P, clockSeconds(clock));
    car.position.x = START + x;
    wheels.forEach(wh => { wh.rotation.z = -x / WHEEL; });   // rolling: turn by distance / radius
    body.rotation.z = lean * Math.PI / 180;                  // positive lifts the nose (it faces +x)
  });

  return {
    clock, frames: FRAMES,
    setCurve(p) { P = p.slice(); placeMarks(); },
    show: () => stage.start(),
    hide: () => stage.stop()
  };
}
