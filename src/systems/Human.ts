// @ts-nocheck
/* Procedural humans: body, face, hair and clothes are built in code, so every part can be chosen and animated.
   Ported from the Sprachbahn city (same author); units are metres. */
// ---------- 3D people: humans built in code, every part can be chosen ----------
export const SKINS = ['#f7dcc8', '#f1c7a1', '#e6b48f', '#d9a77f', '#c48a5e', '#a8714a', '#8a5a3a', '#5e3b26'];
export const HAIRC = ['#151515', '#2a1d14', '#4a3020', '#7a5230', '#a8723e', '#d9b26a', '#e8d6a0', '#a8452f', '#b9b4ad', '#efece6', '#7a4bd8', '#2459c4'];
export const EYEC = ['#3b2a1e', '#6b4226', '#8a6a2a', '#2f7d4f', '#3d7fc4', '#5a6772'];
export const CLOTH = ['#f4f6f8', '#13202b', '#4a5563', '#2d4a6b', '#2459c4', '#7cc3e8', '#1b8a4e', '#9bbf6a', '#f0ab00', '#e0681a', '#cf343a', '#8a2442', '#f2a7c0', '#7a4bd8', '#8a5a32', '#c9b38a'];
export const LIPC = ['#b4646a', '#c2575e', '#d27b7b', '#9a4a4a', '#8a3a48', '#c98b7b'];
export const LOOK0 = { sex: 'm', skin: '#e6b48f', h: 1, w: 1, face: 'oval', nose: 'gerade', noseS: 1, noseW: 1, noseL: 1, eye: '#3b2a1e', eyeS: 1, brow: 1, lips: 1, lipC: '#b4646a',
  beard: 'none', beardC: '', hair: 'short', hairC: '#151515', scarf: '#2459c4', top: 'tshirt', topC: '#f0ab00', top2: '#f4f6f8', bottom: 'jeans', botC: '#2d4a6b',
  shoes: 'sneaker', shoeC: '#f4f6f8', glasses: 'none', hat: 'none', hatC: '#13202b', bag: 0, bagC: '#cf343a', neck: 0, neckC: '#cf343a', ear: 0, watch: 0, tie: 0 };
