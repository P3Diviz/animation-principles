// Wires every segmented control (.seg) and pill toggle (.pill) that names a target.
// The control only writes a data attribute on the target element; CSS does the restyling.
//
//   <div class="seg" data-target="stage" data-attr="squash">
//     <button data-value="off" aria-pressed="false">Off</button>
//     <button data-value="on" aria-pressed="true">On</button>
//   </div>
//   -> <div id="stage" data-squash="on">
//
//   <button class="pill" data-target="stage" data-attr="volume" aria-pressed="false">Volume check</button>
//   -> data-volume="on" | "off"
//
// After a change the target fires a 'statechange' event: { detail: { attr, value } }.

const isTransition = a => typeof CSSTransition !== 'undefined' && a instanceof CSSTransition;
// The 3D view's clock (js/three/view.js) keeps its own time, so it's left out.
const demoAnims = root => root.getAnimations({ subtree: true }).filter(a => !isTransition(a) && a.id !== 'clock3d');

// Run change() without losing the animation's place. Swapping animation-name (or showing
// a hidden element) restarts a CSS animation at 0; this puts every animation in root back
// on the same time, and keeps it paused if it was paused.
export function keepTime(root, change) {
  const before = demoAnims(root)[0];
  const t = before ? before.currentTime : null;
  const paused = before ? before.playState === 'paused' : false;
  change();
  if (t === null) return;
  demoAnims(root).forEach(a => { a.currentTime = t; if (paused) a.pause(); else if (a.playState !== 'running') a.play(); });
}

function setState(target, attr, value) {
  keepTime(target, () => { target.dataset[attr] = value; });
  target.dispatchEvent(new CustomEvent('statechange', { detail: { attr, value } }));
}

document.querySelectorAll('.seg[data-target]').forEach(group => {
  const target = document.getElementById(group.dataset.target);
  const buttons = [...group.querySelectorAll('button[data-value]')];
  buttons.forEach(btn => btn.addEventListener('click', () => {
    buttons.forEach(b => b.setAttribute('aria-pressed', b === btn));
    setState(target, group.dataset.attr, btn.dataset.value);
  }));
});

document.querySelectorAll('.pill[data-target]').forEach(pill => {
  const target = document.getElementById(pill.dataset.target);
  pill.addEventListener('click', () => {
    const on = pill.getAttribute('aria-pressed') !== 'true';
    pill.setAttribute('aria-pressed', on);
    setState(target, pill.dataset.attr, on ? 'on' : 'off');
  });
});

// Let page scripts set a state from code (presets) and keep the controls in step.
export function setControl(targetId, attr, value) {
  const target = document.getElementById(targetId);
  document.querySelectorAll(`.seg[data-target="${targetId}"][data-attr="${attr}"] button[data-value]`)
    .forEach(b => b.setAttribute('aria-pressed', b.dataset.value === value));
  document.querySelectorAll(`.pill[data-target="${targetId}"][data-attr="${attr}"]`)
    .forEach(p => p.setAttribute('aria-pressed', value === 'on'));
  setState(target, attr, value);
}
