// 08 Secondary action: Off / Subtle / Too much is a plain toggle (data-sec on the stage).
import '../core/toggles.js';
import { bindTimeline } from '../core/timeline.js';

const $ = id => document.getElementById(id);
const stage = $('stage');

// One walk cycle: 25 frames, two steps. Keys at each contact and passing position.
bindTimeline({
  track: $('track'), head: $('head'), tc: $('tc'), play: $('play'),
  getAnims: () => stage.getAnimations({ subtree: true }), frames: 25
});
