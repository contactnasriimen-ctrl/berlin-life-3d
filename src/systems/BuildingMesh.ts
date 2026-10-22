import * as THREE from 'three';
import type { Building } from './CityGen';
import { SHOPS } from './CityGen';
import { STYLE_DIM, SHOP_TILE, type Style } from './Textures';

/** Collects quads per material and turns them into one BufferGeometry each (one draw call per material per chunk). */
class Batch {
  pos: number[] = []; nor: number[] = []; uv: number[] = []; col: number[] = []; idx: number[] = [];
  quad(a: number[], b: number[], c: number[], d: number[], uv: number[][], color: number[]) {
    const base = this.pos.length / 3; const n = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a))).normalize();
    for (const [k, p] of [a, b, c, d].entries()) { this.pos.push(...p); this.nor.push(n.x, n.y, n.z); this.uv.push(...uv[k]); this.col.push(...color); }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  tri(a: number[], b: number[], c: number[], uv: number[][], color: number[]) {
    const base = this.pos.length / 3; const n = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a))).normalize();
    for (const [k, p] of [a, b, c].entries()) { this.pos.push(...p); this.nor.push(n.x, n.y, n.z); this.uv.push(...uv[k]); this.col.push(...color); }
    this.idx.push(base, base + 1, base + 2);
  }
  /** axis-aligned box; uvScale = metres per texture repeat */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: number[], uvScale = 4, bottom = false) {
    const u = (v: number) => v / uvScale;
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [[0, 0], [u(x1 - x0), 0], [u(x1 - x0), u(y1 - y0)], [0, u(y1 - y0)]], color);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [[0, 0], [u(x1 - x0), 0], [u(x1 - x0), u(y1 - y0)], [0, u(y1 - y0)]], color);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [[0, 0], [u(z1 - z0), 0], [u(z1 - z0), u(y1 - y0)], [0, u(y1 - y0)]], color);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [[0, 0], [u(z1 - z0), 0], [u(z1 - z0), u(y1 - y0)], [0, u(y1 - y0)]], color);
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [[u(x0), u(z1)], [u(x1), u(z1)], [u(x1), u(z0)], [u(x0), u(z0)]], color);
    if (bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [[0, 0], [1, 0], [1, 1], [0, 1]], color);
  }
  geometry() {
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); g.setIndex(this.idx); g.computeBoundingSphere(); return g;
  }
}

export type BatchKey = `wall-${Style}` | 'shop' | 'roof' | 'gravel' | 'trim' | 'awning' | 'signs';

export interface Balcony { x: number; y: number; z: number; ry: number; w: number; style: Style }

/** linear colour from an sRGB triple */
const linC = (c: [number, number, number], k = 1) => { const t = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace); return [t.r * k, t.g * k, t.b * k]; };

