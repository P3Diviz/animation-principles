// 02 Anticipation: jump and throw, wind-up slider, Predict it.
import '../core/toggles.js';
import '../core/sliders.js';
import { bindTimeline } from '../core/timeline.js';

const $ = id => document.getElementById(id);
const stage = $('stage'), answer = $('predictAnswer');

const tl = bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => stage.getAnimations({ subtree: true }), frames: 50
});

// Key frames for each action, and the frame where the wind-up is biggest
const ACTIONS = {
  jump:  { keys: [8, 18, 20, 26, 32], windUp: 18 },
  throw: { keys: [8, 20, 24, 30, 40], windUp: 20 },
};

function hideQuestions() {
  document.querySelectorAll('.ask').forEach(a => a.hidden = true);
  answer.textContent = '';
}

stage.addEventListener('statechange', e => {
  if (e.detail.attr === 'action') {
    const a = ACTIONS[e.detail.value];
    tl.setKeys(a.keys);
    // Highlight the wind-up on the timeline: from frame 8 to the biggest wind-up pose
    $('span').style.width = ((a.windUp - 8) / 50 * 100) + '%';
  }
  hideQuestions();
});

// Predict it: freeze on the wind-up pose, ask, then play on
$('predictBtn').addEventListener('click', () => {
  const action = ACTIONS[stage.dataset.action];
  tl.setFrame(action.windUp);
  hideQuestions();
  const ask = $('ask-' + stage.dataset.action);
  ask.querySelectorAll('button').forEach(b => b.removeAttribute('data-result'));
  ask.hidden = false;
  ask.querySelector('button').focus();
});

document.querySelectorAll('.ask .choices button').forEach(b => b.addEventListener('click', () => {
  const ask = b.closest('.ask');
  ask.querySelectorAll('button').forEach(x => x.dataset.result = 'right' in x.dataset ? 'right' : 'wrong');
  const noWindUp = stage.dataset.anticipation === 'off' || +$('wind').value === 0;
  if (noWindUp) answer.textContent = 'With no wind-up there was nothing to read. That is what anticipation gives the audience.';
  else if ('right' in b.dataset) answer.textContent = 'Yes. The wind-up told you, before the move started.';
  else answer.textContent = 'Watch the wind-up: it pulls the opposite way to the move that follows.';
  setTimeout(() => tl.play(), 500);
}));
