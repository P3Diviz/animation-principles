// Principles dropdown in the header.
// Opens on click (hover is unreliable on projector touch screens).
// Closes on Esc (focus returns to the button), on an outside click, or when a link is chosen.

const btn = document.getElementById('menuBtn');
const menu = document.getElementById('menu');

function isOpen() {
  return btn.getAttribute('aria-expanded') === 'true';
}

function setOpen(open) {
  btn.setAttribute('aria-expanded', open);
  if (open) {
    menu.hidden = false;
    requestAnimationFrame(() => menu.dataset.open = '');   // next frame, so the fade runs
  } else {
    delete menu.dataset.open;
    // Wait for the fade-out before hiding (unless it was reopened meanwhile)
    setTimeout(() => { if (!isOpen()) menu.hidden = true; }, 220);
  }
}

if (btn && menu) {
  btn.addEventListener('click', e => { e.stopPropagation(); setOpen(!isOpen()); });
  document.addEventListener('click', e => { if (isOpen() && !menu.contains(e.target)) setOpen(false); });
  menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
  });
}
