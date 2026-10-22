import * as THREE from 'three';

/** Procedural textures (no image files to download). Every facade tile = 4 window bays × 4 floors. */
export type Style = 'altbau' | 'stone' | 'platte' | 'brick' | 'glass';
export const STYLE_DIM: Record<Style, { bay: number; floor: number }> = {
  altbau: { bay: 4.4, floor: 3.8 }, stone: { bay: 5, floor: 4.2 }, platte: { bay: 3.6, floor: 2.9 }, brick: { bay: 4, floor: 3.6 }, glass: { bay: 3, floor: 3.6 },
};
export const SHOP_TILE = { w: 8.8, h: 4.5 };

let seed = 12345;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const ctx2d = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, g: c.getContext('2d', { willReadFrequently: true })! }; };

function grain(g: CanvasRenderingContext2D, w: number, h: number, a: number) {
  const im = g.getImageData(0, 0, w, h); const d = im.data; const k = a * 255;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * k; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
}

function tex(c: HTMLCanvasElement, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 8;
  return t;
}

/** normal map from a height canvas (white = high) */
export function normalFrom(src: HTMLCanvasElement, strength = 2.5) {
  const W = src.width; const H = src.height; const d = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, H).data;
  const { c, g } = ctx2d(W, H); const im = g.createImageData(W, H);
  const L = (x: number, y: number) => { const i = (((y + H) % H) * W + ((x + W) % W)) * 4; return (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (L(x - 1, y) - L(x + 1, y)) * strength; const dy = (L(x, y - 1) - L(x, y + 1)) * strength; const l = Math.hypot(dx, dy, 1); const i = (y * W + x) * 4;
    im.data[i] = (dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); return tex(c, false);
}

export interface FacadeSet { map: THREE.Texture; emissive: THREE.Texture; normal: THREE.Texture; rough: THREE.Texture }

/** windows: [x, y, w, h] in tile pixels (512 = 4 bays / 4 floors) */
function drawFacade(style: Style) {
  const S = 512; const bay = S / 4; const fl = S / 4;
  const col = ctx2d(S, S); const hgt = ctx2d(S, S); const em = ctx2d(S, S); const ro = ctx2d(S, S);
  const g = col.g; const h = hgt.g; const e = em.g; const r = ro.g;
  e.fillStyle = '#000'; e.fillRect(0, 0, S, S); r.fillStyle = '#d0d0d0'; r.fillRect(0, 0, S, S);
  // wall
  const wall = { altbau: '#ece6dc', stone: '#e4d8c2', platte: '#e9e6df', brick: '#b5553c', glass: '#5d6c78' }[style];
  g.fillStyle = wall; g.fillRect(0, 0, S, S); h.fillStyle = '#808080'; h.fillRect(0, 0, S, S);
  if (style === 'brick') {
    for (let y = 0; y < S; y += 8) for (let x = -16; x < S; x += 24) { const ox = (y / 8) % 2 ? 12 : 0; g.fillStyle = `hsl(${10 + rnd() * 10},${45 + rnd() * 15}%,${36 + rnd() * 10}%)`; g.fillRect(x + ox, y, 22, 6); h.fillStyle = '#9a9a9a'; h.fillRect(x + ox, y, 22, 6); }
  }
  if (style === 'stone') { h.strokeStyle = '#555'; g.strokeStyle = 'rgba(90,70,40,.25)'; for (let y = 0; y < S; y += 32) { g.lineWidth = 2; h.lineWidth = 2; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); h.beginPath(); h.moveTo(0, y); h.lineTo(S, y); h.stroke(); } }
  if (style === 'platte') { h.strokeStyle = '#444'; g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 3; h.lineWidth = 3; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, k * fl); g.lineTo(S, k * fl); g.stroke(); h.beginPath(); h.moveTo(0, k * fl); h.lineTo(S, k * fl); h.stroke(); } for (let k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, S); g.stroke(); } }
  if (style === 'altbau') { // floor bands and a frieze
    for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, k * fl + fl - 10, S, 6); h.fillStyle = '#b0b0b0'; h.fillRect(0, k * fl + fl - 12, S, 8); }
  }
  for (let fy = 0; fy < 4; fy++) for (let bx = 0; bx < 4; bx++) {
    let x: number; let y: number; let w: number; let ht: number;
    if (style === 'glass') { x = bx * bay + 3; y = fy * fl + 3; w = bay - 6; ht = fl - 6; }
    else if (style === 'platte') { x = bx * bay + bay * 0.14; y = fy * fl + fl * 0.3; w = bay * 0.72; ht = fl * 0.48; }
    else if (style === 'stone') { x = bx * bay + bay * 0.3; y = fy * fl + fl * 0.18; w = bay * 0.4; ht = fl * 0.6; }
    else { x = bx * bay + bay * 0.29; y = fy * fl + fl * 0.17; w = bay * 0.42; ht = fl * 0.58; }
    // frame / surround (relief)
    if (style !== 'glass') {
      const fr = style === 'brick' ? '#e6d3b8' : '#f7f4ee';
      g.fillStyle = fr; g.fillRect(x - 7, y - 7, w + 14, ht + 14); h.fillStyle = '#c8c8c8'; h.fillRect(x - 7, y - 7, w + 14, ht + 14);
      if (style === 'altbau' || style === 'stone') { // pediment above and a sill below
        g.fillStyle = fr; g.fillRect(x - 12, y - 18, w + 24, 8); h.fillStyle = '#e8e8e8'; h.fillRect(x - 12, y - 18, w + 24, 8);
        g.fillRect(x - 10, y + ht + 7, w + 20, 6); h.fillRect(x - 10, y + ht + 7, w + 20, 6);
        if (style === 'stone' && fy % 2 === 0) { g.beginPath(); g.moveTo(x - 12, y - 18); g.lineTo(x + w / 2, y - 34); g.lineTo(x + w + 12, y - 18); g.closePath(); g.fill(); h.beginPath(); h.moveTo(x - 12, y - 18); h.lineTo(x + w / 2, y - 34); h.lineTo(x + w + 12, y - 18); h.closePath(); h.fill(); }
      }
    }
    // glass with sky reflection
    const gr = g.createLinearGradient(x, y, x + w * 0.3, y + ht); gr.addColorStop(0, style === 'glass' ? '#8fb3c9' : '#9db7c8'); gr.addColorStop(0.45, style === 'glass' ? '#3e5a6e' : '#43586a'); gr.addColorStop(1, '#1f2b35');
    g.fillStyle = gr; g.fillRect(x, y, w, ht); h.fillStyle = '#303030'; h.fillRect(x, y, w, ht); r.fillStyle = '#141414'; r.fillRect(x, y, w, ht);
    const curtains = rnd() < 0.35 && style !== 'glass';
    if (curtains) { g.fillStyle = `hsla(${rnd() * 360},25%,80%,.55)`; g.fillRect(x, y, w * 0.25, ht); g.fillRect(x + w * 0.75, y, w * 0.25, ht); }
    // mullions
    if (style !== 'glass') { g.fillStyle = '#f4f1ea'; g.fillRect(x + w / 2 - 2, y, 4, ht); g.fillRect(x, y + ht * (style === 'platte' ? 0.5 : 0.32), w, 4); h.fillStyle = '#d0d0d0'; h.fillRect(x + w / 2 - 2, y, 4, ht); }
    else { g.fillStyle = '#2b3740'; g.fillRect(x - 3, y, 3, ht); h.fillStyle = '#d0d0d0'; h.fillRect(x - 3, y - 3, w + 6, 3); }
    // lit at night
    if (rnd() < (style === 'glass' ? 0.45 : 0.38)) { const warm = rnd() < 0.75; e.fillStyle = warm ? `hsl(${32 + rnd() * 12},${70 + rnd() * 20}%,${48 + rnd() * 18}%)` : `hsl(${200 + rnd() * 20},40%,${55 + rnd() * 15}%)`; e.fillRect(x, y, w, ht); if (curtains) { e.fillStyle = 'rgba(0,0,0,.35)'; e.fillRect(x, y, w * 0.25, ht); e.fillRect(x + w * 0.75, y, w * 0.25, ht); } }
  }
  grain(g, S, S, style === 'glass' ? 0.03 : 0.07); grain(h, S, S, 0.12);
  return { map: tex(col.c), emissive: tex(em.c), normal: normalFrom(hgt.c, style === 'brick' ? 3 : 2.2), rough: tex(ro.c, false) };
}

