// 08 Secondary action. The main action: Draig waddles across the stage, two steps every 25 frames.
// Secondary action on top: a tail swish, a glance, a puff of smoke. Off / Subtle / Too much.
// 100 frames (4 s): he walks across on frames 0-90, then comes back in from the left.
import '../core/toggles.js';
import { rotatePart, scalePart, posePart, movePart, mouth, placeDraig, groundShadow, rigClock, runRig, toScene, span, lerp } from '../core/draig.js';
import { bindTimeline } from '../core/timeline.js';

const $ = id => document.getElementById(id);
const stage = $('stage'), svg = $('svg'), pos = $('draigPos');
const FRAMES = 100, LOOP = FRAMES * 40, S = .38, FLOOR = 340;
const puffs = [...$('smoke').children];
const clock = rigClock($('clock'), LOOP);

bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => [clock], frames: FRAMES
});

// When the puffs of smoke start (frames), for each level
const SMOKE = { off: [], subtle: [60], much: [4, 18, 32, 46, 60, 74] };

function pose(ms) {
  const f = ms / 40, level = stage.dataset.sec, much = level === 'much', on = level !== 'off';
  const step = f / 12.5 * Math.PI;                       // one step every 12.5 frames

  // ----- Main action: the walk -----
  const x = lerp(140, 660, span(f, 0, 90));
  const lift = 6 * Math.abs(Math.sin(step));             // up as each foot passes
  const sway = 5 * Math.sin(step);                       // weight from foot to foot
  const opacity = f < 90 ? 1 : f < 94 ? 1 - span(f, 90, 94) : span(f, 96, 100);
  $('rig').setAttribute('transform', `rotate(${sway} 200 380)`);
  rotatePart('arm-left', 12 * Math.sin(step)); rotatePart('arm-right', 12 * Math.sin(step));
  placeDraig(pos, f < 94 ? x : 140, FLOOR - lift, S);
  groundShadow('shadow', lift, S);
  pos.setAttribute('opacity', opacity);

  // ----- Secondary action -----
  // Tail swish: lags a little behind the sway. Too much: big and fast.
  rotatePart('tail', !on ? 0 : much ? 45 * Math.sin(step * 1.5) : 10 * Math.sin(step / 2 - .6));
  // Glance: once, mid-walk, he looks to the side and back. Too much: his eyes and head never settle.
  let look = 0, lookY = 0;
  if (level === 'subtle') { const g = span(f, 30, 36) - span(f, 44, 50); look = -7 * g; lookY = -2 * g; }
  if (much) { look = 8 * Math.sin(f * .9); lookY = 3 * Math.sin(f * .55); }
  movePart('pupil-left', look, lookY); movePart('pupil-right', look, lookY);
  posePart('face', much ? { dy: 8 * Math.sin(f * .7), r: 10 * Math.sin(f * .45) } : {});
  // Too much also flaps the wings and bounces the crest
  rotatePart('wing-left', much ? -30 * Math.abs(Math.sin(f * .6)) : 0); rotatePart('wing-right', much ? 30 * Math.abs(Math.sin(f * .6)) : 0);
  scalePart('crest', 1, much ? 1 + .3 * Math.abs(Math.sin(f * .8)) : 1);
  mouth(much && Math.sin(f * .45) > .3);

  // Smoke: each puff is two circles that rise, grow and fade over 18 frames
  const nose = toScene(svg, $('muzzle'), 200, 230), size = much ? 1.8 : 1;
  puffs.forEach((c, i) => {
    const start = SMOKE[level][i >> 1], a = start === undefined ? -1 : (f - start - (i & 1) * 3) / 18;
    if (a < 0 || a > 1) { c.setAttribute('opacity', 0); return; }
    // Out to the side and up, clear of his eyes
    c.setAttribute('cx', nose.x + (i & 1 ? 10 : 2) * size + 85 * a * size);
    c.setAttribute('cy', nose.y + 4 - 45 * a * size);
    c.setAttribute('r', (6 + 14 * a) * size);
    c.setAttribute('opacity', (1 - a * a) * .75);
  });
}
const redraw = runRig(clock, LOOP, pose);
stage.addEventListener('statechange', redraw);
