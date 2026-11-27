import './style.css';
import { initCart } from './cart.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
initCart();

// header shadow once scrolled
const top = document.querySelector('.top');
const onScroll = () => top.classList.toggle('solid', scrollY > 10);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// reveal on scroll
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 70}ms`;
  io.observe(el);
});

if (!reduced) {
  // parallax: elements drift at their own speed as they pass through the viewport
  const layers = [...document.querySelectorAll('[data-speed]')];
  let ticking = false;
  const update = () => {
    const vh = innerHeight;
    for (const el of layers) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const centre = r.top + r.height / 2 - vh / 2;
      const s = parseFloat(el.dataset.speed);
      el.style.translate = `0 ${(centre * s).toFixed(1)}px`;
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();

  // tilt photos toward the pointer, like picking up a print
  if (matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
}

// newsletter (front end only until an email provider is connected)
document.getElementById('newsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('email');
  const msg = document.getElementById('newsMsg');
  if (!input.checkValidity()) { msg.textContent = 'Please enter a valid email address.'; input.focus(); return; }
  msg.textContent = "Thanks! You're on the list.";
  input.value = '';
});
