import './style.css';
import { initCart } from './cart.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot'); // used only to render stills for the page images
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

initCart();

// header turns solid once we leave the hero
const top = document.querySelector('.top');
const onScrollHeader = () => top.classList.toggle('solid', scrollY > innerHeight * 0.6);
addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

// newsletter (front-end only until an email provider is connected)
document.getElementById('newsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('email');
  const msg = document.getElementById('newsMsg');
  if (!input.checkValidity()) { msg.textContent = 'Please enter a valid email address.'; input.focus(); return; }
  msg.textContent = "Thanks! You're on the list.";
  input.value = '';
});

// mobile buy bar shows after the hero, hides near the product card and footer
const buybar = document.getElementById('buybar');
const card = document.querySelector('.card');
let cardVisible = false;
new IntersectionObserver(([e]) => { cardVisible = e.isIntersecting; updateBar(); }).observe(card);
function updateBar() {
  const show = scrollY > innerHeight * 0.8 && !cardVisible;
  buybar.classList.toggle('show', show);
  buybar.setAttribute('aria-hidden', String(!show));
  document.getElementById('barAdd').tabIndex = show ? 0 : -1;
}
addEventListener('scroll', updateBar, { passive: true });

// --- 3D scenes (loaded after first paint so text and buttons are usable immediately)
const stage = document.getElementById('stage');
const story = document.getElementById('story');

async function start3D() {
  if (!hasWebGL()) { stage.classList.add('no-gl'); return; }
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('400 100px "Archivo Black"'),
    document.fonts.load('700 40px "DM Sans"'),
    document.fonts.load('500 40px "DM Sans"'),
  ]);
  const { createScene } = await import('./scene.js');
  const beach = createScene(document.getElementById('beach'), { shot });
  stage.classList.add('ready');

  const progress = () => {
    const r = story.getBoundingClientRect();
    const travel = innerHeight * 1.35;
    return Math.min(1, Math.max(0, -r.top / travel));
  };
  if (!shot) {
    beach.setProgress(progress());
    addEventListener('scroll', () => beach.setProgress(progress()), { passive: true });
    if (!reduced) addEventListener('pointermove', (e) => beach.setPointer(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5), { passive: true });
    new IntersectionObserver(([e]) => beach.setRunning(e.isIntersecting)).observe(stage);
  }

  const { createFoam } = await import('./foam.js');
  const foam = createFoam(document.getElementById('foam'), { shot });
  window.__norde = { beach, foam };
}

if ('requestIdleCallback' in window && !shot) requestIdleCallback(start3D, { timeout: 600 });
else start3D();