function drawShop() {
  const W = 512; const H = 256; const col = ctx2d(W, H); const hgt = ctx2d(W, H); const em = ctx2d(W, H); const ro = ctx2d(W, H);
  const g = col.g; const h = hgt.g; const e = em.g; const r = ro.g; e.fillStyle = '#000'; e.fillRect(0, 0, W, H); r.fillStyle = '#c0c0c0'; r.fillRect(0, 0, W, H);
  g.fillStyle = '#d9d2c6'; g.fillRect(0, 0, W, H); h.fillStyle = '#909090'; h.fillRect(0, 0, W, H);
  for (let k = 0; k < 2; k++) {
    const x = k * 256 + 18; const y = 58; const w = 220; const ht = 178;
    g.fillStyle = '#2b3138'; g.fillRect(x - 6, y - 6, w + 12, ht + 12); h.fillStyle = '#b0b0b0'; h.fillRect(x - 6, y - 6, w + 12, ht + 12);
    const gr = g.createLinearGradient(x, y, x, y + ht); gr.addColorStop(0, '#a9c2cf'); gr.addColorStop(0.35, '#4c5d68'); gr.addColorStop(1, '#2a3238'); g.fillStyle = gr; g.fillRect(x, y, w, ht);
    g.fillStyle = 'rgba(255,214,150,.18)'; g.fillRect(x + 10, y + 70, w - 20, ht - 80); // warm interior
    h.fillStyle = '#303030'; h.fillRect(x, y, w, ht); r.fillStyle = '#121212'; r.fillRect(x, y, w, ht);
    if (k === 1) { g.fillStyle = '#3a2a1e'; g.fillRect(x + w - 70, y + 20, 60, ht - 20); }
    e.fillStyle = '#d9a35c'; e.fillRect(x, y, w, ht); e.fillStyle = '#7a5530'; e.fillRect(x, y, w, 40);
    g.fillStyle = '#f2efe8'; g.fillRect(x + w / 2 - 2, y, 4, ht);
  }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, W, 40); // sign band (signs are separate meshes)
  grain(g, W, H, 0.05);
  return { map: tex(col.c), emissive: tex(em.c), normal: normalFrom(hgt.c, 2), rough: tex(ro.c, false) };
}

