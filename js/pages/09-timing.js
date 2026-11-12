// 09 Timing: the same drop with different frame counts.
// The motion is worked out frame by frame from simple physics, then played with the
// Web Animations API so the shared timeline can scrub it.
import '../core/toggles.js';
import { showSlider, setSlider } from '../core/sliders.js';
import { bindTimeline, reducedMotion } from '../core/timeline.js';

import { PRESETS, dropCurve } from '../core/drop.js';
import { bindView, handOver } from '../three/view.js';

const FPS = 25, MS = 1000 / FPS;
const $ = id => document.getElementById(id);
const main = $('main'), stage = $('stage'), framesInput = $('frames');
const ghosts = [...$('ghosts').children];
const weights = [...$('weights').querySelectorAll('button')];
let current = { ...PRESETS.football };
let view3d = null;   // the 3D view while it's showing (09-timing-3d.js)

// One keyframe per frame. On twos, each drawing is held for two frames.
function keyframesFor(curve, total, twos) {
  const list = [];
  for (let f = 0; f < total; f++) {
    const drawn = twos ? f - (f % 2) : f;
    list.push({ top: (curve.at(drawn) * 100) + '%', offset: f / total, easing: twos ? 'steps(1, end)' : 'linear' });
  }
  list.push({ top: list[total - 1].top, offset: 1 });
  return list;
}

let tl = null;
const anims = new Map();   // ball element -> Animation

// Rebuild the animations, keeping their place and play state
let carry = null;   // time and play state handed over when the mode changes
function play(ball, curve, total, twos) {
  const old = anims.get(ball) || [...anims.values()][0];
  const from = old ? { t: old.currentTime, running: old.playState === 'running' } : carry || { t: 0, running: !reducedMotion };
  const t = from.t % (total * MS), running = from.running;
  anims.get(ball)?.cancel();
  const a = ball.animate(keyframesFor(curve, total, twos), { duration: total * MS, iterations: Infinity });
  a.currentTime = t; if (!running) a.pause();
  anims.set(ball, a);
}

// Stop the balls that aren't on screen, so the timeline only follows the visible ones
function stop(...balls) {
  balls.forEach(b => { anims.get(b)?.cancel(); anims.delete(b); });
}

function build() {
  if (view3d) return view3d.build();   // the 3D view rebuilds its own drop and walk
  const gravity = main.dataset.motion === 'gravity', twos = main.dataset.rate === 'twos';
  let keys, total, fallFrames;
  const guess = main.dataset.mode === 'guess';
  // Carry the play state over from whichever animation is running now
  const before = [...anims.values()][0];
  const keep = before ? { t: before.currentTime, running: before.playState === 'running' } : null;
  stop(...(guess ? [$('ballMain')] : [$('ballL'), $('ballR')]));
  if (keep && !anims.size) carry = keep;
  if (guess) {
    const a = dropCurve(pair.L, gravity), b = dropCurve(pair.R, gravity);
    total = Math.max(a.length, b.length);
    play($('ballL'), a, total, twos); play($('ballR'), b, total, twos);
    keys = [0]; fallFrames = Math.max(pair.L.frames, pair.R.frames);
  } else {
    const c = dropCurve(current, gravity);
    total = c.length; keys = c.keys.slice(0, 4); fallFrames = current.frames;
    play($('ballMain'), c, total, twos);
    // Spacing ghosts: where the ball is drawn on each frame of the fall
    ghosts.forEach((g, f) => {
      const show = f <= current.frames && (!twos || f % 2 === 0);
      g.hidden = !show;
      if (show) g.style.top = (c.at(f) * 100) + '%';
    });
    // Under the ball: what it is, and how long it takes to fall
    const name = current.name ? current.name + ': ' : '';
    $('fallLabel').textContent = `${name}${current.frames} frames to fall, ${(current.frames / FPS).toFixed(2)} s`;
  }
  tl.setFrames(total);
  tl.setKeys(keys);
  $('span').style.width = (fallFrames / total * 100) + '%';
}

// ----- Weight presets and the frames slider -----
weights.forEach(b => b.addEventListener('click', () => {
  weights.forEach(x => x.setAttribute('aria-pressed', x === b));
  current = { ...PRESETS[b.dataset.w] };
  setSlider(framesInput, current.frames);
}));
framesInput.addEventListener('input', e => {
  showSlider(framesInput);
  if (e.isTrusted) {   // dragged by hand: keep the bounce, drop the preset name
    weights.forEach(x => x.setAttribute('aria-pressed', 'false'));
    current = { ...current, name: '', frames: +framesInput.value };
  }
  build();
});

// ----- Guess the weight: the bowling ball against a lighter ball, sides shuffled -----
let pair = null, heavySide = 'L';
const choices = [...$('guess').querySelectorAll('[data-pick]')];
function newPair() {
  const light = Math.random() < .5 ? PRESETS.football : PRESETS.balloon;
  heavySide = Math.random() < .5 ? 'L' : 'R';
  pair = heavySide === 'L' ? { L: PRESETS.bowling, R: light } : { L: light, R: PRESETS.bowling };
  choices.forEach(c => c.removeAttribute('data-result'));
  $('guessAnswer').textContent = '';
  if (main.dataset.mode === 'guess') build();
}
choices.forEach(c => c.addEventListener('click', () => {
  const right = c.dataset.pick === heavySide;
  choices.forEach(x => x.dataset.result = x.dataset.pick === heavySide ? 'right' : 'wrong');
  const heavy = pair[heavySide], light = pair[heavySide === 'L' ? 'R' : 'L'];
  const side = heavySide === 'L' ? 'Left' : 'Right';
  $('guessAnswer').textContent = `${right ? 'Yes.' : 'Not quite.'} ${side} is the bowling ball: it lands in ${heavy.frames} frames and barely bounces. The ${light.name.toLowerCase()} takes ${light.frames} frames and bounces back up.`;
}));
$('nextPair').addEventListener('click', newPair);

// Mode, motion and frame rate toggles all rebuild the drop
main.addEventListener('statechange', build);

newPair();
tl = bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => view3d ? [view3d.clock] : [...anims.values()], frames: 30
});
build();

// 2D / 3D: the timeline follows the clock of the view on screen
bindView(() => import('./09-timing-3d.js'), {
  onSwitch(is3d, v) {
    view3d = is3d ? v : null;
    if (is3d) {
      handOver([...anims.values()], [v.clock]);
      v.timeline = (frames, keys, span) => { tl.setFrames(frames); tl.setKeys(keys); $('span').style.width = span + '%'; };
      v.build();
    } else {
      if (v) handOver([v.clock], [...anims.values()]);
      build();
    }
  }
});
