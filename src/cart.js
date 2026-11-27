// Bag: sizes, quantity, drawer, free-delivery meter. Saved in this browser only.
const PRODUCTS = {
  'tonic-550': { name: 'Tonic Rinse in Shampoo', variant: '550 ml bottle', price: 18, thumb: '/img/thumb-tonic.webp' },
  'tonic-refill': { name: 'Tonic Rinse in Shampoo', variant: '800 ml refill', price: 15, thumb: '/img/thumb-tonic.webp' },
  'soap-550': { name: 'Cool Body Soap', variant: '550 ml bottle', price: 16, thumb: '/img/thumb-soap.webp' },
  'soap-refill': { name: 'Cool Body Soap', variant: '800 ml refill', price: 14, thumb: '/img/thumb-soap.webp' },
  'pair': { name: 'The coast pair', variant: 'Shampoo + body soap, 550 ml', price: 30, thumb: '/img/thumb-tonic.webp' },
};
const FREE_OVER = 35;
const KEY = 'norde-bag-v2';
const $ = (id) => document.getElementById(id);
const money = (n) => `$${n.toFixed(2)}`;

function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
function save(bag) { try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch { /* private mode */ } }

export function initCart() {
  let bag = load();
  let lastFocus = null;
  const drawer = $('drawer'), scrim = $('scrim'), bagBtn = $('bagBtn');

  document.querySelectorAll('.product').forEach((card) => {
    const priceEl = card.querySelector('[data-price]');
    const sel = () => card.querySelector('input[type=radio]:checked').value;
    card.querySelectorAll('input[type=radio]').forEach((r) => r.addEventListener('change', () => { priceEl.textContent = money(PRODUCTS[sel()].price); }));
    card.querySelector('.add').addEventListener('click', () => add(sel(), 1));
  });
  $('addPair').addEventListener('click', () => add('pair', 1));

  function add(id, n) {
    bag[id] = Math.min(20, (bag[id] || 0) + n);
    save(bag); render();
    const c = $('bagCount'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    open();
  }

  function render() {
    const ids = Object.keys(bag).filter((k) => PRODUCTS[k] && bag[k] > 0);
    const count = ids.reduce((s, k) => s + bag[k], 0);
    const sub = ids.reduce((s, k) => s + bag[k] * PRODUCTS[k].price, 0);
    $('bagCount').textContent = count;
    bagBtn.setAttribute('aria-label', `Open bag, ${count} item${count === 1 ? '' : 's'}`);
    $('subtotal').textContent = money(sub);
    $('delivery').textContent = sub === 0 ? 'Calculated at checkout' : sub >= FREE_OVER ? 'Free' : 'From $6.00';
    $('shipMsg').textContent = sub >= FREE_OVER ? 'You get free delivery.' : `Add ${money(FREE_OVER - sub)} for free delivery`;
    $('shipBar').style.width = `${Math.min(100, (sub / FREE_OVER) * 100)}%`;
    $('empty').hidden = count > 0;
    $('foot').hidden = count === 0;
    const list = $('lines');
    list.innerHTML = '';
    for (const id of ids) {
      const p = PRODUCTS[id];
      const li = document.createElement('li');
      li.className = 'line';
      li.innerHTML = `
        <div class="thumb" style="background-image:url('${p.thumb}')" role="img" aria-label="${p.variant}"></div>
        <div><h3>${p.name}</h3><small>${p.variant}</small>
          <div class="qty" role="group" aria-label="Quantity for ${p.variant}">
            <button type="button" data-a="dec" aria-label="Decrease">−</button><output>${bag[id]}</output><button type="button" data-a="inc" aria-label="Increase">+</button>
          </div></div>
        <div class="end"><b>${money(p.price * bag[id])}</b><button type="button" class="remove" data-a="rm">Remove</button></div>`;
      li.addEventListener('click', (e) => {
        const a = e.target.closest('button')?.dataset.a;
        if (!a) return;
        if (a === 'inc') bag[id] = Math.min(20, bag[id] + 1);
        if (a === 'dec') bag[id] = Math.max(0, bag[id] - 1);
        if (a === 'rm') bag[id] = 0;
        if (!bag[id]) delete bag[id];
        save(bag); render();
        if (!Object.keys(bag).length) $('closeBag').focus();
      });
      list.appendChild(li);
    }
  }

  function open() {
    lastFocus = document.activeElement;
    scrim.hidden = false;
    requestAnimationFrame(() => { scrim.classList.add('show'); drawer.classList.add('open'); });
    drawer.setAttribute('aria-hidden', 'false');
    bagBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('closeBag').focus(), 50);
  }
  function close() {
    scrim.classList.remove('show'); drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    bagBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => { scrim.hidden = true; }, 300);
    lastFocus?.focus?.();
  }
  bagBtn.onclick = open;
  $('closeBag').onclick = close;
  scrim.onclick = close;
  $('emptyShop').onclick = close;
  addEventListener('keydown', (e) => {
    if (!drawer.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // keep focus inside the drawer
      const f = [...drawer.querySelectorAll('button, a[href], input')].filter((el) => el.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  let toastT;
  $('checkout').onclick = () => {
    const t = $('toast');
    t.textContent = 'Checkout connects once payments are set up.';
    t.classList.add('show'); clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2800);
  };

  render();
}
