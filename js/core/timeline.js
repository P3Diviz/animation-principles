// Shared timeline: binds the timeline UI to the animations inside a stage.
// Works with any Web Animation, including CSS @keyframes (via el.getAnimations()).
// 25 fps, timecode 00:00:SS:FF. Click or drag the track to scrub (pauses).
// Space plays/pauses, Page Up / Page Down step one frame, Home / End jump to the ends.
// Keyframe icons are <svg class="key"> elements written in the HTML; their frame
// numbers come from data-keys="0,12,24" on the track.

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// CSS transitions (eased UI moves) are not part of the demo, so the timeline ignores them.
const isTransition = a => typeof CSSTransition !== 'undefined' && a instanceof CSSTransition;

// After Effects keyframe icon halves. side: 'l' (incoming) or 'r' (outgoing).
// 'linear' = half diamond, 'eased' = half hourglass, 'hold' = half square.
export function halfIcon(side, shape) {
  const h = side === 'l' ? -1 : 1;
  if (shape === 'eased') return `M7 1 L${7+h*6} 1 L${7+h*1.5} 7 L${7+h*6} 13 L7 13Z`;
  if (shape === 'hold') return `M7 1 L${7+h*5} 1 L${7+h*5} 13 L7 13Z`;
  return `M7 1 L${7+h*6} 7 L7 13Z`;
}

// Set both halves of one keyframe icon (an <svg class="key"> with two <path>s).
export function setKeyIcon(svg, incoming, outgoing) {
  const [l, r] = svg.querySelectorAll('path');
  l.setAttribute('d', halfIcon('l', incoming));
  r.setAttribute('d', halfIcon('r', outgoing));
}

export function bindTimeline({ track, head, tc, play, getAnims, frames, fps = 25 }) {
  const ms = 1000 / fps;
  let dur = frames * ms;
  const anims = () => getAnims().filter(a => !isTransition(a));

  const frameNow = () => {
    const t = anims()[0]?.currentTime ?? 0;
    return Math.floor((((t % dur) + dur) % dur) / ms + 1e-6);
  };
  const setFrame = f => {
    const wrapped = ((Math.round(f) % frames) + frames) % frames;
    anims().forEach(a => { a.pause(); a.currentTime = wrapped * ms; });
  };
  const isPlaying = () => anims()[0]?.playState === 'running';

  let shownPlaying = null;
  const showPlayState = () => {
    const on = isPlaying();
    if (on === shownPlaying) return;
    shownPlaying = on;
    play.setAttribute('aria-label', on ? 'Pause' : 'Play');
    play.querySelectorAll('.i-pause').forEach(n => n.style.display = on ? '' : 'none');
    play.querySelector('.i-play').style.display = on ? 'none' : '';
  };
  const toggle = () => {
    const on = isPlaying();
    anims().forEach(a => on ? a.pause() : a.play());
    showPlayState();
  };

  // Keyframe icons: position them from data-keys, hide any spare ones
  function setKeys(list) {
    [...track.querySelectorAll('.key')].forEach((k, i) => {
      if (i < list.length) {
        k.removeAttribute('hidden');
        k.style.left = (list[i] / frames * 100) + '%';
        if (!k.querySelector('path').getAttribute('d')) setKeyIcon(k, 'linear', 'linear');
      } else {
        k.setAttribute('hidden', '');
      }
    });
  }
  let keys = (track.dataset.keys || '').split(',').filter(s => s.trim() !== '').map(Number);

  function setFrames(n) {
    frames = n; dur = frames * ms;
    track.style.setProperty('--frames', frames);
    setKeys(keys);
  }
  setFrames(frames);

  play.addEventListener('click', toggle);

  // Scrub: click or drag on the track
  const scrub = e => {
    const r = track.getBoundingClientRect();
    const f = Math.min(frames - 1, Math.max(0, Math.round((e.clientX - r.left) / r.width * frames)));
    setFrame(f); showPlayState();
  };
  track.addEventListener('pointerdown', e => { track.setPointerCapture(e.pointerId); scrub(e); track.onpointermove = scrub; });
  track.addEventListener('pointerup', () => track.onpointermove = null);
  track.addEventListener('pointercancel', () => track.onpointermove = null);

  // After Effects keyboard habits
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.key === 'PageDown') { e.preventDefault(); setFrame(frameNow() + 1); showPlayState(); }
    if (e.key === 'PageUp') { e.preventDefault(); setFrame(frameNow() - 1); showPlayState(); }
    if (e.key === 'Home') { e.preventDefault(); setFrame(0); showPlayState(); }
    if (e.key === 'End') { e.preventDefault(); setFrame(frames - 1); showPlayState(); }
  });

  // Reduced motion: the demo waits on frame 0 until the learner presses play
  if (reducedMotion) setFrame(0);

  (function loop() {
    const f = frameNow();
    head.style.left = (f / frames * 100) + '%';
    tc.textContent = '00:00:' + String(Math.floor(f / fps)).padStart(2, '0') + ':' + String(f % fps).padStart(2, '0');
    showPlayState();
    requestAnimationFrame(loop);
  })();

  return {
    setFrames, setFrame, frameNow, isPlaying,
    setKeys(list) { keys = list; setKeys(keys); },
    play() { anims().forEach(a => a.play()); showPlayState(); },
    pause() { anims().forEach(a => a.pause()); showPlayState(); },
  };
}
