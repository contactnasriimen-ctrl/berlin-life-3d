import { CELL, ROAD_W, SPREE, SPREE_W, distToPolyline, GI, GJ } from '../data/cityDistricts';
import { CITY } from './CityGen';
import { signalState } from './TrafficRules';

export type PedKind = 'walk' | 'talk' | 'sit' | 'wait';
export interface Ped {
  id: number; kind: PedKind; x: number; z: number; y: number; heading: number; look: number; speed: number;
  cell?: [number, number]; t?: number; dir?: 1 | -1;
  cross?: { x0: number; z0: number; x1: number; z1: number; u: number; len: number; node: [number, number]; horiz: boolean; next: [number, number]; nt: number } | null;
  waitT?: number; seatY?: number; stopT?: number; name: string; phase: number;
}

const IN = 2.8; // distance of the walking line from the kerb
export function cellRect(i: number, j: number) { const x0 = i * CELL + ROAD_W / 2 + IN; const x1 = (i + 1) * CELL - ROAD_W / 2 - IN; const z0 = j * CELL + ROAD_W / 2 + IN; const z1 = (j + 1) * CELL - ROAD_W / 2 - IN; return { x0, x1, z0, z1, w: x1 - x0, h: z1 - z0 }; }
const dry = (x: number, z: number) => distToPolyline(x, z, SPREE).d > SPREE_W / 2 + 2.5;
export function walkableCell(i: number, j: number) {
  if (i < GI.min || i >= GI.max || j < GJ.min || j >= GJ.max) return false; const r = cellRect(i, j);
  return [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1], [(r.x0 + r.x1) / 2, r.z0], [(r.x0 + r.x1) / 2, r.z1], [r.x0, (r.z0 + r.z1) / 2], [r.x1, (r.z0 + r.z1) / 2]].every(([x, z]) => dry(x, z));
}
/** position on the rectangle around a block (t = distance along it, clockwise from the north-west corner) */
export function loopPoint(i: number, j: number, t: number) {
  const r = cellRect(i, j); const P = 2 * (r.w + r.h); t = ((t % P) + P) % P;
  if (t < r.w) return { x: r.x0 + t, z: r.z0, side: 0 }; t -= r.w;
  if (t < r.h) return { x: r.x1, z: r.z0 + t, side: 1 }; t -= r.h;
  if (t < r.w) return { x: r.x1 - t, z: r.z1, side: 2 }; t -= r.w;
  return { x: r.x0, z: r.z1 - t, side: 3 };
}
export const loopLen = (i: number, j: number) => { const r = cellRect(i, j); return 2 * (r.w + r.h); };

/** at a corner a walker may cross the street to the next block (only when the pedestrian light is green) */
export function maybeCross(p: Ped, now: number): void {
  const [i, j] = p.cell!; const r = cellRect(i, j); const P = loopLen(i, j); const t = ((p.t! % P) + P) % P;
  const corners = [0, r.w, r.w + r.h, 2 * r.w + r.h];
  const k = corners.findIndex((c) => Math.abs(t - c) < 0.6); if (k < 0 || Math.random() > 0.35) return;
  // corner k: 0 = NW, 1 = NE, 2 = SE, 3 = SW. Cross horizontally (to the block east/west) or vertically.
  const cx = [r.x0, r.x1, r.x1, r.x0][k]; const cz = [r.z0, r.z0, r.z1, r.z1][k];
  const horizCross = Math.random() < 0.5; const di = horizCross ? (k === 1 || k === 2 ? 1 : -1) : 0; const dj = horizCross ? 0 : (k === 2 || k === 3 ? 1 : -1);
  const ni = i + di; const nj = j + dj; if (!walkableCell(ni, nj)) return;
  const nr = cellRect(ni, nj); const tx = horizCross ? (di > 0 ? nr.x0 : nr.x1) : cx; const tz = horizCross ? cz : (dj > 0 ? nr.z0 : nr.z1);
  const node: [number, number] = [di > 0 || (!horizCross && (k === 1 || k === 2)) ? i + 1 : i, dj > 0 || (horizCross && (k === 2 || k === 3)) ? j + 1 : j];
  const nt = horizCross ? (di > 0 ? (k === 1 ? 0 : 2 * nr.w + nr.h) : (k === 0 ? nr.w : nr.w + nr.h)) : (dj > 0 ? (k === 3 ? 0 : nr.w) : (k === 0 ? 2 * nr.w + nr.h : nr.w + nr.h));
  // walking east/west across a north-south street: that street's cars must have red
  p.cross = { x0: cx, z0: cz, x1: tx, z1: tz, u: -1, len: Math.hypot(tx - cx, tz - cz), node, horiz: !horizCross, next: [ni, nj], nt };
  void now;
}
export function crossingAllowed(p: Ped, now: number) {
  const c = p.cross!; if (!CITY.signals.some((s) => s.i === c.node[0] && s.j === c.node[1])) return true;
  // pedestrians may go when the cars they walk across have red
  return signalState(c.node[0], c.node[1], c.horiz, now) === 'red';
}

const FIRST = ['Anna', 'Lukas', 'Mia', 'Leon', 'Emma', 'Paul', 'Hannah', 'Jonas', 'Sophie', 'Felix', 'Lea', 'Ben', 'Aylin', 'Mehmet', 'Lina', 'Karim', 'Marie', 'Tom', 'Zeynep', 'Nils'];
export const randomName = (k: number) => FIRST[k % FIRST.length];
export const SMALLTALK: [string, string][] = [
  ['Hallo! Wie geht’s dir?', 'Hi! How are you?'], ['Entschuldigung, ich habe es eilig.', 'Sorry, I’m in a hurry.'], ['Schönes Wetter heute, oder?', 'Nice weather today, isn’t it?'],
  ['Der Fernsehturm ist da drüben, Richtung Alex.', 'The TV tower is over there, towards Alex.'], ['Die S-Bahn fährt alle zehn Minuten.', 'The S-Bahn runs every ten minutes.'],
  ['Kennst du ein gutes Café in Kreuzberg?', 'Do you know a good café in Kreuzberg?'], ['Berlin ist arm, aber sexy!', 'Berlin is poor, but sexy!'], ['Na, alles klar?', 'Hey, all good?'],
  ['Ich wohne seit zehn Jahren in Friedrichshain.', 'I’ve lived in Friedrichshain for ten years.'], ['Pass auf die Radfahrer auf!', 'Watch out for the cyclists!'],
  ['Am Wochenende gehe ich auf den Flohmarkt am Mauerpark.', 'At the weekend I go to the flea market at Mauerpark.'], ['Einen schönen Tag noch!', 'Have a nice day!'],
];
