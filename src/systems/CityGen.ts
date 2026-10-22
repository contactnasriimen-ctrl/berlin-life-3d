import {
  CELL, ROAD_W, WALK_W, GI, GJ, WORLD, SPREE, SPREE_W, VIADUCT, PARKS, LANE, inRect, districtAt, distToPolyline, spreeZ, streetNameX, streetNameZ, type DistrictId, type Rect,
} from '../data/cityDistricts';
import { LANDMARKS } from '../data/berlinLandmarks';
import type { Style } from './Textures';
import { timed } from './prof';

export interface Building {
  x0: number; z0: number; x1: number; z1: number; h: number; style: Style; tint: [number, number, number];
  gf: number; front: 0 | 1 | 2 | 3; shop: string | null; roof: 'flat' | 'mansard'; balcony: boolean; chunk: string; district: DistrictId;
}
export interface RoadEdge { a: [number, number]; b: [number, number]; horiz: boolean; bridge: null | { s0: number; s1: number }; name: string }
export interface Box { x: number; y: number; z: number; w: number; h: number; d: number; ry?: number }
export interface Door { x: number; z: number; ry: number; kind: 'cafe' | 'spaeti' | 'baeckerei'; name: string }

function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry(1989);
const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
const hex = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

const STYLE_W: Record<DistrictId, [Style, number][]> = {
  mitte: [['stone', 0.45], ['altbau', 0.35], ['glass', 0.2]], kreuzberg: [['altbau', 0.75], ['brick', 0.12], ['platte', 0.13]], friedrichshain: [['platte', 0.5], ['altbau', 0.4], ['brick', 0.1]],
  charlottenburg: [['altbau', 0.6], ['stone', 0.4]], neukoelln: [['altbau', 0.85], ['platte', 0.15]], potsdamer: [['glass', 0.75], ['stone', 0.25]], moabit: [['altbau', 0.5], ['brick', 0.3], ['stone', 0.2]], tiergarten: [['stone', 1]],
};
const FLOORS: Record<DistrictId, [number, number]> = { mitte: [5, 7], kreuzberg: [5, 6], friedrichshain: [5, 10], charlottenburg: [5, 6], neukoelln: [4, 6], potsdamer: [8, 16], moabit: [5, 6], tiergarten: [4, 5] };
const SHOP_P: Record<DistrictId, number> = { mitte: 0.55, kreuzberg: 0.7, friedrichshain: 0.45, charlottenburg: 0.55, neukoelln: 0.75, potsdamer: 0.4, moabit: 0.4, tiergarten: 0 };
const TREE_P: Record<DistrictId, number> = { mitte: 0.6, kreuzberg: 0.85, friedrichshain: 0.7, charlottenburg: 0.85, neukoelln: 0.8, potsdamer: 0.35, moabit: 0.7, tiergarten: 1 };
const TINTS: Record<Style, string[]> = {
  altbau: ['#f0d9ad', '#e3b48a', '#f0c3a8', '#bfd2da', '#dccfa8', '#f5e6c4', '#b9cca9', '#efc77d', '#d9a596', '#adc0cf', '#f2dccb', '#e8d07a', '#c7b3d4'],
  stone: ['#e6d7b8', '#d9c6a4', '#cfc4b0', '#ebdfc6'], platte: ['#efeadf', '#e3d7bf', '#d2dde3', '#ecd2b8', '#d5e0c6', '#e9c9c0'], brick: ['#ffffff', '#f0e6e0', '#e8dcd6'], glass: ['#cfe0ea', '#d4e6dc', '#e0e0e0', '#c8d6e8'],
};
export const SHOPS: { name: string; bg: string; fg: string; door?: Door['kind'] }[] = [
  { name: 'Bäckerei', bg: '#7a4518', fg: '#ffe9a8', door: 'baeckerei' }, { name: 'Café', bg: '#13202b', fg: '#ffd25a', door: 'cafe' }, { name: 'Späti', bg: '#e8463b', fg: '#ffffff', door: 'spaeti' },
  { name: 'Döner Kebab', bg: '#c8102e', fg: '#ffd700' }, { name: 'Apotheke', bg: '#d90a2c', fg: '#ffffff' }, { name: 'Buchhandlung', bg: '#1b3a2f', fg: '#f4e9d0' }, { name: 'Blumen', bg: '#2f7d4f', fg: '#ffffff' },
  { name: 'Friseur', bg: '#222222', fg: '#f0f0f0' }, { name: 'Imbiss', bg: '#f0ab00', fg: '#13202b' }, { name: 'Kiosk', bg: '#2459c4', fg: '#ffffff' }, { name: 'Optiker', bg: '#ffffff', fg: '#13202b' },
  { name: 'REWE', bg: '#cc071e', fg: '#ffffff' }, { name: 'Bio-Markt', bg: '#5a8f29', fg: '#ffffff' }, { name: 'Eisdiele', bg: '#f2a7c0', fg: '#5a1830' }, { name: 'Pizzeria', bg: '#1b8a4e', fg: '#ffffff' }, { name: 'Bar', bg: '#3a1d4a', fg: '#ffcf6a' },
];

