// 12 Solid drawing: every shape is placed from one table of joints, so the stick figure,
// construction shapes, volume and shading always line up. Twinning swaps in a mirror-perfect pose.
import '../core/toggles.js';
import { showSlider } from '../core/sliders.js';

const $ = id => document.getElementById(id);
const stage = $('stage'), turn = $('turn');

// Natural pose: weight on the right leg, so the hips tilt one way and the shoulders the other
const NATURAL = {
  head: [404, 100], neck: [401, 138], chest: [400, 182], pelvis: [398, 250],
  shL: [362, 158], shR: [438, 166], elL: [345, 214], elR: [470, 208], haL: [343, 266], haR: [434, 244],
  hipL: [381, 258], hipR: [417, 250], knL: [370, 312], knR: [426, 306], ftL: [352, 360], ftR: [432, 360],
};
// Twinning: both sides identical, as if folded down the middle
const TWIN = {
  head: [400, 100], neck: [400, 138], chest: [400, 182], pelvis: [400, 252],
  shL: [362, 162], shR: [438, 162], elL: [348, 216], elR: [452, 216], haL: [346, 268], haR: [454, 268],
  hipL: [383, 254], hipR: [417, 254], knL: [380, 310], knR: [420, 310], ftL: [378, 360], ftR: [422, 360],
};

const svg = stage.querySelector('svg');
const angle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;

// A centre line on a round form turned by t degrees: half an ellipse from top to bottom.
// Its width is r x sin(t): flat when facing us, fuller as the form turns.
function centreLine(rw, rh, t) {
  const rx = Math.abs(rw * Math.sin(t * Math.PI / 180));
  if (rx < .5) return `M0 ${-rh} L0 ${rh}`;
  return `M0 ${-rh} A${rx.toFixed(1)} ${rh} 0 0 ${t > 0 ? 1 : 0} 0 ${rh}`;
}

function draw() {
  const J = stage.dataset.twin === 'on' ? TWIN : NATURAL;
  const t = +turn.value;

  // Lines between two joints
  svg.querySelectorAll('line[data-a]').forEach(l => {
    const a = J[l.dataset.a], b = J[l.dataset.b];
    l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', b[0]); l.setAttribute('y2', b[1]);
  });
  // Circles sitting on a joint
  svg.querySelectorAll('circle[data-at]').forEach(c => {
    const p = J[c.dataset.at];
    c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]);
  });
  // Groups (head, chest, pelvis): moved to their joint and tilted to match the shoulders or hips
  svg.querySelectorAll('g[data-g]').forEach(g => {
    const p = J[g.dataset.g];
    const tilt = g.dataset.tilt ? angle(...g.dataset.tilt.split(',').map(k => J[k])) : 0;
    g.setAttribute('transform', `translate(${p[0]} ${p[1]}) rotate(${tilt.toFixed(2)})`);
  });
  // Wrap lines halfway along each limb: a short curve across it, bowed along the limb
  svg.querySelectorAll('path.contour').forEach(c => {
    const a = J[c.dataset.a], b = J[c.dataset.b], w = +c.dataset.w;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], n = [-u[1], u[0]];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    c.setAttribute('d', `M${m[0] - n[0] * w} ${m[1] - n[1] * w} Q${m[0] + u[0] * w * .7} ${m[1] + u[1] * w * .7} ${m[0] + n[0] * w} ${m[1] + n[1] * w}`);
  });
  // Turning: the head's centre line follows the turn; the chest turns a little with it
  $('headCentre').setAttribute('d', centreLine(30, 30, t));
  $('headEyes').setAttribute('d', 'M-30 4 A30 8 0 0 0 30 4');
  $('chestCentre').setAttribute('d', centreLine(38, 48, t * .4));
}

turn.addEventListener('input', () => { showSlider(turn); draw(); });
stage.addEventListener('statechange', draw);
draw();
