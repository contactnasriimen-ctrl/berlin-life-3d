import { CITY } from './CityGen';
import { CELL, ROAD_W, WALK_W, WORLD, SPREE, SPREE_W, VIADUCT, PARKS, STATIONS } from '../data/cityDistricts';
import { LANDMARKS } from '../data/berlinLandmarks';

/** The city drawn once at 1 px = 1 m; the minimap and the big map show parts of it. */
let cached: HTMLCanvasElement | null = null;
export const MAP_SCALE = 1;
export function mapCanvas() {
  if (cached) return cached;
  const W = (WORLD.x1 - WORLD.x0) * MAP_SCALE; const H = (WORLD.z1 - WORLD.z0) * MAP_SCALE;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
  const X = (x: number) => (x - WORLD.x0) * MAP_SCALE; const Z = (z: number) => (z - WORLD.z0) * MAP_SCALE;
  g.fillStyle = '#2b3036'; g.fillRect(0, 0, W, H);
  for (const s of CITY.slabs) { g.fillStyle = s.kind === 'grass' ? '#3d5a3a' : s.kind === 'court' ? '#3a4140' : '#3b4046'; g.fillRect(X(s.x0), Z(s.z0), (s.x1 - s.x0) * MAP_SCALE, (s.z1 - s.z0) * MAP_SCALE); }
  for (const p of PARKS) { g.fillStyle = '#3f6340'; g.fillRect(X(p.x0), Z(p.z0), (p.x1 - p.x0) * MAP_SCALE, (p.z1 - p.z0) * MAP_SCALE); }
  g.fillStyle = '#5c636b'; for (const b of CITY.buildings) g.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * MAP_SCALE, (b.z1 - b.z0) * MAP_SCALE);
  g.strokeStyle = '#2f6f9a'; g.lineWidth = SPREE_W * MAP_SCALE; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); SPREE.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke();
  g.strokeStyle = '#d7dadd'; g.lineWidth = ROAD_W * MAP_SCALE * 0.75; g.lineCap = 'butt';
  for (const e of CITY.edges) { g.beginPath(); g.moveTo(X(e.a[0] * CELL), Z(e.a[1] * CELL)); g.lineTo(X(e.b[0] * CELL), Z(e.b[1] * CELL)); g.stroke(); }
  g.strokeStyle = '#b4523b'; g.lineWidth = 5 * MAP_SCALE; g.setLineDash([10, 6]); g.beginPath(); VIADUCT.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke(); g.setLineDash([]);
  for (const s of STATIONS) { g.fillStyle = '#008d4f'; g.beginPath(); g.arc(X(s.at[0]), Z(s.at[1]), 9 * MAP_SCALE, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `800 ${12 * MAP_SCALE}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('S', X(s.at[0]), Z(s.at[1]) + 1); }
  void WALK_W;
  cached = c; return c;
}
export function landmarkPositions() { return LANDMARKS.map((l) => ({ ...l, z: l.id === 'oberbaum' ? 430 : l.z })); }
export const toMap = (x: number, z: number) => [(x - WORLD.x0) * MAP_SCALE, (z - WORLD.z0) * MAP_SCALE];