export function buildChunk(list: Building[], balconies: Balcony[]) {
  const B = new Map<BatchKey, Batch>(); const get = (k: BatchKey) => { let b = B.get(k); if (!b) { b = new Batch(); B.set(k, b); } return b; };
  let seed = Math.floor(list[0].x0 * 7 + list[0].z0 * 13); const r = () => { seed = (seed * 16807 + 11) % 2147483647; return (seed % 1000) / 1000; };
  for (const b of list) {
    const { x0, x1, z0, z1, h, gf, style } = b; const dim = STYLE_DIM[style]; const tileH = dim.floor * 4; const col = linC(b.tint);
    const wall = get(`wall-${style}`);
    // the four walls; windows always fit whole bays
    const faces: { a: number[]; bb: number[]; len: number; side: 0 | 1 | 2 | 3 }[] = [
      { a: [x1, 0, z0], bb: [x0, 0, z0], len: x1 - x0, side: 0 }, { a: [x1, 0, z1], bb: [x1, 0, z0], len: z1 - z0, side: 1 },
      { a: [x0, 0, z1], bb: [x1, 0, z1], len: x1 - x0, side: 2 }, { a: [x0, 0, z0], bb: [x0, 0, z1], len: z1 - z0, side: 3 },
    ];
    for (const f of faces) {
      const nb = Math.max(1, Math.round(f.len / dim.bay)); const u1 = nb / 4; const street = f.side === b.front;
      const y0 = street && gf ? gf : 0; const v0 = (y0 - gf) / tileH; const v1 = (h - gf) / tileH;
      wall.quad([f.a[0], y0, f.a[2]], [f.bb[0], y0, f.bb[2]], [f.bb[0], h, f.bb[2]], [f.a[0], h, f.a[2]], [[0, v0], [u1, v0], [u1, v1], [0, v1]], col);
      if (street && gf) {
        const ns = Math.max(1, Math.round(f.len / SHOP_TILE.w)); const sh = get('shop');
        sh.quad([f.a[0], 0, f.a[2]], [f.bb[0], 0, f.bb[2]], [f.bb[0], gf, f.bb[2]], [f.a[0], gf, f.a[2]], [[0, 0], [ns / 2, 0], [ns / 2, 1], [0, 1]], [1, 1, 1]);
        // the shop sign above the windows, and an awning for cafés and bakeries
        const shop = SHOPS.find((s) => s.name === b.shop)!; const sw = Math.min(f.len - 2, 6.5); const ux = (f.bb[0] - f.a[0]) / f.len; const uz = (f.bb[2] - f.a[2]) / f.len; const nx = -uz; const nz = ux;
        const cx = (f.a[0] + f.bb[0]) / 2 + nx * 0.06; const cz = (f.a[2] + f.bb[2]) / 2 + nz * 0.06; const sg = get('signs'); const row = SHOPS.indexOf(shop); const v0 = 1 - (row + 1) / SHOPS.length; const v1 = 1 - row / SHOPS.length;
        sg.quad([cx - (ux * sw) / 2, gf - 0.72, cz - (uz * sw) / 2], [cx + (ux * sw) / 2, gf - 0.72, cz + (uz * sw) / 2], [cx + (ux * sw) / 2, gf - 0.02, cz + (uz * sw) / 2], [cx - (ux * sw) / 2, gf - 0.02, cz - (uz * sw) / 2], [[0, v0], [1, v0], [1, v1], [0, v1]], [1, 1, 1]);
        if (['Café', 'Bäckerei', 'Eisdiele', 'Blumen', 'Pizzeria'].includes(shop.name)) {
          const aw = get('awning'); const ac = linC([parseInt(shop.bg.slice(1, 3), 16) / 255, parseInt(shop.bg.slice(3, 5), 16) / 255, parseInt(shop.bg.slice(5, 7), 16) / 255]); const L = f.len - 1;
          const p0 = [cx - (ux * L) / 2, gf - 0.8, cz - (uz * L) / 2]; const p1 = [cx + (ux * L) / 2, gf - 0.8, cz + (uz * L) / 2];
          aw.quad([p0[0] + nx * 1.8, gf - 1.5, p0[2] + nz * 1.8], [p1[0] + nx * 1.8, gf - 1.5, p1[2] + nz * 1.8], p1, p0, [[0, 0], [L / 2, 0], [L / 2, 1], [0, 1]], ac);
          aw.quad(p0, p1, [p1[0] + nx * 1.8, gf - 1.5, p1[2] + nz * 1.8], [p0[0] + nx * 1.8, gf - 1.5, p0[2] + nz * 1.8], [[0, 0], [L / 2, 0], [L / 2, 1], [0, 1]], ac);
        }
      } else if (gf) { // ground floor of the other faces: plain wall with windows
        wall.quad([f.a[0], 0, f.a[2]], [f.bb[0], 0, f.bb[2]], [f.bb[0], gf, f.bb[2]], [f.a[0], gf, f.a[2]], [[0, -gf / tileH], [u1, -gf / tileH], [u1, 0], [0, 0]], col);
      }
      // balconies on the street side
      if (street && b.balcony && style !== 'glass') {
        const floors = Math.floor((h - gf) / dim.floor); const ux = (f.bb[0] - f.a[0]) / f.len; const uz = (f.bb[2] - f.a[2]) / f.len; const ry = Math.atan2(-uz, ux);
        for (let fl = 1; fl < floors; fl++) for (let k = 0; k < nb; k++) { if ((k + fl) % 2 && style === 'altbau') continue; const s = ((k + 0.5) * f.len) / nb; balconies.push({ x: f.a[0] + ux * s - uz * 0.62, y: gf + fl * dim.floor - 0.1, z: f.a[2] + uz * s + ux * 0.62, ry, w: (f.len / nb) * 0.82, style }); }
      }
    }
    // roof
    const trim = get('trim'); const tc = linC(b.tint, 1.05);
    if (b.roof === 'mansard') {
      const rf = get('roof'); const ins = Math.min(2.4, (x1 - x0) / 4, (z1 - z0) / 4); const rh = 3.6; const y = h; const t = y + rh;
      trim.box(x0 - 0.3, y - 0.45, z0 - 0.3, x1 + 0.3, y, z1 + 0.3, tc, 4, true);
      const c = [0.75, 0.75, 0.78];
      rf.quad([x1, y, z0], [x0, y, z0], [x0 + ins, t, z0 + ins], [x1 - ins, t, z0 + ins], [[0, 0], [(x1 - x0) / 4, 0], [(x1 - x0 - ins) / 4, 1], [ins / 4, 1]], c);
      rf.quad([x0, y, z1], [x1, y, z1], [x1 - ins, t, z1 - ins], [x0 + ins, t, z1 - ins], [[0, 0], [(x1 - x0) / 4, 0], [(x1 - x0 - ins) / 4, 1], [ins / 4, 1]], c);
      rf.quad([x1, y, z1], [x1, y, z0], [x1 - ins, t, z0 + ins], [x1 - ins, t, z1 - ins], [[0, 0], [(z1 - z0) / 4, 0], [(z1 - z0 - ins) / 4, 1], [ins / 4, 1]], c);
      rf.quad([x0, y, z0], [x0, y, z1], [x0 + ins, t, z1 - ins], [x0 + ins, t, z0 + ins], [[0, 0], [(z1 - z0) / 4, 0], [(z1 - z0 - ins) / 4, 1], [ins / 4, 1]], c);
      get('gravel').quad([x0 + ins, t, z1 - ins], [x1 - ins, t, z1 - ins], [x1 - ins, t, z0 + ins], [x0 + ins, t, z0 + ins], [[0, 0], [1, 0], [1, 1], [0, 1]], [0.8, 0.8, 0.8]);
      // dormers on the street side and a chimney
      const nd = Math.floor(((b.front % 2 ? z1 - z0 : x1 - x0) - 2) / 4.5);
      for (let k = 0; k < nd; k++) {
        const s = 2.5 + k * 4.5; const dc = [0.9, 0.9, 0.9];
        if (b.front === 0) trim.box(x0 + s, y + 0.6, z0 + 0.5, x0 + s + 1.6, y + 2.4, z0 + 1.6, dc, 2);
        if (b.front === 2) trim.box(x0 + s, y + 0.6, z1 - 1.6, x0 + s + 1.6, y + 2.4, z1 - 0.5, dc, 2);
        if (b.front === 1) trim.box(x1 - 1.6, y + 0.6, z0 + s, x1 - 0.5, y + 2.4, z0 + s + 1.6, dc, 2);
        if (b.front === 3) trim.box(x0 + 0.5, y + 0.6, z0 + s, x0 + 1.6, y + 2.4, z0 + s + 1.6, dc, 2);
      }
      const ccx = x0 + (x1 - x0) * (0.25 + r() * 0.5); const ccz = z0 + (z1 - z0) * (0.3 + r() * 0.4); rf.box(ccx - 0.4, y + 1, ccz - 0.4, ccx + 0.4, t + 1.4, ccz + 0.4, [0.55, 0.35, 0.3], 2);
    } else {
      trim.box(x0 - (style === 'platte' ? 0 : 0.25), h - 0.35, z0 - (style === 'platte' ? 0 : 0.25), x1 + (style === 'platte' ? 0 : 0.25), h + 0.7, z1 + (style === 'platte' ? 0 : 0.25), style === 'glass' ? [0.45, 0.5, 0.55] : tc, 4, true);
      get('gravel').quad([x0 + 0.3, h + 0.2, z1 - 0.3], [x1 - 0.3, h + 0.2, z1 - 0.3], [x1 - 0.3, h + 0.2, z0 + 0.3], [x0 + 0.3, h + 0.2, z0 + 0.3], [[x0 / 6, z1 / 6], [x1 / 6, z1 / 6], [x1 / 6, z0 / 6], [x0 / 6, z0 / 6]], [0.85, 0.85, 0.85]);
      if (r() < 0.6) { const cx = x0 + (x1 - x0) * (0.3 + r() * 0.4); const cz = z0 + (z1 - z0) * (0.3 + r() * 0.4); trim.box(cx - 1.5, h + 0.2, cz - 1.2, cx + 1.5, h + 2.4, cz + 1.2, [0.6, 0.62, 0.64], 3); }
    }
  }
  const out: { key: BatchKey; geo: THREE.BufferGeometry }[] = [];
  for (const [key, b] of B) { const geo = b.geometry(); if (geo) out.push({ key, geo }); }
  return out;
}