export const hashS = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
export const seeded = (seed) => { let s = seed % 2147483647 || 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const pickR = (r, a) => a[Math.floor(r() * a.length)];
export function randLook(r: () => number = Math.random, sex?: string): any {
  const f = (sex || (r() < 0.5 ? 'f' : 'm')) === 'f';
  return { ...LOOK0, sex: f ? 'f' : 'm', skin: pickR(r, SKINS), h: 0.95 + r() * 0.1, w: 0.9 + r() * 0.25, face: pickR(r, ['oval', 'round', 'square']), nose: pickR(r, ['gerade', 'stups', 'adler', 'breit']),
    noseS: 0.85 + r() * 0.35, noseW: 0.85 + r() * 0.35, noseL: 0.88 + r() * 0.25, eye: pickR(r, EYEC), eyeS: 0.9 + r() * 0.2, brow: 0.8 + r() * 0.5, lips: 0.85 + r() * 0.3, lipC: pickR(r, LIPC),
    beard: f ? 'none' : pickR(r, ['none', 'none', 'stubble', 'short', 'full', 'moustache', 'goatee']), hair: f ? pickR(r, ['long', 'bob', 'ponytail', 'bun', 'curly', 'afro', 'hijab']) : pickR(r, ['short', 'side', 'buzz', 'curly', 'afro', 'bald']),
    hairC: pickR(r, HAIRC.slice(0, 9)), scarf: pickR(r, CLOTH), top: f ? pickR(r, ['tshirt', 'shirt', 'sweater', 'hoodie', 'jacket', 'dress', 'coat']) : pickR(r, ['tshirt', 'shirt', 'sweater', 'hoodie', 'jacket', 'coat']),
    topC: pickR(r, CLOTH), top2: pickR(r, CLOTH), bottom: f ? pickR(r, ['jeans', 'trousers', 'skirt', 'shorts']) : pickR(r, ['jeans', 'trousers', 'shorts']), botC: pickR(r, ['#2d4a6b', '#13202b', '#4a5563', '#8a5a32', '#c9b38a', '#1b8a4e', '#7a4bd8']),
    shoes: pickR(r, ['sneaker', 'shoes', 'boots']), shoeC: pickR(r, ['#f4f6f8', '#13202b', '#5a3a22', '#cf343a', '#2459c4']), glasses: r() < 0.25 ? pickR(r, ['round', 'square', 'sun']) : 'none',
    hat: r() < 0.15 ? pickR(r, ['cap', 'beanie', 'hat']) : 'none', hatC: pickR(r, CLOTH), bag: r() < 0.3 ? 1 : 0, bagC: pickR(r, CLOTH), neck: r() < 0.15 ? 1 : 0, neckC: pickR(r, CLOTH), ear: f && r() < 0.5 ? 1 : 0, watch: r() < 0.4 ? 1 : 0 };
}

export function humanKit(T) {
  const lin = (c) => new T.Color(c);
  const X = new T.Vector3(1, 0, 0);
  const texs = {}; const mats = {}; const geos = {};
  const pattern = (kind) => {
    if (texs[kind]) return texs[kind];
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d', { willReadFrequently: true }); const img = g.createImageData(128, 128); let sd = 3;
    const rn = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }; const col = Array.from({ length: 128 }, () => rn());
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      let v = 236 + rn() * 19;
      if (kind === 'denim') v = 188 + ((x + y) % 6 < 3 ? 34 : 0) + rn() * 30;
      if (kind === 'knit') v = 205 + Math.abs(Math.sin(x * 0.55)) * 40 + rn() * 12;
      if (kind === 'hair') v = 150 + col[x] * 80 + Math.sin(y * 0.15 + col[x] * 9) * 12 + rn() * 14;
      if (kind === 'skin') v = 240 + rn() * 15 - (rn() < 0.04 ? 25 : 0);
      if (kind === 'cotton') v = 228 + ((x % 4 < 2) !== (y % 4 < 2) ? 10 : 0) + rn() * 17;
      const i = (y * 128 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v); img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.wrapT = T.RepeatWrapping; t.repeat.set(kind === 'hair' ? 3 : 2, kind === 'hair' ? 1 : 2); t.colorSpace = T.SRGBColorSpace;
    return (texs[kind] = t);
  };
  // a normal map made from the same pattern: light catches the strands, the weave and the pores
  const bumpOf = (kind) => {
    const k = `n${kind}`; if (texs[k]) return texs[k];
    const src = pattern(kind).image; const W = src.width; const H = src.height; const d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); const img = g.createImageData(W, H);
    const hgt = (x, y) => d[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255; const str = kind === 'hair' ? 6 : kind === 'skin' ? 1.5 : 3.5;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (hgt(x - 1, y) - hgt(x + 1, y)) * str; const dy = (hgt(x, y - 1) - hgt(x, y + 1)) * str; const l = Math.hypot(dx, dy, 1); const i = (y * W + x) * 4; img.data[i] = (dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.wrapT = T.RepeatWrapping; t.repeat.copy(pattern(kind).repeat); return (texs[k] = t);
  };
  const M = (c, o = {}) => {
    const k = [c, o.r, o.m, o.t, o.op, o.e, o.ds, o.vc].join('|'); if (mats[k]) return mats[k];
    const m = new T.MeshStandardMaterial({ color: lin(c), roughness: o.r ?? 0.85, metalness: o.m ?? 0, map: o.t ? pattern(o.t) : null, transparent: (o.op ?? 1) < 1, opacity: o.op ?? 1, side: o.ds ? T.DoubleSide : T.FrontSide, vertexColors: !!o.vc });
    if (o.t) { m.normalMap = bumpOf(o.t); const ns = { hair: 0.9, skin: 0.18, knit: 0.8, denim: 0.6 }[o.t] ?? 0.4; m.normalScale.set(ns, ns); }
    if (o.e) m.emissive = lin(c).multiplyScalar(o.e);
    return (mats[k] = m);
  };
  const G = (k, make) => geos[k] || (geos[k] = make());
  const V2 = (x, y) => new T.Vector2(x, y);
  // a limb that hangs down from its joint: rounded at both ends, slightly fuller in the middle
  const limb = (r1, r2, L) => G(`l${r1}|${r2}|${L}`, () => {
    const p = [];
    for (let i = 0; i <= 4; i++) { const a = (i / 4) * (Math.PI / 2); p.push(V2(Math.max(0.0001, Math.sin(a) * r2), -L - Math.cos(a) * r2 * 0.75)); }
    for (let i = 1; i < 6; i++) { const t = i / 6; p.push(V2((r2 + (r1 - r2) * t) * (1 + 0.07 * Math.sin(t * Math.PI)), -L + L * t)); }
    for (let i = 0; i <= 4; i++) { const a = (i / 4) * (Math.PI / 2); p.push(V2(Math.max(0.0001, Math.cos(a) * r1), Math.sin(a) * r1 * 0.75)); }
    return new T.LatheGeometry(p, 14);
  });
  // prof: rows [y, half width, front depth, back depth] from bottom to top. extra(y, a) pushes the surface out (a = angle from the front)
  // gap leaves the front open (jackets). The rows are smoothed with a Catmull-Rom spline.
  const bodyGeo = (k, prof, o = {}) => G(k, () => {
    const RS = 44; const S = 5; const rows = []; const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    for (let i = 0; i < prof.length - 1; i++) for (let j = 0; j < S; j++) { const t = j / S; const P = (q) => prof[Math.max(0, Math.min(prof.length - 1, q))]; rows.push([0, 1, 2, 3].map((c) => cr(P(i - 1)[c], P(i)[c], P(i + 1)[c], P(i + 2)[c], t))); }
    rows.push(prof[prof.length - 1]);
    const pos = []; const uv = []; const idx = []; const n = 2.35; const pw = (v) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);
    rows.forEach(([y, wx, zf, zb], r) => { for (let j = 0; j <= RS; j++) { const th = Math.PI + (j / RS) * Math.PI * 2; const sn = Math.sin(th); const cs = Math.cos(th); const a = Math.atan2(sn, cs); let x = Math.max(0.0005, wx) * pw(sn); let z = (cs >= 0 ? zf : zb) * pw(cs); if (o.extra) { const e = o.extra(y, a); z += e[1]; x += e[0]; } pos.push(x, y, z); uv.push(j / RS, r / (rows.length - 1)); } });
    const open = (j) => o.gap && Math.abs(Math.atan2(Math.sin(Math.PI + ((j + 0.5) / RS) * Math.PI * 2), Math.cos(Math.PI + ((j + 0.5) / RS) * Math.PI * 2))) < o.gap / 2;
    for (let r = 0; r < rows.length - 1; r++) for (let j = 0; j < RS; j++) { if (open(j)) continue; const a = r * (RS + 1) + j; const b = a + RS + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    if (!o.gap) for (const [r, up] of [[0, false], [rows.length - 1, true]]) { const c = pos.length / 3; pos.push(0, rows[r][0], 0); uv.push(0.5, up ? 1 : 0); for (let j = 0; j < RS; j++) { const a = r * (RS + 1) + j; if (up) idx.push(a, c, a + 1); else idx.push(a, a + 1, c); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const nr = g.attributes.normal; for (let r = 0; r < rows.length; r++) { const a = r * (RS + 1); const b = a + RS; const x = nr.getX(a) + nr.getX(b); const y = nr.getY(a) + nr.getY(b); const z = nr.getZ(a) + nr.getZ(b); const l = Math.hypot(x, y, z) || 1; nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l); }
    g.userData.rows = rows; return g;
  });
  const gauss = (v, m, sd) => Math.exp(-(((v - m) / sd) ** 2));
  // hair that falls in strands: ridges around the head and an uneven bottom edge
  const strands = (geo, amp, freq) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); const z = p.getZ(i); const a = Math.atan2(x, z); const k = 1 + amp * Math.pow(Math.abs(Math.sin(a * freq)), 0.7) + amp * 0.6 * Math.sin(a * freq * 0.37 + 1); p.setXYZ(i, x * k, p.getY(i) + (p.getY(i) < -0.05 ? 0.008 * Math.sin(a * 11) : 0), z * k); } geo.computeVertexNormals(); return geo; };
  const lathe = (k, pts, ps = 0, pl = Math.PI * 2, seg = 24) => G(k, () => new T.LatheGeometry(pts.map(([r, y]) => V2(Math.max(0.0001, r), y)), seg, ps, pl));
  const sph = (k, ...a) => G(`s${k}|${a.join('|')}`, () => new T.SphereGeometry(...a));
  const mesh = (geo, mat, par, x = 0, y = 0, z = 0, sh = false) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = sh; m.receiveShadow = false; par.add(m); return m; };
  const blob = (mat, par, sx, sy, sz, x, y, z, sh) => { const m = mesh(sph('u', 1, 18, 14), mat, par, x, y, z, sh); m.scale.set(sx, sy, sz); return m; };
  const grp = (par, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); par.add(g); return g; };

  // the head: an egg shape with a jaw, a chin and the back of the skull; hair and beards follow the same surface
  const HR = { x: 0.083, y: 0.117, z: 0.098 };
  const headPt = (d, shape, inf = 0) => {
    const { x, y, z } = d; let sx = HR.x; let sy = HR.y; let sz = HR.z;
    const jaw = shape === 'round' ? 0.15 : shape === 'square' ? 0.05 : 0.27;
    if (y < 0) { const t = Math.pow(-y, 1.6); sx *= 1 - jaw * t; sz *= 1 - 0.16 * t * (z < 0 ? 1.7 : 0.3); if (shape === 'square' && y < -0.55) sy *= 0.95; if (shape === 'round') sy *= 0.97; }
    if (y < -0.6 && z > 0.3) sz *= 1 + 0.22 * (-y - 0.6);
    if (z < 0 && y > -0.4) sz *= 1 + 0.07 * (1 - Math.abs(y));
    if (z > 0.3 && y > 0.1) sz *= 1 - 0.05 * y;
    if (y < -0.05 && y > -0.5 && Math.abs(x) > 0.4 && z > 0.2) sx *= 1.03;
    return new T.Vector3(x * (sx + inf), y * (sy + inf), z * (sz + inf));
  };
  const dir = (x, y, z) => new T.Vector3(x, y, z).normalize();
  // shell(): a piece of the head surface. tilt turns the cut (hairline higher in front), keep() drops triangles, bump() makes curls
  const shell = (key, shape, inf, o = {}) => G(`h${key}|${shape}|${inf}`, () => {
    const g = new T.SphereGeometry(1, o.ws || 40, o.hs || 28, 0, Math.PI * 2, 0, o.tl || Math.PI); const p = g.attributes.position; const v = new T.Vector3(); const dirs = [];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize(); if (o.tilt) v.applyAxisAngle(X, o.tilt); dirs.push(v.clone());
      const q = headPt(v, shape, inf + (o.bump ? o.bump(v) : 0)); if (o.flare && v.y < 0) { q.x *= 1 + o.flare * -v.y; q.z *= 1 + o.flare * -v.y; } p.setXYZ(i, q.x, q.y, q.z);
    }
    if (o.tint) { const col = []; for (const d of dirs) col.push(...o.tint(d)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); }
    if (o.keep) { const idx = g.index.array; const out = []; for (let i = 0; i < idx.length; i += 3) { const c = dirs[idx[i]].clone().add(dirs[idx[i + 1]]).add(dirs[idx[i + 2]]).normalize(); if (o.keep(c)) out.push(idx[i], idx[i + 1], idx[i + 2]); } g.setIndex(out); }
    g.computeVertexNormals(); return g;
  });
  const eyeTex = (c) => {
    const k = `eye${c}`; if (texs[k]) return texs[k];
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d', { willReadFrequently: true });
    const sc = g.createRadialGradient(64, 64, 20, 64, 64, 110); sc.addColorStop(0, '#f6f2ee'); sc.addColorStop(0.6, '#efe6e0'); sc.addColorStop(1, '#e2c4bd'); g.fillStyle = sc; g.fillRect(0, 0, 256, 128);
    const ir = g.createRadialGradient(64, 64, 6, 64, 64, 24); ir.addColorStop(0, mix(c, '#000000', 0.35)); ir.addColorStop(0.35, mix(c, '#ffffff', 0.25)); ir.addColorStop(0.8, c); ir.addColorStop(1, mix(c, '#000000', 0.6)); g.fillStyle = ir; g.beginPath(); g.arc(64, 64, 24, 0, Math.PI * 2); g.fill();
    let sd = 9; const rn = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let i = 0; i < 90; i++) { const a = rn() * Math.PI * 2; g.strokeStyle = rn() < 0.5 ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.18)'; g.lineWidth = 0.8 + rn(); g.beginPath(); g.moveTo(64 + Math.cos(a) * 8, 64 + Math.sin(a) * 8); g.lineTo(64 + Math.cos(a) * 23, 64 + Math.sin(a) * 23); g.stroke(); }
    g.strokeStyle = 'rgba(10,8,6,.75)'; g.lineWidth = 2.5; g.beginPath(); g.arc(64, 64, 23.5, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#060504'; g.beginPath(); g.arc(64, 64, 8.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(71, 56, 3.6, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(57, 71, 1.8, 0, Math.PI * 2); g.fill();
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return (texs[k] = t);
  };
  const fuzzMs = {}; const fuzzM = (c) => { if (fuzzMs[c]) return fuzzMs[c]; if (!texs.fuzz) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 128); let sd = 5; const rn = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }; for (let i = 0; i < 1400; i++) { const x = rn() * 256; const l = 40 + rn() * 88; g.strokeStyle = `rgba(255,255,255,${0.5 + rn() * 0.5})`; g.lineWidth = 0.7 + rn(); g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + (rn() - 0.5) * 6, l / 2, x + (rn() - 0.5) * 10, l); g.stroke(); } texs.fuzz = new T.CanvasTexture(cv); texs.fuzz.wrapS = T.RepeatWrapping; texs.fuzz.repeat.set(2, 1); }
    const m = new T.MeshStandardMaterial({ color: lin(c), roughness: 0.45, map: pattern('hair'), alphaMap: texs.fuzz, alphaTest: 0.45, side: T.DoubleSide }); return (fuzzMs[c] = m); };
  const eyeMs = {}; const eyeM = (c) => eyeMs[c] || (eyeMs[c] = new T.MeshStandardMaterial({ map: eyeTex(c), roughness: 0.06, envMapIntensity: 1.4 }));
  const darker = (c, f) => { const o = new T.Color(c); o.multiplyScalar(f); return `#${o.getHexString()}`; };
  const mix = (a, b, t) => { const o = new T.Color(a).lerp(new T.Color(b), t); return `#${o.getHexString()}`; };

  // merge(): bake several meshes (geometry + matrix) into one geometry
  const merge = (items) => {
    let nv = 0; let ni = 0; for (const { geo } of items) { nv += geo.attributes.position.count; ni += geo.index ? geo.index.count : geo.attributes.position.count; }
    const pos = new Float32Array(nv * 3); const nor = new Float32Array(nv * 3); const uv = new Float32Array(nv * 2); const idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
    let vo = 0; let io = 0; const v = new T.Vector3(); const nm = new T.Matrix3();
    for (const { geo, m4 } of items) {
      nm.getNormalMatrix(m4); const P = geo.attributes.position; const N = geo.attributes.normal; const U = geo.attributes.uv;
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m4); pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z; if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z; } if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); } }
      if (geo.index) { const I = geo.index.array; for (let k = 0; k < I.length; k++) idx[io + k] = I[k] + vo; io += I.length; } else { for (let k = 0; k < P.count; k++) idx[io + k] = vo + k; io += P.count; }
      vo += P.count;
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(new T.BufferAttribute(idx, 1)); g.computeBoundingSphere(); g.userData.merged = 1; return g;
  };
  function compact(root) {
    const pars = []; root.traverse((o) => { if (o.children.length) pars.push(o); });
    for (const par of pars) {
      const by = new Map(); for (const m of par.children) if (m.isMesh && !m.userData.keep && !Array.isArray(m.material)) { m.updateMatrix(); const k = m.material.uuid; if (!by.has(k)) by.set(k, []); by.get(k).push(m); }
      for (const list of by.values()) { if (list.length < 2) continue; const mm = new T.Mesh(merge(list.map((m) => ({ geo: m.geometry, m4: m.matrix }))), list[0].material); mm.castShadow = list.some((m) => m.castShadow); par.add(mm); list.forEach((m) => par.remove(m)); }
    }
  }
  // mergeStatic(): the same for a whole street or room, in the group's own space (skips moving things)
  function mergeStatic(root) {
    root.updateMatrixWorld(true); const inv = new T.Matrix4().copy(root.matrixWorld).invert(); const by = new Map(); const kill = [];
    const walk = (o) => { if (o.userData.dyn) return; if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && !o.userData.keep) { const k = o.material.uuid; if (!by.has(k)) by.set(k, []); by.get(k).push(o); kill.push(o); } o.children.slice().forEach(walk); };
    root.children.slice().forEach(walk);
    for (const list of by.values()) { if (list.length < 2) { kill.splice(kill.indexOf(list[0]), 1); continue; } const mm = new T.Mesh(merge(list.map((m) => ({ geo: m.geometry, m4: new T.Matrix4().multiplyMatrices(inv, m.matrixWorld) }))), list[0].material); mm.castShadow = list.some((m) => m.castShadow); mm.receiveShadow = true; root.add(mm); }
    kill.forEach((m) => m.parent && m.parent.remove(m));
  }
  function build(look) {
    const L = { ...LOOK0, ...look }; const f = L.sex === 'f';
    const root = new T.Group(); const u = { L };
    const wt = L.w; const sw = f ? 0.9 : 1; const hw = f ? 1.1 : 1; const lw = (f ? 1.04 : 1) * (0.85 + 0.15 * wt);
    const skin = M(L.skin, { r: 0.5, e: 0.05, t: 'skin' }); const faceM = M(L.skin, { r: 0.48, e: 0.05, t: 'skin', vc: 1 }); const skinD = M(darker(L.skin, 0.9), { r: 0.6, e: 0.08 });
    const fab = (c, t = 'cotton') => M(c, { r: 0.9, t }); const top = fab(L.topC, L.top === 'sweater' ? 'knit' : 'cotton'); const top2 = fab(L.top2);
    const pants = fab(L.botC, L.bottom === 'jeans' ? 'denim' : 'cotton'); const hairM = M(L.hairC, { r: 0.42, t: 'hair' }); const hairDS = M(L.hairC, { r: 0.42, t: 'hair', ds: 1 });
    const dress = L.top === 'dress'; const skirt = !dress && L.bottom === 'skirt'; const longSl = ['shirt', 'sweater', 'hoodie', 'jacket', 'coat'].includes(L.top); const sleeve = L.top === 'jacket' || L.top === 'coat' ? top : top;
    const legSkin = dress || skirt || L.bottom === 'shorts';
    const scale = (f ? 0.95 : 1) * L.h; root.scale.setScalar(scale); u.scale = scale;
    // hips, legs
    const hips = grp(root, 0, 0.965, 0); u.hips = hips; u.hipY = 0.965;
    const pelvisC = dress ? top : skirt ? fab(L.botC) : pants;
    const pw2 = hw * wt; const bt = f ? 0.022 : 0.012;
    mesh(bodyGeo(`pel${f}${wt}`, [[-0.125, 0.045, 0.045, 0.05], [-0.105, 0.11 * pw2, 0.075, 0.085], [-0.065, 0.148 * pw2, 0.085, 0.1], [-0.02, 0.158 * pw2, 0.088, 0.1], [0.03, 0.152 * pw2, 0.088 * wt, 0.092], [0.075, 0.14 * wt, 0.088 * wt, 0.088], [0.1, 0.135 * wt, 0.087 * wt, 0.086]],
      { extra: (y, a) => [0, -bt * gauss(y, -0.055, 0.04) * (gauss(a, Math.PI - 0.5, 0.45) + gauss(a, -Math.PI + 0.5, 0.45) + gauss(Math.abs(a), Math.PI, 0.6) * 0.6)] }), pelvisC, hips, 0, 0, 0, true);
    const legs = [1, -1].map((s) => {
      const lg = grp(hips, s * 0.085 * hw, -0.05, 0);
      const thighC = legSkin ? skin : pants; const tr = legSkin ? [0.072, 0.05] : L.bottom === 'jeans' ? [0.078, 0.056] : [0.082, 0.06];
      mesh(limb(tr[0] * lw, tr[1] * lw, 0.42), thighC, lg, 0, 0, 0, true);
      if (L.bottom === 'shorts' && !dress) mesh(limb(0.088 * lw, 0.074 * lw, 0.2), pants, lg);
      const kn = grp(lg, 0, -0.42, 0); const sr = legSkin ? [0.056, 0.034] : L.bottom === 'jeans' ? [0.055, 0.042] : [0.058, 0.05];
      mesh(limb(sr[0] * lw, sr[1] * lw, 0.4), legSkin ? skin : pants, kn, 0, 0, 0, true);
      const an = grp(kn, 0, -0.42, 0); const shoe = L.shoes === 'shoes' ? M(L.shoeC, { r: 0.32 }) : M(L.shoeC, { r: 0.7 });
      if (L.shoes === 'boots') mesh(G('boot', () => new T.CylinderGeometry(0.052, 0.048, 0.2, 14)), shoe, an, 0, 0.05, 0);
      blob(shoe, an, 0.046, 0.042, 0.11, 0, -0.033, 0.048, true); blob(shoe, an, 0.044, 0.045, 0.05, 0, -0.03, -0.02);
      if (L.shoes === 'sneaker') for (const s2 of [1, -1]) { const st = mesh(G('stripe', () => new T.BoxGeometry(0.003, 0.018, 0.09)), M(L.shoeC === '#f4f6f8' ? '#2459c4' : '#f4f6f8', { r: 0.6 }), an, s2 * 0.046, -0.04, 0.04); st.rotation.x = 0.35; }
      const sole = mesh(G('sole', () => new T.BoxGeometry(0.098, 0.024, 0.245)), L.shoes === 'sneaker' ? M('#f1efe9', { r: 0.8 }) : M('#2a2420', { r: 0.6 }), an, 0, -0.064, 0.045); sole.castShadow = true;
      return { lg, kn, an };
    });
    [u.lL, u.lR] = legs.map((l) => l.lg); [u.kL, u.kR] = legs.map((l) => l.kn); [u.fL, u.fR] = legs.map((l) => l.an);
    if (dress || skirt) { const sk = mesh(lathe(`sk${dress}${hw}${wt}`, [[0.16 * hw * wt, 0.07], [0.175 * hw * wt, -0.05], [0.21 * hw * wt, -0.22], [0.25 * hw * wt, dress ? -0.42 : -0.38]], 0, Math.PI * 2, 28), M(dress ? L.topC : L.botC, { r: 0.9, ds: 1 }), hips, 0, 0, 0, true); sk.scale.z = 0.86; u.skirt = sk; sk.userData.keep = 1; }
    if (!dress && !skirt && L.top !== 'jacket' && L.top !== 'coat') { const belt = mesh(G('belt', () => new T.TorusGeometry(0.15, 0.012, 6, 28)), M('#2a2420', { r: 0.5 }), hips, 0, 0.06, 0); belt.rotation.x = Math.PI / 2; belt.scale.set(wt, 0.72 * wt, 1); }
    // upper body
    const spine = grp(hips, 0, 0.06, 0); u.spine = spine;
    // torso: waist, ribcage, chest, shoulder blades and the slope of the shoulders
    const bw = wt; const belly = Math.max(0, wt - 1) * 0.08;
    const torsoP = (f ? [[-0.08, 0.13, 0.086, 0.088], [-0.02, 0.126, 0.084, 0.084], [0.06, 0.116, 0.078 + belly * 0.6, 0.078], [0.14, 0.124, 0.082, 0.082], [0.22, 0.14, 0.09, 0.09], [0.29, 0.152, 0.088, 0.094], [0.35, 0.162, 0.08, 0.092], [0.395, 0.158, 0.068, 0.078], [0.425, 0.11, 0.05, 0.058], [0.443, 0.055, 0.04, 0.042], [0.452, 0.04, 0.032, 0.034]]
      : [[-0.08, 0.13, 0.088, 0.09], [-0.02, 0.138, 0.09 + belly, 0.086], [0.06, 0.142, 0.09 + belly, 0.082], [0.14, 0.15, 0.092 + belly * 0.5, 0.086], [0.22, 0.165, 0.1, 0.096], [0.29, 0.18, 0.104, 0.102], [0.35, 0.19, 0.094, 0.1], [0.395, 0.184, 0.078, 0.086], [0.43, 0.125, 0.056, 0.062], [0.452, 0.06, 0.044, 0.046], [0.462, 0.045, 0.036, 0.038]]).map(([y, w, a, b]) => [y, w * bw, a * bw, b * bw]);
    const bust = f ? 0.032 * bw : 0; const pecs = f ? 0 : 0.006;
    const tExtra = (y, a) => [0, bust * gauss(y, 0.255, 0.045) * (gauss(a, 0.5, 0.36) + gauss(a, -0.5, 0.36)) + pecs * gauss(y, 0.3, 0.04) * (gauss(a, 0.45, 0.4) + gauss(a, -0.45, 0.4)) - 0.006 * gauss(y, 0.3, 0.05) * gauss(Math.abs(a), Math.PI, 0.25)];
    const inner = L.top === 'jacket' || L.top === 'coat' ? top2 : top;
    const torG = bodyGeo(`tor${f}${wt}`, torsoP, { extra: tExtra }); mesh(torG, inner, spine, 0, 0, 0, true);
    const frontZ = (y) => { const rows = torG.userData.rows; let z = 0.09; for (let i = 1; i < rows.length; i++) if (rows[i][0] >= y) { z = rows[i][2] + tExtra(rows[i][0], 0)[1]; break; } return z; };
    
    if (L.top === 'jacket' || L.top === 'coat') {
      const longC = L.top === 'coat'; const low = longC ? [[-0.56, 0.205 * hw * wt, 0.13, 0.15], [-0.36, 0.188 * hw * wt, 0.115, 0.135], [-0.17, 0.172 * hw * wt, 0.105, 0.118]] : [[-0.14, 0.168 * hw * wt, 0.102, 0.11]];
      const jp = low.concat(torsoP.slice(0, -2).map(([y, w, a, b]) => [y, y < 0.03 ? Math.max(w + 0.012, 0.172 * hw * wt) : w + 0.012, (y < 0.03 ? Math.max(a, 0.094) : a) + 0.016 + (f ? bust * gauss(y, 0.255, 0.05) : 0), (y < 0.03 ? Math.max(b, 0.104) : b) + 0.012]), [[0.44, 0.075, 0.05, 0.06]]);
      mesh(bodyGeo(`jk${longC}${f}${wt}`, jp, { gap: 0.55 }), M(L.topC, { r: 0.85, ds: 1, t: 'cotton' }), spine, 0, 0, 0, true);

    }
    if (L.top === 'shirt' || L.top === 'coat') { const col = mesh(G('collar', () => new T.TorusGeometry(0.058, 0.013, 6, 20)), L.top === 'coat' ? top2 : top, spine, 0, 0.435, 0); col.rotation.x = Math.PI / 2 - 0.25; col.scale.set(1, 0.82, 1); }
    if (L.top === 'shirt') { for (let k = 0; k < 5; k++) { const y = 0.38 - k * 0.085; mesh(sph('btn', 0.0055, 8, 6), M('#f4f1e6', { r: 0.3 }), spine, 0, y, frontZ(y) + 0.003); } mesh(G('placket', () => new T.BoxGeometry(0.02, 0.42, 0.004)), M(darker(L.topC, 0.93), { r: 0.9 }), spine, 0, 0.2, frontZ(0.2) + 0.001); if (!f) { const pk = mesh(G('spocket', () => new T.BoxGeometry(0.06, 0.07, 0.006)), M(darker(L.topC, 0.94), { r: 0.9 }), spine, 0.07, 0.3, frontZ(0.3) + 0.002); pk.rotation.y = 0.25; } }
    if (L.top === 'tshirt' || L.top === 'sweater' || L.top === 'dress') { const nk = mesh(G('crew', () => new T.TorusGeometry(0.052, 0.008, 6, 20)), top, spine, 0, 0.44, 0.004); nk.rotation.x = Math.PI / 2 - 0.2; nk.scale.set(1, 0.85, 1); }
    if (L.top === 'hoodie') { blob(top, spine, 0.11, 0.06, 0.075, 0, 0.43, -0.085); for (const s2 of [1, -1]) mesh(G('cord', () => new T.CylinderGeometry(0.003, 0.003, 0.12, 5)), M('#f4f1e6', { r: 0.8 }), spine, s2 * 0.03, 0.36, frontZ(0.36) + 0.006); const pk = mesh(G('pocket', () => new T.BoxGeometry(0.2, 0.09, 0.012)), M(darker(L.topC, 0.88), { r: 0.9 }), spine, 0, 0.08, frontZ(0.08)); pk.rotation.x = -0.08; }
    if (L.tie) { const tie = mesh(G('tie', () => new T.CylinderGeometry(0.012, 0.03, 0.24, 4)), M('#cf343a', { r: 0.6 }), spine, 0, 0.3, frontZ(0.3) + 0.006); tie.rotation.y = Math.PI / 4; tie.scale.z = 0.25; }
    if (L.neck) { const sc = mesh(G('scarf', () => new T.TorusGeometry(0.07, 0.03, 8, 20)), M(L.neckC, { r: 0.95, t: 'knit' }), spine, 0, 0.44, 0); sc.rotation.x = Math.PI / 2; sc.scale.set(1, 0.85, 1); }
    if (L.bag) {
      const bm = M(L.bagC, { r: 0.8 }); const bk = mesh(G('bag', () => new T.BoxGeometry(0.26, 0.32, 0.12)), bm, spine, 0, 0.2, -frontZ(0.2) - 0.06, true); bk.rotation.x = 0.05;
      for (const s of [1, -1]) mesh(G('strap', () => new T.BoxGeometry(0.03, 0.3, 0.012)), bm, spine, s * 0.075, 0.27, frontZ(0.27) + 0.008);
    }
    // arms
    const arms = [1, -1].map((s) => {
      const ar = grp(spine, s * (f ? 0.152 : 0.172) * wt, 0.392, 0);
      mesh(sph('sho', 0.049, 14, 10), longSl || L.top === 'tshirt' || dress ? (L.top === 'jacket' || L.top === 'coat' ? M(L.topC, { r: 0.85, t: 'cotton' }) : top) : top, ar, 0, -0.01, 0, true);
      if (longSl) mesh(limb(0.05 * lw, 0.043 * lw, 0.28), sleeve === top && (L.top === 'jacket' || L.top === 'coat') ? M(L.topC, { r: 0.85, t: 'cotton' }) : top, ar, 0, 0, 0, true);
      else { mesh(limb(0.045 * lw, 0.037 * lw, 0.28), skin, ar, 0, 0, 0, true); mesh(limb(0.056 * lw, 0.051 * lw, 0.12), top, ar); const hem = mesh(G('hem', () => new T.TorusGeometry(0.05, 0.004, 5, 18)), M(darker(L.topC, 0.9), { r: 0.9 }), ar, 0, -0.118, 0); hem.rotation.x = Math.PI / 2; hem.scale.set(lw, lw, 1); }
      const el = grp(ar, 0, -0.28, 0);
      mesh(limb((longSl ? 0.043 : 0.037) * lw, (longSl ? 0.036 : 0.029) * lw, 0.25), longSl ? (L.top === 'jacket' || L.top === 'coat' ? M(L.topC, { r: 0.85, t: 'cotton' }) : top) : skin, el, 0, 0, 0, true);
      const hd = grp(el, 0, -0.255, 0);
      blob(skin, hd, 0.0125, 0.042, 0.026, 0, -0.042, 0, true);
      for (let i = 0; i < 4; i++) { const fg = mesh(limb(0.0062, 0.0052, [0.04, 0.047, 0.045, 0.036][i]), skin, hd, -s * 0.002, -0.075, (1.5 - i) * 0.0118); fg.rotation.z = -s * 0.22; fg.rotation.x = (1.5 - i) * 0.05; }
      const th = mesh(limb(0.0078, 0.0062, 0.036), skin, hd, -s * 0.006, -0.032, 0.024); th.rotation.x = -0.75; th.rotation.z = -s * 0.35;
      if (L.watch && s === 1) { const w = mesh(G('watch', () => new T.TorusGeometry(0.032, 0.006, 6, 14)), M('#2a2420', { r: 0.4, m: 0.3 }), el, 0, -0.225, 0); w.rotation.x = Math.PI / 2; }
      return { ar, el, hd };
    });
    [u.aL, u.aR] = arms.map((a) => a.ar); [u.eL, u.eR] = arms.map((a) => a.el); [u.hL, u.hR] = arms.map((a) => a.hd);
    // neck and head
    const neck = grp(spine, 0, 0.44, 0); u.neck = neck;
    mesh(G(`neck${f}`, () => new T.CylinderGeometry(f ? 0.037 : 0.043, f ? 0.045 : 0.054, 0.14, 18)), skin, neck, 0, 0.025, -0.004, true);
    const head = grp(neck, 0, 0.075, 0); u.head = head; const hc = grp(head, 0, 0.088, 0.012); hc.scale.setScalar(1.08); u.hc = hc;
    const shaved = !f && (L.beard === 'none' || L.beard === 'moustache');
    const tint = (d) => {
      let r = 1; let g = 1; let b = 1; const near = (x, y, z, rad) => { const q = d.distanceTo(dir(x, y, z)); return q < rad ? 1 - q / rad : 0; };
      for (const sg of [1, -1]) { const e = near(sg * 0.36, 0.12, 0.93, 0.27) ** 2; r -= 0.15 * e; g -= 0.2 * e; b -= 0.17 * e; const ck = near(sg * 0.6, -0.22, 0.77, 0.34); r += 0.05 * ck; g -= 0.06 * ck; b -= 0.05 * ck; }
      const ns = near(0, -0.15, 1, 0.24); r += 0.04 * ns; g -= 0.04 * ns; b -= 0.04 * ns; const lp = near(0, -0.5, 0.87, 0.2); r += 0.03 * lp; g -= 0.05 * lp; b -= 0.04 * lp;
      if (d.y < -0.72) { const t2 = Math.min(1, (-d.y - 0.72) * 2.5); r -= 0.14 * t2; g -= 0.15 * t2; b -= 0.13 * t2; }
      if (d.y > 0.55 && d.z > 0) { r += 0.02; g += 0.02; b += 0.02; }
      if (shaved && d.y < -0.32 && d.z > -0.3) { const j = Math.min(1, (-d.y - 0.32) * 3) * (1 - lp); r -= 0.08 * j; g -= 0.06 * j; b -= 0.02 * j; }
      return [r, g, b];
    };
    mesh(shell(`head${shaved}`, L.face, 0, { tint, ws: 48, hs: 36 }), faceM, hc, 0, 0, 0, true);
    // ears
    for (const s of [1, -1]) { const e = headPt(dir(s, 0.02, -0.08), L.face); const ear = blob(skinD, hc, 0.008, 0.027, 0.017, e.x + s * 0.004, e.y, e.z); ear.rotation.y = s * 0.35; const ein = blob(M(darker(L.skin, 0.78), { r: 0.6 }), hc, 0.004, 0.017, 0.01, e.x + s * 0.0085, e.y + 0.001, e.z + 0.002); ein.rotation.y = s * 0.35; if (L.ear) mesh(sph('ear', 0.0055, 8, 6), M('#e8c35a', { r: 0.25, m: 0.9 }), hc, e.x + s * 0.006, e.y - 0.026, e.z + 0.004); }
    // eyes with lids that blink
    u.lids = []; u.eyes = [];
    for (const s of [1, -1]) {
      const p = headPt(dir(s * 0.36, 0.1, 0.93), L.face); const eg = grp(hc, p.x, p.y, p.z - 0.008); const es = 0.0132 * L.eyeS;
      const eye = mesh(sph(`eye${L.eyeS}`, es, 20, 14), eyeM(L.eye), eg); eye.rotation.y = s * 0.05; eye.userData.keep = 1; u.eyes.push(eye);
      const lid = mesh(sph(`lid${L.eyeS}`, es * 1.1, 16, 8, 0, Math.PI * 2, 0, 1.25), skin, eg); lid.rotation.x = -0.18; lid.userData.keep = 1; u.lids.push(lid);
      const lo = mesh(sph(`lidlo${L.eyeS}`, es * 1.1, 16, 6, 0, Math.PI * 2, 2.35, 0.8), skin, eg); lo.rotation.x = -0.1;
      const lash = mesh(G(`lash${f}${L.eyeS}`, () => new T.TorusGeometry(es * 1.12, f ? 0.0019 : 0.0011, 4, 14, Math.PI)), M('#120d0a', { r: 0.6 }), eg, 0, 0.0008, 0.001); lash.rotation.x = 1.3;
      const lo2 = mesh(G(`lashlo${L.eyeS}`, () => new T.TorusGeometry(es * 1.08, 0.0007, 3, 12, Math.PI)), M(darker(L.skin, 0.62), { r: 0.7 }), eg, 0, -0.0005, 0.001); lo2.rotation.x = -1.75;
      const bw = L.brow; const bc = M(L.beardC || darker(L.hairC, 0.8), { r: 0.7 });
      const pts = [dir(s * 0.16, 0.33, 0.93), dir(s * 0.36, 0.38, 0.85), dir(s * 0.56, 0.31, 0.77)].map((d) => headPt(d, L.face, 0.002));
      mesh(G(`brow${s}${L.face}${bw}`, () => { const tg = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 12, 0.0045 * bw, 6, false); const p = tg.attributes.position; const ring = 7; for (let i = 0; i < p.count; i++) { const sgm = Math.floor(i / ring); const t2 = sgm / 12; const c = new T.Vector3(); for (let k = 0; k < ring; k++) c.add(new T.Vector3().fromBufferAttribute(p, sgm * ring + k)); c.divideScalar(ring); const v = new T.Vector3().fromBufferAttribute(p, i).sub(c).multiplyScalar(1.15 - 0.75 * t2); v.y *= 0.75; p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z); } tg.computeVertexNormals(); return tg; }), bc, hc);
    }
    // nose
    { const p = headPt(dir(0, 0.07, 1), L.face); const n = grp(hc, p.x, p.y, p.z - 0.004); const S = L.noseS; const W = L.noseW; const Ln = 0.04 * L.noseL; const ty = L.nose;
      const ridge = blob(skin, n, 0.0068 * W * S, Ln * 0.55, 0.0105 * S, 0, -Ln * 0.5, ty === 'breit' ? 0 : 0.002); ridge.rotation.x = ty === 'stups' ? -0.16 : -0.24;
      if (ty === 'adler') blob(skin, n, 0.0062 * W * S, 0.01, 0.008 * S, 0, -Ln * 0.42, 0.0085 * S);
      const tipZ = (ty === 'stups' ? 0.016 : ty === 'breit' ? 0.011 : 0.0145) * S; const tipY = ty === 'stups' ? -Ln * 0.88 : ty === 'adler' ? -Ln * 1.02 : -Ln * 0.95;
      const tip = blob(skin, n, (ty === 'breit' ? 0.012 : 0.0094) * W * S, (ty === 'adler' ? 0.0102 : 0.0088) * S, 0.0094 * S, 0, tipY, tipZ); if (ty === 'stups') tip.rotation.x = -0.4;
      for (const s of [1, -1]) blob(skin, n, 0.0068 * S, 0.0062 * S, 0.0068 * S, s * (ty === 'breit' ? 0.0145 : 0.0102) * W * S, -Ln * 0.96, 0.001);
    }
    // mouth
    { const p = headPt(dir(0, -0.5, 0.87), L.face); const m = grp(hc, p.x, p.y, p.z - 0.004); u.mouth = m; const lc = mix(L.skin, L.lipC, f ? 0.75 : 0.35); const lm = M(lc, { r: 0.45 }); const lw2 = L.lips;
      blob(lm, m, 0.019 * lw2, 0.0038 * lw2, 0.0075, 0, 0.003, 0); u.lipLo = blob(lm, m, 0.017 * lw2, 0.0049 * lw2, 0.0082, 0, -0.0037, 0); u.lipLo.userData.keep = 1; u.lipY = -0.0037;
      u.inner = blob(M('#3a1518', { r: 0.9 }), m, 0.015 * lw2, 0.0012, 0.006, 0, -0.0004, -0.001); u.inner.userData.keep = 1;
    }
    // beard
    const bC = L.beardC || L.hairC; const nearMouth = (d) => d.distanceTo(dir(0, -0.5, 0.87)) < 0.17;
    const jaw = (d, y0, side) => ((d.y < y0 && d.z > -0.25) || (Math.abs(d.x) > side && d.y < 0.02 && d.y > -0.95 && d.z > -0.35 && d.z < 0.55));
    const beardKeep = { stubble: (d) => jaw(d, -0.45, 0.74) && !nearMouth(d), short: (d) => jaw(d, -0.42, 0.72) && !nearMouth(d),
      full: (d) => jaw(d, -0.34, 0.64) && !(d.distanceTo(dir(0, -0.5, 0.87)) < 0.14), goatee: (d) => d.y < -0.66 && Math.abs(d.x) < 0.36 && d.z > 0.2 };
    if (beardKeep[L.beard]) mesh(shell(`b${L.beard}`, L.face, { stubble: 0.0015, short: 0.0045, full: 0.011, goatee: 0.006 }[L.beard], { keep: beardKeep[L.beard], flare: L.beard === 'full' ? 0.05 : 0 }), L.beard === 'stubble' ? M(bC, { r: 0.9, op: 0.55 }) : M(bC, { r: 0.6, t: 'hair' }), hc);
    if (L.beard === 'moustache' || L.beard === 'goatee' || L.beard === 'full' || L.beard === 'short') { const m2 = blob(M(bC, { r: 0.6, t: 'hair' }), u.mouth, 0.024, 0.0065, 0.009, 0, 0.012, 0.002); m2.rotation.x = 0.2; }
    // hair
    const H = L.hair; const shp = L.face;
    const curtain = (k, yb, rb, gap) => { const m = mesh(G(`cu${k}`, () => strands(new T.LatheGeometry([[0.1, 0.06], [0.104, 0.02], [0.108, -0.04], [0.112, (yb + 0.04) / 2], [rb, yb], [rb - 0.012, yb - 0.006]].map(([r, y]) => V2(r, y)), 48, gap / 2, Math.PI * 2 - gap), 0.045, 17)), hairDS, hc, 0, 0, -0.004); m.scale.x = 0.88; return m; };
    const lock = (v) => 0.0026 * Math.pow(Math.abs(Math.sin(Math.atan2(v.x, v.z) * 23 + v.y * 4)), 0.6);
    if (H === 'short') { mesh(shell('short', shp, 0.008, { tl: 1.78, tilt: -0.92, ws: 56, hs: 32, bump: lock }), hairM, hc); mesh(shell('shortF', shp, 0.0125, { tl: 1.8, tilt: -0.92, ws: 56, hs: 32, bump: lock }), fuzzM(L.hairC), hc); }
    if (H === 'buzz') mesh(shell('buzz', shp, 0.003, { tl: 1.78, tilt: -0.95 }), M(L.hairC, { r: 0.8, op: 0.92 }), hc);
    if (H === 'side') { mesh(shell('side', shp, 0.009, { tl: 1.78, tilt: -0.88, ws: 56, hs: 32, bump: lock }), hairM, hc); mesh(shell('sideF', shp, 0.0135, { tl: 1.8, tilt: -0.88, ws: 56, hs: 32, bump: lock }), fuzzM(L.hairC), hc); if (L.hat === 'none') blob(hairM, hc, 0.052, 0.02, 0.06, 0.026, 0.108, 0.035).rotation.z = -0.3; }
    if (H === 'curly') mesh(shell('curly', shp, 0.014, { tl: 1.88, tilt: -0.9, bump: (v) => 0.009 * Math.abs(Math.sin(v.x * 23) * Math.sin(v.y * 23) * Math.sin(v.z * 23)) }), hairM, hc);
    if (H === 'afro') mesh(shell('afro', shp, 0.042, { tl: 2.1, tilt: -1.08, ws: 48, hs: 32, bump: (v) => 0.01 * Math.abs(Math.sin(v.x * 19) * Math.sin(v.y * 19) * Math.sin(v.z * 19)) }), hairM, hc);
    if (H === 'long' || H === 'bob' || H === 'ponytail' || H === 'bun') mesh(shell('cap', shp, 0.008, { tl: 1.86, tilt: -0.86, ws: 56, hs: 32, bump: lock }), hairM, hc); mesh(shell('capF', shp, 0.0125, { tl: 1.88, tilt: -0.86, ws: 56, hs: 32, bump: lock }), fuzzM(L.hairC), hc);
    if (H === 'long') curtain('long', -0.27, 0.124, 2.5);
    if (H === 'bob') curtain('bob', -0.09, 0.122, 1.9);
    if (H === 'ponytail') { const tl = grp(hc, 0, 0.03, -0.1); mesh(limb(0.026, 0.012, 0.2), hairM, tl); tl.rotation.x = 0.35; mesh(G('ptie', () => new T.TorusGeometry(0.02, 0.006, 6, 12)), M('#cf343a', { r: 0.5 }), tl, 0, -0.005, 0).rotation.x = Math.PI / 2; u.tail = tl; }
    if (H === 'bun') blob(hairM, hc, 0.045, 0.042, 0.045, 0, 0.1, -0.065);
    if (H === 'bald') mesh(shell('bald', shp, 0.004, { keep: (d) => d.z < 0.25 && d.y > -0.38 && d.y < 0.32 }), hairM, hc);
    if (H === 'hijab') {
      const hm = M(L.scarf, { r: 0.85, t: 'cotton', ds: 1 });
      mesh(shell('hijab', shp, 0.014, { ws: 72, hs: 56, keep: (d) => !(d.z > 0.18 && (d.x / 0.62) ** 2 + ((d.y + 0.16) / 0.7) ** 2 < 1) }), hm, hc);
      const dr = mesh(lathe('drape', [[0.075, -0.06], [0.09, -0.12], [0.13, -0.2], [0.19, -0.27], [0.21, -0.3]], 0, Math.PI * 2, 28), hm, hc, 0, 0, -0.01); dr.scale.z = 0.82;
    }
    // hats and glasses
    const hatM = M(L.hatC, { r: 0.85, t: 'cotton' });
    if (L.hat === 'cap') { mesh(shell('capH', shp, 0.02, { tl: 1.55, tilt: -0.45 }), hatM, hc); const vz = mesh(G('visor', () => new T.CylinderGeometry(0.085, 0.085, 0.008, 20, 1, false, -0.95, 1.9)), hatM, hc, 0, 0.045, 0.035); vz.scale.z = 1.25; vz.rotation.x = 0.1; }
    if (L.hat === 'beanie') { mesh(shell('beanie', shp, 0.022, { tl: 1.66, tilt: -0.5 }), M(L.hatC, { r: 0.95, t: 'knit' }), hc); }
    if (L.hat === 'hat') { mesh(G('crown', () => new T.CylinderGeometry(0.078, 0.09, 0.1, 22)), hatM, hc, 0, 0.115, -0.005); mesh(G('brim', () => new T.CylinderGeometry(0.16, 0.16, 0.007, 26)), hatM, hc, 0, 0.068, -0.005); mesh(G('band', () => new T.CylinderGeometry(0.091, 0.091, 0.022, 22)), M('#13202b', { r: 0.6 }), hc, 0, 0.08, -0.005); }
    if (L.hat === 'chef') { const w = M('#ffffff', { r: 0.9 }); mesh(G('chef', () => new T.CylinderGeometry(0.095, 0.088, 0.13, 22)), w, hc, 0, 0.13, -0.01); blob(w, hc, 0.11, 0.06, 0.105, 0, 0.21, -0.01); }
    if (L.glasses !== 'none') {
      const gm = M(L.glasses === 'sun' ? '#13202b' : '#2a2420', { r: 0.35, m: 0.4 });
      for (const s of [1, -1]) {
        const p = headPt(dir(s * 0.36, 0.1, 0.93), L.face); const rim = mesh(G(`rim${L.glasses}`, () => (L.glasses === 'square' ? new T.TorusGeometry(0.021, 0.0018, 5, 4) : new T.TorusGeometry(0.019, 0.0018, 5, 22))), gm, hc, p.x, p.y, p.z + 0.012);
        if (L.glasses === 'square') { rim.rotation.z = Math.PI / 4; rim.scale.set(1.12, 0.86, 1); }
        if (L.glasses === 'sun') mesh(G('lens', () => new T.CircleGeometry(0.019, 20)), M('#10161c', { r: 0.1, m: 0.5, op: 0.85 }), hc, p.x, p.y, p.z + 0.012);
        const tm = mesh(G('temple', () => new T.BoxGeometry(0.003, 0.003, 0.1)), gm, hc, s * 0.079, p.y + 0.004, p.z - 0.04); tm.rotation.y = s * 0.12;
      }
      const pb = headPt(dir(0, 0.12, 1), L.face); mesh(G('bridge', () => new T.BoxGeometry(0.022, 0.003, 0.003)), gm, hc, 0, pb.y, pb.z + 0.006);
    }
    compact(root);
    root.traverse((o) => { if (o.isMesh) o.userData.human = true; });
    u.blink = 2 + Math.random() * 3; u.cur = {}; u.t = Math.random() * 10;
    root.userData.u = u; return root;
  }

  // poses: every joint eases toward the target angle of the current action
  const J = ['hipsY', 'hipsX', 'hipsY2', 'spX', 'spY', 'spZ', 'nkX', 'hdX', 'hdY', 'hdZ', 'aLx', 'aLz', 'aRx', 'aRz', 'aLy', 'aRy', 'eL', 'eR', 'lL', 'lR', 'lLz', 'lRz', 'kL', 'kR', 'fL', 'fR'];
  function pose(rootM, st, dt) {
    const u = rootM.userData.u; if (!u) return; u.t += dt; const t = u.t; const c = u.cur; const g = {};
    for (const k of J) g[k] = 0;
    g.aLz = 0.09; g.aRz = -0.09; g.eL = -0.12; g.eR = -0.12;
    const m = st.mode || 'idle'; const ph = st.ph || 0;
    if (m === 'idle' || m === 'talk' || m === 'look') {
      g.spX = 0.015 * Math.sin(t * 1.7); g.hipsY = 0.003 * Math.sin(t * 1.7); g.hdY = 0.18 * Math.sin(t * 0.37) * Math.sin(t * 0.13); g.hdX = 0.04 * Math.sin(t * 0.5);
      g.aLz = 0.09 + 0.015 * Math.sin(t * 1.7); g.aRz = -0.09 - 0.015 * Math.sin(t * 1.7); g.lLz = 0.03; g.lRz = -0.03;
      if (m === 'talk') { g.aRx = -0.5 + 0.25 * Math.sin(t * 3.1); g.eR = -0.9 + 0.3 * Math.sin(t * 4.3); g.aLx = -0.2 + 0.12 * Math.sin(t * 2.3 + 1); g.eL = -0.5; g.hdX = 0.06 * Math.sin(t * 5); g.hdZ = 0.05 * Math.sin(t * 1.9); g.hdY = 0.12 * Math.sin(t * 0.8); }
      if (m === 'look' && st.look) { g.hdY = st.look.y; g.hdX = st.look.x; g.spY = st.look.y * 0.3; }
    }
    if (m === 'walk' || m === 'run') {
      const r = m === 'run'; const A = r ? 0.95 : 0.52; const s = Math.sin(ph); const co = Math.cos(ph);
      g.lL = -s * A; g.lR = s * A; g.kL = (r ? 1.7 : 0.95) * Math.max(0, co) ** 1.4 + 0.08; g.kR = (r ? 1.7 : 0.95) * Math.max(0, -co) ** 1.4 + 0.08;
      g.fL = -0.25 * Math.max(0, co); g.fR = -0.25 * Math.max(0, -co);
      g.aLx = s * (r ? 0.85 : 0.5); g.aRx = -s * (r ? 0.85 : 0.5); g.eL = r ? -1.35 : -0.25 - 0.25 * Math.max(0, -s); g.eR = r ? -1.35 : -0.25 - 0.25 * Math.max(0, s);
      g.aLz = r ? 0.15 : 0.1; g.aRz = r ? -0.15 : -0.1; g.hipsY = (r ? 0.045 : 0.018) * Math.cos(2 * ph) - (r ? 0.05 : 0.01); g.hipsY2 = 0.09 * s; g.spY = -0.13 * s; g.spX = r ? 0.2 : 0.04; g.hdX = r ? -0.12 : -0.02;
    }
    if (m === 'jump') { const up = st.vy > 0; g.lL = up ? -0.8 : -0.35; g.lR = up ? -0.15 : -0.5; g.kL = up ? 1.3 : 0.6; g.kR = up ? 0.5 : 0.8; g.aLx = -0.6; g.aRx = -0.6; g.aLz = 0.6; g.aRz = -0.6; g.eL = -0.5; g.eR = -0.5; g.spX = 0.1; }
    if (m === 'land') { g.lL = -0.5; g.lR = -0.5; g.kL = 1; g.kR = 1; g.fL = 0.5; g.fR = 0.5; g.hipsY = -0.13; g.spX = 0.3; g.aLx = -0.3; g.aRx = -0.3; }
    if (m === 'sit') { g.lL = -1.5; g.lR = -1.5; g.kL = 1.5; g.kR = 1.5; g.lLz = 0.06; g.lRz = -0.06; g.aLx = -0.55; g.aRx = -0.55; g.eL = -0.7; g.eR = -0.7; g.spX = 0.04 * Math.sin(t * 1.7); g.hdY = 0.25 * Math.sin(t * 0.3); }
    if (m === 'drink' || m === 'eat') {
      const a = st.t || 0; const up = Math.min(1, a / 0.55) * Math.min(1, Math.max(0, (2.5 - a) / 0.5)); const sip = m === 'drink' && a > 0.6 && a < 2.1;
      g.aRx = -1.15 * up; g.aRz = 0.35 * up - 0.09 * (1 - up); g.aRy = 0; g.eR = -0.12 - 1.95 * up; g.hdX = sip ? -0.35 : m === 'eat' ? 0.05 * Math.sin(a * 9) : 0; g.spX = sip ? -0.05 : 0;
    }
    if (m === 'bend') { const a = st.t || 0; const d = Math.min(1, a / 0.6) * Math.min(1, Math.max(0, (2.6 - a) / 0.5)); g.spX = 0.75 * d; g.hipsX = 0.25 * d; g.hdX = -0.3 * d; g.lL = -0.2 * d; g.lR = -0.2 * d; g.kL = 0.3 * d; g.kR = 0.3 * d; g.aLx = -0.4 * d; g.aRx = -0.7 * d; g.eR = -0.6 * d; }
    if (m === 'wave') { const a = st.t || 0; g.aRz = -2.55 + 0.3 * Math.sin(a * 11); g.eR = -0.35; g.aRx = -0.15; g.hdZ = 0.08; }
    if (m === 'drive') { g.lL = -1.35; g.lR = -1.35; g.kL = 1.35; g.kR = 1.35; g.lLz = 0.08; g.lRz = -0.08; g.aLx = -1.05; g.aRx = -1.05; g.aLz = 0.28; g.aRz = -0.28; g.eL = -0.55; g.eR = -0.55; g.hdY = 0.15 * Math.sin(t * 0.4); }
  if (m === 'bike') { g.lL = -1.05 + 0.45 * Math.sin(ph); g.lR = -1.05 - 0.45 * Math.sin(ph); g.kL = 1.25 + 0.45 * Math.cos(ph); g.kR = 1.25 - 0.45 * Math.cos(ph); g.spX = 0.45; g.aLx = -1.1; g.aRx = -1.1; g.eL = -0.25; g.eR = -0.25; g.hdX = -0.3; g.hipsY = -0.03; }
  const k = Math.min(1, 1 - Math.exp(-(m === 'walk' || m === 'run' || m === 'bike' ? 24 : 9) * dt));
    for (const j of J) c[j] = c[j] === undefined ? g[j] : c[j] + (g[j] - c[j]) * k;
    u.hips.position.y = u.hipY + c.hipsY; u.hips.rotation.set(c.hipsX, c.hipsY2, 0); u.spine.rotation.set(c.spX, c.spY, c.spZ); u.neck.rotation.x = c.nkX; u.head.rotation.set(c.hdX, c.hdY, c.hdZ);
    u.aL.rotation.set(c.aLx, c.aLy, c.aLz); u.aR.rotation.set(c.aRx, c.aRy, c.aRz); u.eL.rotation.x = c.eL; u.eR.rotation.x = c.eR;
    u.lL.rotation.set(c.lL, 0, c.lLz); u.lR.rotation.set(c.lR, 0, c.lRz); u.kL.rotation.x = c.kL; u.kR.rotation.x = c.kR; u.fL.rotation.x = c.fL; u.fR.rotation.x = c.fR;
    if (u.skirt) u.skirt.rotation.x = -0.25 * Math.max(Math.abs(c.lL), Math.abs(c.lR)) * (m === 'sit' ? 0.2 : 1);
    if (u.tail) { u.tail.rotation.x = 0.35 + 0.12 * Math.sin(t * (m === 'run' ? 14 : 3)) * (m === 'run' ? 1.5 : m === 'walk' ? 0.8 : 0.3); u.tail.rotation.z = 0.1 * Math.sin(t * 1.7 + 1); }
    // blink, talk
    u.blink -= dt; const closed = u.blink < 0.12 && u.blink > 0; if (u.blink <= 0) u.blink = 2.2 + Math.random() * 3.5;
    for (const l of u.lids) l.rotation.x = closed ? 1.2 : -0.18;
    const mo = st.talking ? Math.max(0, Math.sin(t * 17)) * 0.6 + Math.max(0, Math.sin(t * 7.3)) * 0.4 : 0;
    u.lipLo.position.y = u.lipY - 0.006 * mo; u.inner.scale.y = 0.0012 + 0.006 * mo;
  }
  return { build, pose, M, lin, mergeStatic };
}
