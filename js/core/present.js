// Present mode: P (or the Present button) toggles data-present on <html>.
// Header and notes hide, controls scale up. Esc exits. The state is kept in
// sessionStorage so it carries across pages during a lesson.

const html = document.documentElement;
const hint = document.querySelector('.present-hint');
let hintTimer = null;

function isPresent() {
  return 'present' in html.dataset;
}

function setPresent(on) {
  if (on) html.dataset.present = ''; else delete html.dataset.present;
  try { sessionStorage.setItem('present', on ? '1' : '0'); } catch (e) {}
  if (on && hint) {
    hint.dataset.show = '';
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => delete hint.dataset.show, 2000);
  }
  window.dispatchEvent(new Event('resize'));   // lets 3D stages resize
}

try { if (sessionStorage.getItem('present') === '1') html.dataset.present = ''; } catch (e) {}

document.getElementById('presentBtn')?.addEventListener('click', () => setPresent(!isPresent()));

document.addEventListener('keydown', e => {
  if (e.target.closest?.('input, textarea, select')) return;  // ignore keys while typing
  if (e.ctrlKey || e.metaKey || e.altKey) return;            // leave Ctrl+P (print) alone
  if (e.key === 'p' || e.key === 'P') setPresent(!isPresent());
  if (e.key === 'Escape' && isPresent()) setPresent(false);
});
