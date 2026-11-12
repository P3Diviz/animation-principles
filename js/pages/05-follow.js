// 05 Follow through: keyframed demo plus a Drag it mode driven by simple spring physics.
import '../core/toggles.js';
import '../core/sliders.js';
import { bindTimeline } from '../core/timeline.js';

const $ = id => document.getElementById(id);
const main = $('main'), stage = $('stage'), svg = $('svg'), mover = $('mover');

bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => stage.getAnimations({ subtree: true }), frames: 50
});

// ----- Drag it -----
// Each loose part is a damped spring. The antenna is pushed the opposite way to the body's
// acceleration (it lags behind). Each scarf segment is pulled towards the bend of the one
// before it, so a swing travels down the scarf a moment later: overlapping action.
const parts = [
  { el: $('ant'), rest: 0, drive: -1 },
  { el: $('s1'), rest: -30, drive: .45 },
  { el: $('s2'), rest: -6, follows: 1 },
  { el: $('s3'), rest: -5, follows: 2 },
  { el: $('s4'), rest: -4, follows: 3 },
  { el: $('s5'), rest: -3, follows: 4 },
].map(p => ({ ...p, angle: 0, spin: 0 }));

let x = 160, target = 160, vel = 0, last = 0, running = false;

function step(now) {
  if (!running) return;
  const dt = Math.min(.05, (now - (last || now)) / 1000) || .016; last = now;
  // The body follows the pointer smoothly
  const newX = x + (target - x) * Math.min(1, dt * 14);
  const newVel = (newX - x) / dt, acc = (newVel - vel) / dt;
  x = newX; vel = newVel;
  mover.style.transform = `translate(${x}px, 330px)`;

  const stiff = +$('stiff').value / 100;                 // 0 loose .. 1 stiff
  const loose = main.dataset.follow === 'on';
  const k = 40 + stiff * 420, c = 2 * Math.sqrt(k) * .14; // spring and damping
  parts.forEach(p => {
    if (!loose) { p.angle = 0; p.spin = 0; }
    else {
      const goal = p.follows ? parts[p.follows].angle * .6 : 0;
      const push = p.drive ? p.drive * acc * .9 : 0;
      const damp = p.follows ? c * 3 : c;                  // scarf segments settle a little faster
      p.spin += (-k * (p.angle - goal) - damp * p.spin + push) * dt;
      p.angle = Math.max(-80, Math.min(80, p.angle + p.spin * dt));
    }
    p.el.style.transform = `rotate(${p.rest + p.angle}deg)`;
  });
  requestAnimationFrame(step);
}

function toSvgX(e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse()).x;
}
const clampX = v => Math.max(90, Math.min(710, v));

svg.addEventListener('pointerdown', e => {
  if (main.dataset.mode !== 'drag') return;
  svg.setPointerCapture(e.pointerId); target = clampX(toSvgX(e));
});
svg.addEventListener('pointermove', e => {
  if (main.dataset.mode === 'drag' && svg.hasPointerCapture(e.pointerId)) target = clampX(toSvgX(e));
});
document.addEventListener('keydown', e => {
  if (main.dataset.mode !== 'drag' || e.target.closest?.('input')) return;
  if (e.key === 'ArrowLeft') { target = clampX(target - 80); e.preventDefault(); }
  if (e.key === 'ArrowRight') { target = clampX(target + 80); e.preventDefault(); }
});

main.addEventListener('statechange', e => {
  if (e.detail.attr !== 'mode') return;
  if (e.detail.value === 'drag') {
    x = target = 160; vel = 0; last = 0; running = true;
    requestAnimationFrame(step);
  } else {
    running = false;
    // Hand back to the keyframes
    mover.style.transform = '';
    parts.forEach(p => { p.el.style.transform = ''; p.angle = p.spin = 0; });
  }
});