const cache = new Map<string, any>();
const once = <T,>(k: string, f: () => T): T => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
export const facadeTex = (s: Style): FacadeSet => once(`f${s}`, () => drawFacade(s));
export const shopTex = (): FacadeSet => once('shop', drawShop);

export const groundTex = (kind: 'asphalt' | 'paving' | 'grass' | 'gravel' | 'cobble' | 'roof' | 'water' | 'concrete') => once(`g${kind}`, () => {
  const S = 256; const { c, g } = ctx2d(S, S); const hg = ctx2d(S, S); const h = hg.g;
  h.fillStyle = '#808080'; h.fillRect(0, 0, S, S);
  if (kind === 'asphalt') { g.fillStyle = '#4a4f55'; g.fillRect(0, 0, S, S); for (let k = 0; k < 2500; k++) { const v = 60 + rnd() * 50; g.fillStyle = `rgb(${v},${v + 2},${v + 5})`; g.fillRect(rnd() * S, rnd() * S, 2, 2); } }
  if (kind === 'paving') { g.fillStyle = '#c9c4ba'; g.fillRect(0, 0, S, S); for (let y = 0; y < S; y += 32) for (let x = 0; x < S; x += 32) { const v = 185 + rnd() * 25; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(x + 1, y + 1, 30, 30); h.fillStyle = '#9a9a9a'; h.fillRect(x + 1, y + 1, 30, 30); } }
  if (kind === 'cobble') { g.fillStyle = '#6d6a66'; g.fillRect(0, 0, S, S); for (let y = 0; y < S; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < S; x += 16) { const v = 100 + rnd() * 50; g.fillStyle = `rgb(${v},${v - 3},${v - 6})`; g.beginPath(); g.arc(x + 8, y + 8, 7, 0, 7); g.fill(); h.fillStyle = '#c0c0c0'; h.beginPath(); h.arc(x + 8, y + 8, 6, 0, 7); h.fill(); } }
  if (kind === 'grass') { g.fillStyle = '#5f8a3e'; g.fillRect(0, 0, S, S); for (let k = 0; k < 6000; k++) { g.fillStyle = `hsla(${80 + rnd() * 35},${35 + rnd() * 25}%,${25 + rnd() * 25}%,.6)`; g.fillRect(rnd() * S, rnd() * S, 1.5, 3); } }
  if (kind === 'gravel') { g.fillStyle = '#8a8580'; g.fillRect(0, 0, S, S); for (let k = 0; k < 4000; k++) { const v = 100 + rnd() * 80; g.fillStyle = `rgb(${v},${v - 4},${v - 8})`; g.fillRect(rnd() * S, rnd() * S, 2, 2); } }
  if (kind === 'roof') { g.fillStyle = '#5a5e63'; g.fillRect(0, 0, S, S); for (let x = 0; x < S; x += 16) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, 0, 2, S); h.fillStyle = '#c0c0c0'; h.fillRect(x, 0, 3, S); } }
  if (kind === 'concrete') { g.fillStyle = '#b4b0aa'; g.fillRect(0, 0, S, S); }
  if (kind === 'water') { g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S); for (let k = 0; k < 220; k++) { h.fillStyle = `rgba(255,255,255,${rnd() * 0.5})`; h.beginPath(); h.ellipse(rnd() * S, rnd() * S, 6 + rnd() * 14, 2 + rnd() * 4, 0, 0, 7); h.fill(); } }
  grain(g, S, S, kind === 'water' ? 0 : 0.08); grain(h, S, S, kind === 'water' ? 0.05 : 0.2);
  return { map: tex(c), normal: normalFrom(hg.c, kind === 'cobble' ? 3 : kind === 'water' ? 1.5 : 1.8) };
});

