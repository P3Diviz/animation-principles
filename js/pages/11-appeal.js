// 11 Appeal: build a character from simple parts, or compare two versions.
import '../core/toggles.js';
import '../core/sliders.js';

const $ = id => document.getElementById(id);
const choices = [...$('ask').querySelectorAll('[data-pick]')];

// There's no wrong answer, but most people pick the right one. The reveal explains why.
const WHY = 'The right one has a clear round shape, a bigger head and eyes, and a strong line of action through the pose. The left is stiff and symmetrical, with tiny features that are hard to read.';

choices.forEach(c => c.addEventListener('click', () => {
  choices.forEach(x => x.dataset.result = x.dataset.pick === 'right' ? 'right' : 'wrong');
  $('answer').textContent = (c.dataset.pick === 'right' ? 'Most people agree. ' : 'Interesting: most people pick the right. ') + WHY;
}));
