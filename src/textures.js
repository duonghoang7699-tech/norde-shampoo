// Procedural canvas textures: bottle label, towel stripes, sand grain, orange peel.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* Bottle wrap texture. u wraps the bottle (0 = back seam, 0.5 = front centre). */
export function labelTexture(renderer, perimeter, height) {
  const H = 2048;
  const W = Math.round((H * perimeter) / height);
  const [c, g] = canvas(W, H);
  // matte charcoal base with a faint vertical sheen band
  g.fillStyle = '#2a2a2d';
  g.fillRect(0, 0, W, H);
  const px = W / perimeter; // pixels per world unit horizontally
  const py = H / height;
  const cx = W * 0.5;
  const top = (y) => H - y * py; // y in world units from bottle base

  const font = (w, s, f = 'DM Sans') => `${w} ${Math.round(s * py)}px "${f}", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';

  // white strip "COOL SCALP / CLEANSE"
  g.fillStyle = '#f4f2ee';
  const stripW = 0.36 * px, stripH = 0.13 * py;
  g.fillRect(cx - stripW / 2 + 0.05 * px, top(1.66), stripW, stripH);
  g.fillStyle = '#171411';
  g.font = font(700, 0.035);
  g.fillText('COOL SCALP', cx + 0.05 * px, top(1.6));
  g.font = font(700, 0.045);
  g.fillText('CLEANSE', cx + 0.05 * px, top(1.553));

  // brand
  g.fillStyle = '#d8d6d2';
  g.font = font(500, 0.06);
  if ('letterSpacing' in g) g.letterSpacing = `${Math.round(0.02 * py)}px`;
  g.fillText('NORDE', cx, top(1.4));
  if ('letterSpacing' in g) g.letterSpacing = '0px';

  // big product word
  g.fillStyle = '#f1efeb';
  g.font = font(400, 0.19, 'Archivo Black');
  g.fillText('TONIC', cx, top(1.15));
  g.font = font(700, 0.058);
  g.fillText('RINSE-IN SHAMPOO', cx, top(1.06));

  // menthol block, left aligned
  g.textAlign = 'left';
  const lx = cx - 0.3 * px;
  g.fillStyle = '#bdbab5';
  g.font = font(400, 0.034);
  g.fillText('infused with', lx, top(0.93));
  g.fillStyle = '#ecebe7';
  g.font = font(700, 0.058);
  g.fillText('COOL MENTHOL', lx, top(0.865));
  g.fillStyle = '#a9a6a1';
  g.font = font(400, 0.03);
  ['Cleanses oily scalps with a cool,', 'fresh finish. Conditions as you', 'rinse. One step, no extra bottle.'].forEach((t, i) =>
    g.fillText(t, lx, top(0.8 - i * 0.042)));

  // black bars
  g.fillStyle = '#0f0f10';
  g.fillRect(lx - 0.02 * px, top(0.6), 0.6 * px, 0.085 * py);
  g.fillRect(lx - 0.02 * px, top(0.505), 0.38 * px, 0.065 * py);
  g.textAlign = 'center';
  g.fillStyle = '#f1efeb';
  g.font = font(700, 0.04);
  g.fillText('Tonic Rinse-in Shampoo', cx, top(0.545));
  g.textAlign = 'left';
  g.fillStyle = '#d8d6d2';
  g.font = font(400, 0.032);
  g.fillText('with cool menthol', lx + 0.01 * px, top(0.462));

  g.textAlign = 'center';
  g.fillStyle = '#cfccc7';
  g.font = font(400, 0.045);
  g.fillText('550 ml   18.6 fl.oz.', cx, top(0.16));

  // back label: small print
  g.fillStyle = '#9d9a95';
  g.font = font(400, 0.028);
  const bx = 0.0;
  ['Directions: massage into wet hair,', 'lather and rinse well.', 'Avoid contact with eyes.', '', 'Prototype packaging · Norde'].forEach((t, i) => {
    g.fillText(t, bx + 0.0001, top(1.2 - i * 0.045));
    g.fillText(t, W, top(1.2 - i * 0.045));
  });

  // subtle grain so the plastic doesn't look CG-flat
  const r = rng(7);
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 6;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

/* Big headline word, rendered to a texture so it can sit in 3D space behind the bottle. */
export function wordTexture(word, color = '#ffffff') {
  const [c, g] = canvas(4096, 1024);
  g.fillStyle = color;
  g.font = '400 820px "Archivo Black", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = '-20px';
  g.fillText(word, 2048, 560);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Woven beach towel: cream base, navy + sky stripes, weave bump. */
export function towelTextures(renderer) {
  const W = 1024, H = 1024;
  const [c, g] = canvas(W, H);
  g.fillStyle = '#e8dcc3';
  g.fillRect(0, 0, W, H);
  const stripes = [
    [0, 90, '#2f4f86'], [90, 22, '#e8dcc3'], [112, 14, '#2f4f86'], [126, 120, '#e8dcc3'],
    [246, 60, '#8fb3d9'], [306, 20, '#e8dcc3'], [326, 60, '#8fb3d9'], [386, 140, '#e8dcc3'],
    [526, 90, '#2f4f86'], [616, 22, '#e8dcc3'], [638, 14, '#2f4f86'], [652, 120, '#e8dcc3'],
    [772, 60, '#8fb3d9'], [832, 20, '#e8dcc3'], [852, 60, '#8fb3d9'], [912, 112, '#e8dcc3'],
  ];
  for (const [x, w, col] of stripes) { g.fillStyle = col; g.fillRect(x, 0, w, H); }
  // weave: alternating fine lines
  const r = rng(3);
  for (let y = 0; y < H; y += 4) {
    g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.04})`;
    g.fillRect(0, y, W, 1.5);
  }
  for (let x = 0; x < W; x += 4) {
    g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.03})`;
    g.fillRect(x, 0, 1.2, H);
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const [bc, bg] = canvas(256, 256);
  for (let y = 0; y < 256; y += 4) for (let x = 0; x < 256; x += 4) {
    const on = ((x + y) / 4) % 2 === 0;
    bg.fillStyle = on ? '#bbb' : '#555';
    bg.fillRect(x, y, 4, 4);
  }
  const bump = new THREE.CanvasTexture(bc);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(14, 14);
  return { map, bump };
}

/* Fine sand: warm base with grain + darker speckles. */
export function sandTextures(renderer) {
  const S = 1024;
  const [c, g] = canvas(S, S);
  const img = g.createImageData(S, S);
  const r = rng(11);
  for (let i = 0; i < S * S; i++) {
    const n = r();
    const speck = r() > 0.985 ? -60 : 0;
    const v = 0.9 + n * 0.14;
    img.data[i * 4] = Math.min(255, 222 * v + speck);
    img.data[i * 4 + 1] = Math.min(255, 196 * v + speck);
    img.data[i * 4 + 2] = Math.min(255, 156 * v + speck);
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(10, 10);
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const [bc, bg] = canvas(512, 512);
  const bimg = bg.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) {
    const v = 90 + r() * 120;
    bimg.data[i * 4] = bimg.data[i * 4 + 1] = bimg.data[i * 4 + 2] = v;
    bimg.data[i * 4 + 3] = 255;
  }
  bg.putImageData(bimg, 0, 0);
  const bump = new THREE.CanvasTexture(bc);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(30, 30);
  return { map, bump };
}

/* Orange peel: colour variation + dimple bump. */
export function peelTextures() {
  const S = 512;
  const [c, g] = canvas(S, S);
  const grd = g.createLinearGradient(0, 0, 0, S);
  grd.addColorStop(0, '#e9851f'); grd.addColorStop(0.5, '#f39a2c'); grd.addColorStop(1, '#df7a1a');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  const r = rng(5);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '255,190,90' : '190,90,10'},${r() * 0.18})`;
    g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 4, 0, Math.PI * 2); g.fill();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;

  const [bc, bg] = canvas(512, 512);
  bg.fillStyle = '#c8c8c8'; bg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const x = r() * 512, y = r() * 512, rad = 1 + r() * 2.4;
    const gr = bg.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(40,40,40,0.9)'); gr.addColorStop(1, 'rgba(200,200,200,0)');
    bg.fillStyle = gr; bg.beginPath(); bg.arc(x, y, rad, 0, Math.PI * 2); bg.fill();
  }
  const bump = new THREE.CanvasTexture(bc);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(3, 2);
  return { map, bump };
}

