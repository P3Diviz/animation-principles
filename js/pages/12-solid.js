// 12 Solid drawing: Draig as a stick figure, construction shapes, flat colour and full render.
// The pose (natural or twinning) and the head turn drive Draig and the drawing aids together.
import '../core/toggles.js';
import { showSlider } from '../core/sliders.js';
import { rotatePart, posePart, movePart } from '../core/draig.js';
import { bindView } from '../three/view.js';

const $ = id => document.getElementById(id);
const stage = $('stage'), turn = $('turn');

// Natural pose: weight on one side, one arm up, head tilted. Twinning: everything mirrored.
const NATURAL = { lean: 3, armL: 40, armR: -6, wingL: -12, wingR: 4, tail: -12, tilt: -6 };
const TWIN    = { lean: 0, armL: 0,  armR: 0,  wingL: 0,   wingR: 0, tail: 0,   tilt: 0 };

// Arms hang from their pivots, already turned 22° out in the artwork
const ARMS = { L: { x: 98, y: 262, base: 22 }, R: { x: 302, y: 262, base: -22 } };
// A point `len` along a limb that hangs from (x, y), turned by deg (0 = straight down)
const along = (x, y, deg, len) => { const a = deg * Math.PI / 180; return [x - Math.sin(a) * len, y + Math.cos(a) * len]; };

function line(id, [x1, y1], [x2, y2]) {
  const l = $(id); l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
}

// Half an ellipse from top to bottom of a form turned by t degrees: width r x sin(t)
function centreLine(cx, top, bottom, r, t) {
  const rx = Math.abs(r * Math.sin(t * Math.PI / 180)), ry = (bottom - top) / 2;
  if (rx < .5) return `M${cx} ${top} L${cx} ${bottom}`;
  return `M${cx} ${top} A${rx.toFixed(1)} ${ry} 0 0 ${t > 0 ? 1 : 0} ${cx} ${bottom}`;
}

function draw() {
  const P = stage.dataset.twin === 'on' ? TWIN : NATURAL;
  const t = +turn.value, shift = 40 * Math.sin(t * Math.PI / 180);   // turning slides the face across the body

  // Draig
  $('rig').setAttribute('transform', `rotate(${P.lean} 200 380)`);
  rotatePart('arm-left', P.armL); rotatePart('arm-right', P.armR);
  rotatePart('wing-left', P.wingL); rotatePart('wing-right', P.wingR);
  rotatePart('tail', P.tail);
  posePart('face', { dx: shift, r: P.tilt });
  movePart('pupil-left', shift * .15, 0); movePart('pupil-right', shift * .15, 0);

  // Stick figure, from the same angles
  const hand = side => along(ARMS[side].x, ARMS[side].y, ARMS[side].base + P['arm' + side], 62);
  line('sk-armL', [ARMS.L.x, ARMS.L.y], hand('L'));
  line('sk-armR', [ARMS.R.x, ARMS.R.y], hand('R'));
  line('sk-wingL', [98, 262], along(98, 262, 150 - P.wingL, 150));
  line('sk-wingR', [302, 262], along(302, 262, -150 - P.wingR, 150));
  // The aids lean with Draig, so they stay on him
  ['aid-stick', 'aid-cons'].forEach(id => $(id).setAttribute('transform', `rotate(${P.lean} 200 380)`));

  // Construction: arm capsules follow the arms; the centre line follows the turn
  for (const side of ['L', 'R']) {
    const a = ARMS[side], deg = a.base + P['arm' + side], [cx, cy] = along(a.x, a.y, deg, 34);
    const e = $('c-arm' + side);
    e.setAttribute('cx', cx); e.setAttribute('cy', cy); e.setAttribute('transform', `rotate(${deg} ${cx} ${cy})`);
  }
  $('c-face').setAttribute('transform', `translate(${shift} 0) rotate(${P.tilt} 200 220)`);
  $('c-pupilL').setAttribute('transform', `translate(${shift * .15} 0)`); $('c-pupilR').setAttribute('transform', `translate(${shift * .15} 0)`);
  $('c-wingL').setAttribute('transform', `rotate(${P.wingL} 100 205)`); $('c-wingR').setAttribute('transform', `rotate(${P.wingR} 300 205)`);
  $('c-tail').setAttribute('transform', `rotate(${P.tail} 290 340)`);
  $('c-centre').setAttribute('d', centreLine(200, 96, 380, 132, t));
}

// 2D / 3D: the 3D view (12-solid-3d.js) has no timeline; it orbits instead
bindView(() => import('./12-solid-3d.js'));

turn.addEventListener('input', () => { showSlider(turn); draw(); });
stage.addEventListener('statechange', draw);
draw();