export const signTex = (text: string, bg: string, fg: string, w = 512, h = 96, font = '800 58px "Barlow Condensed", Arial') => once(`s${text}${bg}${fg}${w}`, () => {
  const { c, g } = ctx2d(w, h); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = parseInt(font.match(/(\d+)px/)?.[1] || '58', 10); while (g.measureText(text).width > w - 30 && fs > 16) { fs -= 2; g.font = font.replace(/\d+px/, `${fs}px`); }
  g.fillText(text, w / 2, h / 2 + 3); return tex(c, true, false);
});

/** Berlin street name plate: white text, thin white border, on dark blue... (newer Berlin plates are white on blue) */
export const streetSignTex = (name: string) => once(`st${name}`, () => {
  const w = 512; const h = 112; const { c, g } = ctx2d(w, h); g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b3f8b'; g.fillRect(6, 6, w - 12, h - 12);
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.strokeRect(14, 14, w - 28, h - 28); g.fillStyle = '#ffffff'; let fs = 56; g.font = `700 ${fs}px "Barlow Condensed", Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
  while (g.measureText(name).width > w - 60 && fs > 18) { fs -= 2; g.font = `700 ${fs}px "Barlow Condensed", Arial`; } g.fillText(name, w / 2, h / 2 + 3); return tex(c, true, false);
});

/** murals for the East Side Gallery (abstract, made here – not copies of real artworks) */
export const muralTex = (k: number) => once(`mural${k}`, () => {
  const w = 512; const h = 160; const { c, g } = ctx2d(w, h); const pal = [['#ffcc00', '#e5484d', '#2459c4', '#ffffff'], ['#43c482', '#7a4bd8', '#f06292', '#13202b'], ['#ff8a3d', '#1b8a4e', '#ffe08a', '#2a2f8a'], ['#e9e3d6', '#cf343a', '#13202b', '#f0ab00']][k % 4];
  g.fillStyle = pal[3]; g.fillRect(0, 0, w, h); seed = 100 + k * 77;
  for (let i = 0; i < 14; i++) { g.fillStyle = pal[i % 3]; g.globalAlpha = 0.85; const t = rnd(); if (t < 0.4) { g.beginPath(); g.arc(rnd() * w, rnd() * h, 10 + rnd() * 60, 0, 7); g.fill(); } else if (t < 0.7) { g.fillRect(rnd() * w, rnd() * h, 20 + rnd() * 140, 10 + rnd() * 50); } else { g.beginPath(); g.moveTo(rnd() * w, h); g.quadraticCurveTo(rnd() * w, -40, rnd() * w, h); g.lineWidth = 10 + rnd() * 20; g.strokeStyle = pal[(i + 1) % 3]; g.stroke(); } }
  g.globalAlpha = 1; g.fillStyle = pal[(k + 1) % 3]; g.font = '800 34px "Barlow Condensed", Arial'; g.fillText(['FREIHEIT', 'BERLIN', 'LIEBE', 'FRIEDEN', 'MAUERFALL 1989', 'HOFFNUNG'][k % 6], 20 + (k * 53) % 280, 40 + (k * 31) % 90);
  grain(g, w, h, 0.08); return tex(c, true, false);
});

export const posterTex = (k: number) => once(`poster${k}`, () => {
  const w = 256; const h = 384; const { c, g } = ctx2d(w, h); const cs = ['#cf343a', '#2459c4', '#f0ab00', '#1b8a4e', '#7a4bd8', '#13202b'];
  g.fillStyle = cs[k % 6]; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '800 46px "Barlow Condensed", Arial'; g.textAlign = 'center';
  g.fillText(['KONZERT', 'THEATER', 'KINO', 'MUSEUM', 'FESTIVAL', 'OPER'][k % 6], w / 2, 90); g.font = '600 26px Arial'; g.fillText(['Berghain · Sa', 'Volksbühne', 'Babylon', 'Pergamon', 'Tempelhof', 'Staatsoper'][k % 6], w / 2, 140);
  g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(w / 2, 260, 80, 0, 7); g.fill(); return tex(c, true, false);
});

/** all shop signs in one texture (one draw call per chunk instead of one per shop type) */
export const SIGN_ROWS = 16;
export function atlasTex(rows: { text: string; bg: string; fg: string }[], key: string, rowH = 96, font = '800 58px "Barlow Condensed", Arial') {
  return once(key, () => {
    const w = 1024; const { c, g } = ctx2d(w, rowH * rows.length);
    rows.forEach((r, k) => { g.fillStyle = r.bg; g.fillRect(0, k * rowH, w, rowH); if (key === 'streets') { g.fillStyle = '#ffffff'; g.fillRect(0, k * rowH, w, rowH); g.fillStyle = r.bg; g.fillRect(8, k * rowH + 8, w - 16, rowH - 16); g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(20, k * rowH + 20, w - 40, rowH - 40); }
      g.fillStyle = r.fg; let fs = parseInt(font.match(/(\d+)px/)?.[1] || '58', 10); g.font = font.replace(/\d+px/, fs + 'px'); while (g.measureText(r.text).width > w - 80 && fs > 16) { fs -= 2; g.font = font.replace(/\d+px/, fs + 'px'); }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(r.text, w / 2, k * rowH + rowH / 2 + 3); });
    const tx = tex(c, true, false); tx.anisotropy = 8; return tx;
  });
}
