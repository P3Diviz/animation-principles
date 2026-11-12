// Wires every .slider: the range value goes to a CSS custom property on the target,
// the <output> shows it, and --pct fills the track up to the thumb.
//
//   <label class="slider"><span class="row"><span>Amount</span><output>100%</output></span>
//     <input type="range" min="0" max="150" value="100"
//            data-target="stage" data-var="--amount" data-scale="0.01" data-unit="%"></label>
//   -> stage.style.setProperty('--amount', 1)
//
// Page scripts can also listen for the input's own 'input' event.

export function showSlider(input) {
  const min = +input.min || 0, max = +input.max || 100;
  input.style.setProperty('--pct', ((input.value - min) / (max - min) * 100) + '%');
  const out = input.closest('.slider')?.querySelector('output');
  if (out) out.textContent = input.value + (input.dataset.unit || '');
  const target = input.dataset.target && document.getElementById(input.dataset.target);
  if (target && input.dataset.var) target.style.setProperty(input.dataset.var, input.value * (+input.dataset.scale || 1));
}

// Set a slider from code (for presets) and update everything it drives.
export function setSlider(input, value) {
  input.value = value;
  showSlider(input);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

document.querySelectorAll('.slider input[type="range"]').forEach(input => {
  input.addEventListener('input', () => showSlider(input));
  showSlider(input);
});