const CLEAR: Rect[] = LANDMARKS.map((l) => l.clear);
const chunkOf = (x: number, z: number) => `${Math.floor(x / 220)},${Math.floor(z / 220)}`;
const inPark = (x: number, z: number, m = 0) => PARKS.some((p) => inRect(x, z, p, m));
const inWater = (x: number, z: number, m = 0) => distToPolyline(x, z, SPREE).d < SPREE_W / 2 + m;
const nearViaduct = (x: number, z: number, m = 9) => distToPolyline(x, z, VIADUCT).d < m;

function footprintFree(x0: number, z0: number, x1: number, z1: number) {
  if (x0 < WORLD.x0 || x1 > WORLD.x1 || z0 < WORLD.z0 || z1 > WORLD.z1) return false;
  for (const fx of [0, 0.5, 1]) for (const fz of [0, 0.5, 1]) {
    const x = x0 + (x1 - x0) * fx; const z = z0 + (z1 - z0) * fz;
    if (inPark(x, z) || inWater(x, z, 6) || nearViaduct(x, z) || CLEAR.some((r) => inRect(x, z, r))) return false;
  }
  return true;
}

function generate() {
  const buildings: Building[] = []; const edges: RoadEdge[] = []; const colliders: Box[] = []; const doors: Door[] = [];
  const trees: [number, number, number][] = []; const lamps: [number, number, number][] = []; const benches: [number, number, number][] = [];
  const litfass: [number, number][] = []; const busStops: [number, number, number, string][] = []; const cafes: [number, number, number][] = []; const parking: [number, number, number][] = [];
  const signals: { x: number; z: number; i: number; j: number }[] = []; const streetSigns: { x: number; z: number; a: string; b: string }[] = [];
  const slabs: { x0: number; z0: number; x1: number; z1: number; kind: 'pave' | 'grass' | 'court' }[] = [];
  const nodeDeg = new Map<string, number>(); const edgeSet = new Set<string>();
  const nk = (i: number, j: number) => `${i},${j}`;

  // ---- roads ----
  const allowedInPark = (horiz: boolean, i: number, j: number) => (horiz && j === 0) || (!horiz && i === -5);
  for (let i = GI.min; i <= GI.max; i++) for (let j = GJ.min; j <= GJ.max; j++) {
    for (const horiz of [true, false]) {
      const i2 = horiz ? i + 1 : i; const j2 = horiz ? j : j + 1; if (i2 > GI.max || j2 > GJ.max) continue;
      const ax = i * CELL; const az = j * CELL; const bx = i2 * CELL; const bz = j2 * CELL; const mx = (ax + bx) / 2; const mz = (az + bz) / 2;
      if ((i === 0 && j === 0) || (i2 === 0 && j2 === 0)) continue; // Pariser Platz / Brandenburg Gate: no cars
      if ((i === -5 && j === 0) || (i2 === -5 && j2 === 0)) continue; // Großer Stern: the Victory Column stands in the middle
      if (!horiz && i === 7 && j === -2) continue; // Alexanderplatz pedestrian zone
      if (inPark(mx, mz, -2) && !allowedInPark(horiz, i, j)) continue;
      // the Spree: bridge if the road crosses it, nothing if it runs along it
      let wet = 0; let s0 = Infinity; let s1 = -Infinity; const len = CELL;
      for (let s = 0; s <= len; s += 2) { const x = ax + ((bx - ax) * s) / len; const z = az + ((bz - az) * s) / len; if (inWater(x, z, 4)) { wet++; s0 = Math.min(s0, s); s1 = Math.max(s1, s); } }
      let bridge: RoadEdge['bridge'] = null;
      if (wet) {
        const sideA = Math.sign(az - spreeZ(ax)); const sideB = Math.sign(bz - spreeZ(bx));
        if (sideA === sideB && horiz) continue;
        bridge = { s0: Math.max(0, s0 - 6), s1: Math.min(len, s1 + 6) };
      }
      edges.push({ a: [i, j], b: [i2, j2], horiz, bridge, name: horiz ? streetNameZ(j, mx) : streetNameX(i, mz) });
      edgeSet.add(`${nk(i, j)}|${nk(i2, j2)}`);
      nodeDeg.set(nk(i, j), (nodeDeg.get(nk(i, j)) || 0) + 1); nodeDeg.set(nk(i2, j2), (nodeDeg.get(nk(i2, j2)) || 0) + 1);
    }
  }
  const hasEdge = (a: [number, number], b: [number, number]) => edgeSet.has(`${nk(a[0], a[1])}|${nk(b[0], b[1])}`) || edgeSet.has(`${nk(b[0], b[1])}|${nk(a[0], a[1])}`);

  // ---- intersections: traffic lights, street name signs, advertising columns ----
  for (const [key, deg] of nodeDeg) {
    const [i, j] = key.split(',').map(Number); const x = i * CELL; const z = j * CELL; const o = ROAD_W / 2 + 1.2;
    if (deg >= 3) signals.push({ x, z, i, j });
    if (deg >= 2 && !inWater(x + o, z + o, 2)) streetSigns.push({ x: x + o + 0.6, z: z + o + 0.6, a: streetNameZ(j, x), b: streetNameX(i, z) });
    if (deg >= 3 && rng() < 0.3 && !inPark(x - o - 2, z + o + 2) && !inWater(x - o - 2, z + o + 2, 3)) { litfass.push([x - o - 2.2, z + o + 2.2]); colliders.push({ x: x - o - 2.2, y: 1.6, z: z + o + 2.2, w: 1.5, h: 3.2, d: 1.5 }); }
  }

  // ---- blocks ----
  for (let i = GI.min; i < GI.max; i++) for (let j = GJ.min; j < GJ.max; j++) {
    const cx0 = i * CELL + ROAD_W / 2; const cx1 = (i + 1) * CELL - ROAD_W / 2; const cz0 = j * CELL + ROAD_W / 2; const cz1 = (j + 1) * CELL - ROAD_W / 2;
    const mx = (cx0 + cx1) / 2; const mz = (cz0 + cz1) / 2; const dist = districtAt(mx, mz);
    const park = PARKS.find((p) => inRect(mx, mz, p));
    const riverCell = distToPolyline(mx, mz, SPREE).d < CELL * 0.75 + SPREE_W / 2;
    // the pavement (and grass in the parks), cut in tiles around the river
    if (riverCell) {
      for (let tx = cx0; tx < cx1 - 0.1; tx += 7) for (let tz = cz0; tz < cz1 - 0.1; tz += 7) { const ex = Math.min(cx1, tx + 7); const ez = Math.min(cz1, tz + 7); if (!inWater((tx + ex) / 2, (tz + ez) / 2, 1.5)) slabs.push({ x0: tx, z0: tz, x1: ex, z1: ez, kind: park ? 'grass' : 'pave' }); }
    } else slabs.push({ x0: cx0, z0: cz0, x1: cx1, z1: cz1, kind: park ? 'grass' : 'pave' });
    if (park) {
      const n = Math.round(((cx1 - cx0) * (cz1 - cz0)) / 260);
      for (let k = 0; k < n; k++) { const x = cx0 + 4 + rng() * (cx1 - cx0 - 8); const z = cz0 + 4 + rng() * (cz1 - cz0 - 8); if (!inWater(x, z, 3) && !nearViaduct(x, z, 6) && !CLEAR.some((r) => inRect(x, z, r)) && Math.abs(z) > 9) trees.push([x, z, 0.9 + rng() * 0.7]); }
      for (let k = 0; k < 3; k++) { const x = cx0 + 10 + rng() * (cx1 - cx0 - 20); const z = cz0 + 6; if (!inWater(x, z, 3)) benches.push([x, z, 0]); }
      continue;
    }
    // trees, lamps and parking along the kerbs
    const kerb = [
      { ax: cx0, az: cz0, bx: cx1, bz: cz0, nx: 0, nz: 1, rot: 0 }, { ax: cx1, az: cz0, bx: cx1, bz: cz1, nx: -1, nz: 0, rot: -Math.PI / 2 },
      { ax: cx1, az: cz1, bx: cx0, bz: cz1, nx: 0, nz: -1, rot: Math.PI }, { ax: cx0, az: cz1, bx: cx0, bz: cz0, nx: 1, nz: 0, rot: Math.PI / 2 },
    ];
    for (const k of kerb) {
      const len = Math.hypot(k.bx - k.ax, k.bz - k.az); const ux = (k.bx - k.ax) / len; const uz = (k.bz - k.az) / len;
      for (let s = 10; s < len - 9; s += 11) { const x = k.ax + ux * s + k.nx * 1.6; const z = k.az + uz * s + k.nz * 1.6; if (rng() < TREE_P[dist] && !inWater(x, z, 2) && !nearViaduct(x, z, 5) && !CLEAR.some((r) => inRect(x, z, r))) { trees.push([x, z, 0.75 + rng() * 0.45]); colliders.push({ x, y: 1.5, z, w: 0.45, h: 3, d: 0.45 }); } }
      for (let s = 16; s < len - 10; s += 30) { const x = k.ax + ux * s + k.nx * 0.6; const z = k.az + uz * s + k.nz * 0.6; if (!inWater(x, z, 2) && !CLEAR.some((r) => inRect(x, z, r, -6))) { lamps.push([x, z, Math.atan2(-k.nx, -k.nz)]); colliders.push({ x, y: 2.5, z, w: 0.25, h: 5, d: 0.25 }); } }
      // parked cars: on the road, next to the kerb
      for (let s = 18; s < len - 16; s += 6.5) if (rng() < 0.22) { const x = k.ax + ux * s - k.nx * 1.6; const z = k.az + uz * s - k.nz * 1.6; if (!inWater(x, z, 4)) parking.push([x, z, Math.atan2(ux, uz)]); }
    }
    // perimeter block: buildings along the four sides around a courtyard
    const bx0 = cx0 + WALK_W; const bx1 = cx1 - WALK_W; const bz0 = cz0 + WALK_W; const bz1 = cz1 - WALK_W;
    slabs.push({ x0: bx0 + 16, z0: bz0 + 16, x1: bx1 - 16, z1: bz1 - 16, kind: 'court' });
    const styles = STYLE_W[dist]; const blockStyle = (): Style => { let r = rng(); for (const [s, w] of styles) { r -= w; if (r <= 0) return s; } return styles[0][0]; };
    const [fmin, fmax] = FLOORS[dist]; const tower = dist === 'potsdamer' && rng() < 0.7;
    const sides: { len: number; at: (s: number, w: number, d: number) => [number, number, number, number]; front: 0 | 1 | 2 | 3 }[] = [];
    const D = 14; const W = bx1 - bx0; const Hh = bz1 - bz0;
    sides.push({ len: W, at: (s, w, d) => [bx0 + s, bz0, bx0 + s + w, bz0 + d], front: 0 });
    sides.push({ len: W, at: (s, w, d) => [bx0 + s, bz1 - d, bx0 + s + w, bz1], front: 2 });
    sides.push({ len: Hh - 2 * D, at: (s, w, d) => [bx0, bz0 + D + s, bx0 + d, bz0 + D + s + w], front: 3 });
    sides.push({ len: Hh - 2 * D, at: (s, w, d) => [bx1 - d, bz0 + D + s, bx1, bz0 + D + s + w], front: 1 });
    for (const sd of sides) {
      let s = 0;
      while (s < sd.len - 0.5) {
        let w = 13 + rng() * 14; if (sd.len - (s + w) < 9) w = sd.len - s;
        const style = tower ? 'glass' : blockStyle(); const d = style === 'glass' && tower ? 30 : D;
        const [x0, z0, x1, z1] = sd.at(s, w, Math.min(d, D)); s += w;
        if (!footprintFree(x0, z0, x1, z1)) continue;
        const floors = tower ? 12 + Math.floor(rng() * 14) : fmin + Math.floor(rng() * (fmax - fmin + 1));
        const dim = { altbau: 3.8, stone: 4.2, platte: 2.9, brick: 3.6, glass: 3.6 }[style];
        const shopP = SHOP_P[dist] * (style === 'platte' ? 0.4 : 1);
        const shop = rng() < shopP ? pick(SHOPS).name : null;
        const h = floors * dim + (shop ? 4.5 : 0);
        const b: Building = { x0, z0, x1, z1, h, style, tint: hex(pick(TINTS[style])), gf: shop ? 4.5 : 0, front: sd.front, shop, roof: (style === 'altbau' || style === 'stone') && rng() < 0.6 ? 'mansard' : 'flat', balcony: (style === 'altbau' || style === 'platte') && rng() < 0.55, chunk: chunkOf((x0 + x1) / 2, (z0 + z1) / 2), district: dist };
        buildings.push(b); colliders.push({ x: (x0 + x1) / 2, y: h / 2, z: (z0 + z1) / 2, w: x1 - x0, h, d: z1 - z0 });
        if (shop) {
          const sh = SHOPS.find((q) => q.name === shop)!; const fx = [(x0 + x1) / 2, x1, (x0 + x1) / 2, x0][sd.front]; const fz = [z0, (z0 + z1) / 2, z1, (z0 + z1) / 2][sd.front]; const ry = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][sd.front];
          if (sh.door) doors.push({ x: fx, z: fz, ry, kind: sh.door, name: shop });
          if (shop === 'Café' || shop === 'Eisdiele' || shop === 'Pizzeria') { const nx = [0, 1, 0, -1][sd.front]; const nz = [-1, 0, 1, 0][sd.front]; cafes.push([fx + nx * 2.6, fz + nz * 2.6, ry]); }
        }
      }
    }
    // a bus stop on the main streets
    if ((j === -1 || i === 2 || j === 4) && rng() < 0.45) { const x = cx0 + 30; const z = cz0 + 2.2; if (footprintFree(x - 3, z - 1, x + 3, z + 1) || true) busStops.push([x, z, 0, streetNameZ(j, x)]); }
  }
  // the Spree: walls along both banks (gaps for the bridges)
  const bridgeAt = (x: number, z: number) => edges.some((e) => e.bridge && Math.abs((e.horiz ? z - e.a[1] * CELL : x - e.a[0] * CELL)) < ROAD_W / 2 + WALK_W + 1 && (e.horiz ? x >= e.a[0] * CELL && x <= e.b[0] * CELL : z >= e.a[1] * CELL && z <= e.b[1] * CELL));
  const banks: { x: number; z: number; ry: number; len: number }[] = [];
  for (let k = 0; k < SPREE.length - 1; k++) {
    const [ax, az] = SPREE[k]; const [bx, bz] = SPREE[k + 1]; const len = Math.hypot(bx - ax, bz - az); const ux = (bx - ax) / len; const uz = (bz - az) / len;
    for (let s = 0; s < len; s += 6) for (const side of [1, -1]) {
      const x = ax + ux * (s + 3) + -uz * side * (SPREE_W / 2 + 0.3); const z = az + uz * (s + 3) + ux * side * (SPREE_W / 2 + 0.3);
      if (x < WORLD.x0 || x > WORLD.x1 || bridgeAt(x, z)) continue;
      banks.push({ x, z, ry: Math.atan2(ux, uz), len: 6.2 }); colliders.push({ x, y: 0.8, z, w: 0.5, h: 1.6, d: 6.2, ry: Math.atan2(ux, uz) });
    }
  }
  // bridge railings
  for (const e of edges) if (e.bridge) {
    const ax = e.a[0] * CELL; const az = e.a[1] * CELL; const ux = e.horiz ? 1 : 0; const uz = e.horiz ? 0 : 1; const L = e.bridge.s1 - e.bridge.s0; const s = (e.bridge.s0 + e.bridge.s1) / 2;
    for (const side of [1, -1]) { const o = ROAD_W / 2 + WALK_W - 0.3; colliders.push({ x: ax + ux * s - uz * side * o, y: 0.6, z: az + uz * s + ux * side * o, w: e.horiz ? L : 0.4, h: 1.2, d: e.horiz ? 0.4 : L }); }
  }
  return { buildings, edges, colliders, doors, trees, lamps, benches, litfass, busStops, cafes, parking, signals, streetSigns, slabs, banks, hasEdge, nodeDeg };
}

export const CITY = timed('cityGen', generate);
export type City = typeof CITY;
export { LANE };
