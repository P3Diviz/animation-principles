// 11 Appeal: change Draig's shape language, proportions and pose, or compare two versions.
import '../core/toggles.js';
import { showSlider } from '../core/sliders.js';
import { rotatePart, posePart, scalePart } from '../core/draig.js';

const $ = id => document.getElementById(id);

// Body shapes, from the comment at the top of assets/svg/characters/draig.svg.
// The same d goes on #body-shape and #body-clip-shape (the clip keeps the belly inside the body).
const SHAPES = {
  round:   'M200 96 C 292 96 332 172 332 252 C 332 334 282 380 200 380 C 118 380 68 334 68 252 C 68 172 108 96 200 96Z',
  square:  'M118 104 H282 Q 330 104 332 152 V 336 Q 332 380 288 380 H112 Q 68 380 68 336 V152 Q 70 104 118 104Z',
  pointed: 'M200 92 C 250 120 300 170 322 236 C 344 302 330 380 200 380 C 70 380 56 302 78 236 C 100 170 150 120 200 92Z',
};

// Pose one Draig (sfx is '' for the main copy, '-b' and '-c' for the compare copies)
function apply(sfx, { shape, head, eye, pose }) {
  $('body-shape' + sfx).setAttribute('d', SHAPES[shape]);
  $('body-clip-shape' + sfx).setAttribute('d', SHAPES[shape]);
  const strong = pose === 'strong';
  // Stiff: upright, arms straight down. Line of action: leaning into one curve, arm up, tail swept.
  $('rig' + sfx).setAttribute('transform', strong ? 'rotate(8 200 380)' : '');
  rotatePart('arm-left' + sfx, strong ? 75 : -22);
  rotatePart('arm-right' + sfx, strong ? 8 : 22);
  rotatePart('tail' + sfx, strong ? -28 : 0);
  rotatePart('wing-left' + sfx, strong ? -14 : 0); rotatePart('wing-right' + sfx, strong ? 6 : 0);
  // Head size scales the whole face; eye size scales both eyes
  posePart('face' + sfx, { r: strong ? -9 : 0, sx: head, sy: head });
  scalePart('eye-left' + sfx, eye); scalePart('eye-right' + sfx, eye);
}

// ----- Build -----
const build = $('build'), headSize = $('headSize'), eyeSize = $('eyeSize');
function update() {
  apply('', { shape: build.dataset.shape, pose: build.dataset.pose, head: headSize.value / 100, eye: eyeSize.value / 100 });
}
build.addEventListener('statechange', update);
[headSize, eyeSize].forEach(s => s.addEventListener('input', () => { showSlider(s); update(); }));
update();

// ----- Compare: the same dragon, put together two ways -----
apply('-b', { shape: 'square', pose: 'stiff', head: .82, eye: .55 });
apply('-c', { shape: 'round', pose: 'strong', head: 1.15, eye: 1.2 });

const choices = [...$('ask').querySelectorAll('[data-pick]')];
// There's no wrong answer, but most people pick the right one. The reveal explains why.
const WHY = 'The right one has a round, friendly shape, a bigger face and eyes, and a strong line of action through the pose. The left is boxy, stiff and symmetrical, with small eyes that are hard to read.';
choices.forEach(c => c.addEventListener('click', () => {
  choices.forEach(x => x.dataset.result = x.dataset.pick === 'right' ? 'right' : 'wrong');
  $('answer').textContent = (c.dataset.pick === 'right' ? 'Most people agree. ' : 'Interesting: most people pick the right. ') + WHY;
}));