/* Cut face of an orange: segments radiating from the centre. */
export function fleshTexture() {
  const S = 1024;
  const [c, g] = canvas(S, S);
  const cx = S / 2;
  g.fillStyle = '#f6e7c4'; g.beginPath(); g.arc(cx, cx, cx, 0, Math.PI * 2); g.fill(); // pith
  g.fillStyle = '#ee8a22'; g.beginPath(); g.arc(cx, cx, cx, 0, Math.PI * 2); g.lineWidth = 0;
  g.beginPath(); g.arc(cx, cx, cx * 0.995, 0, Math.PI * 2); g.strokeStyle = '#e7811d'; g.lineWidth = 14; g.stroke();
  const n = 11, r = rng(9);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.03, a1 = ((i + 1) / n) * Math.PI * 2 - 0.03;
    g.beginPath(); g.moveTo(cx + Math.cos((a0 + a1) / 2) * 30, cx + Math.sin((a0 + a1) / 2) * 30);
    g.arc(cx, cx, cx * 0.86, a0, a1); g.closePath();
    const gr = g.createRadialGradient(cx, cx, 20, cx, cx, cx * 0.86);
    gr.addColorStop(0, '#ffc46a'); gr.addColorStop(0.7, '#f7a23a'); gr.addColorStop(1, '#f08f25');
    g.fillStyle = gr; g.fill();
    for (let k = 0; k < 90; k++) { // juice vesicles
      const a = a0 + r() * (a1 - a0), d = 60 + r() * cx * 0.74;
      g.fillStyle = `rgba(255,${200 + r() * 40},${120 + r() * 60},${0.25 + r() * 0.3})`;
      g.beginPath(); g.ellipse(cx + Math.cos(a) * d, cx + Math.sin(a) * d, 3 + r() * 5, 10 + r() * 14, a, 0, Math.PI * 2); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
