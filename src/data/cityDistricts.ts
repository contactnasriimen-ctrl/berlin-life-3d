/**
 * Berlin, compressed to about a third of its real size so that it can be explored on foot.
 * Origin (0, 0) = Brandenburg Gate. +x = east, +z = south (north is -z), units = metres.
 * Landmarks and the Spree follow their real relative positions; the street network is a
 * simplified grid (the real one is not), with real street names given to the grid lines.
 */
export const CELL = 110; // distance between two street centre lines
export const ROAD_W = 14; // carriageway
export const WALK_W = 5; // pavement on each side
export const LANE = 3.0; // right-hand traffic: lane centre offset from the road centre
export const GI = { min: -10, max: 15 }; // grid lines x = i * CELL
export const GJ = { min: -4, max: 10 }; // grid lines z = j * CELL
export const WORLD = { x0: GI.min * CELL, x1: GI.max * CELL, z0: GJ.min * CELL, z1: GJ.max * CELL };

export type V2 = [number, number];
export interface Rect { x0: number; z0: number; x1: number; z1: number; name?: string }

export const SPREE: V2[] = [
  [-1250, -170], [-500, -170], [-200, -166], [100, -160], [380, -170], [470, -150], [540, -100], [580, -30], [640, 40], [760, 95], [900, 150],
  [1050, 215], [1200, 300], [1350, 385], [1470, 455], [1600, 540], [1800, 660],
];
export const SPREE_W = 44;

/** Stadtbahn viaduct (S-Bahn), with its stations */
export const VIADUCT: V2[] = [[-260, -300], [-165, -290], [-80, -250], [30, -170], [110, -126], [220, -124], [380, -128], [470, -175], [560, -190], [655, -168], [760, -60], [860, 70], [1000, 150], [1180, 214], [1320, 280], [1430, 330], [1560, 380]];
export const VIADUCT_H = 8;
export const STATIONS = [
  { id: 'hbf', name: 'Berlin Hauptbahnhof', at: [-165, -290] as V2 },
  { id: 'friedrich', name: 'Friedrichstraße', at: [220, -124] as V2 },
  { id: 'alex', name: 'Alexanderplatz', at: [655, -168] as V2 },
  { id: 'jannowitz', name: 'Jannowitzbrücke', at: [860, 70] as V2 },
  { id: 'ostbahnhof', name: 'Ostbahnhof', at: [1180, 214] as V2 },
  { id: 'warschauer', name: 'Warschauer Straße', at: [1430, 330] as V2 },
];

export const PARKS: Rect[] = [
  { x0: -1000, z0: -150, x1: -45, z1: 150, name: 'Tiergarten' },
  { x0: 1107, z0: 557, x1: 1313, z1: 653, name: 'Görlitzer Park' },
  { x0: 117, z0: 667, x1: 323, z1: 753, name: 'Park am Gleisdreieck' },
  { x0: 997, z0: -543, x1: 1203, z1: -337, name: 'Volkspark Friedrichshain' },
  { x0: 400, z0: -105, x1: 455, z1: -45, name: 'Lustgarten' },
];

export type DistrictId = 'mitte' | 'tiergarten' | 'charlottenburg' | 'kreuzberg' | 'friedrichshain' | 'neukoelln' | 'potsdamer' | 'moabit';
export const DISTRICT_NAMES: Record<DistrictId, string> = {
  mitte: 'Mitte', tiergarten: 'Tiergarten', charlottenburg: 'Charlottenburg', kreuzberg: 'Kreuzberg', friedrichshain: 'Friedrichshain', neukoelln: 'Neukölln', potsdamer: 'Potsdamer Platz', moabit: 'Moabit',
};

export function inRect(x: number, z: number, r: Rect, m = 0) { return x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m; }

export function districtAt(x: number, z: number): DistrictId {
  if (Math.hypot(x - 0, z - 230) < 150) return 'potsdamer';
  if (inRect(x, z, PARKS[0])) return 'tiergarten';
  if (x < -640) return 'charlottenburg';
  if (z > 760) return 'neukoelln';
  if (z < -200 && x < 100) return 'moabit';
  if (x > 800 && z < spreeZ(x) - 10) return 'friedrichshain';
  if (z > 250 || (x > 560 && z > spreeZ(x))) return 'kreuzberg';
  return 'mitte';
}

/** z of the Spree centre line at x (the river runs west → east) */
export function spreeZ(x: number) {
  for (let i = 0; i < SPREE.length - 1; i++) {
    const [ax, az] = SPREE[i]; const [bx, bz] = SPREE[i + 1];
    if (x >= ax && x <= bx) return az + ((x - ax) / (bx - ax)) * (bz - az);
  }
  return x < SPREE[0][0] ? SPREE[0][1] : SPREE[SPREE.length - 1][1];
}

export function distToPolyline(x: number, z: number, pl: V2[]) {
  let best = Infinity; let bt = 0; let bi = 0;
  for (let i = 0; i < pl.length - 1; i++) {
    const [ax, az] = pl[i]; const [bx, bz] = pl[i + 1]; const dx = bx - ax; const dz = bz - az; const l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d < best) { best = d; bt = t; bi = i; }
  }
  return { d: best, i: bi, t: bt };
}

export function pointOnPolyline(pl: V2[], s: number) {
  // s = distance along the line
  for (let i = 0; i < pl.length - 1; i++) {
    const [ax, az] = pl[i]; const [bx, bz] = pl[i + 1]; const l = Math.hypot(bx - ax, bz - az);
    if (s <= l) return { x: ax + ((bx - ax) * s) / l, z: az + ((bz - az) * s) / l, dir: Math.atan2(bx - ax, bz - az) };
    s -= l;
  }
  const [x, z] = pl[pl.length - 1]; const [px, pz] = pl[pl.length - 2]; return { x, z, dir: Math.atan2(x - px, z - pz) };
}
export function polylineLength(pl: V2[]) { let l = 0; for (let i = 0; i < pl.length - 1; i++) l += Math.hypot(pl[i + 1][0] - pl[i][0], pl[i + 1][1] - pl[i][1]); return l; }

/** Street names for the grid lines (some change name along the way, like in Berlin) */
const X_NAMES: Record<number, string> = {
  [-1100]: 'Kaiserdamm', [-990]: 'Wilmersdorfer Straße', [-880]: 'Joachimsthaler Straße', [-770]: 'Budapester Straße', [-660]: 'Hofjägerallee', [-550]: 'Altonaer Straße', [-440]: 'Spreeweg',
  [-330]: 'Bellevueallee', [-220]: 'Entlastungsstraße', [-110]: 'Yitzhak-Rabin-Straße', 0: 'Ebertstraße', 110: 'Wilhelmstraße', 220: 'Friedrichstraße', 330: 'Charlottenstraße', 440: 'Markgrafenstraße',
  550: 'Spandauer Straße', 660: 'Alexanderstraße', 770: 'Lindenstraße', 880: 'Prinzenstraße', 990: 'Kottbusser Damm', 1100: 'Adalbertstraße', 1210: 'Manteuffelstraße', 1320: 'Lausitzer Straße',
  1430: 'Warschauer Straße', 1540: 'Stralauer Allee', 1650: 'Elsenstraße',
};
const Z_NAMES: Record<number, string> = {
  [-440]: 'Torstraße', [-330]: 'Invalidenstraße', [-220]: 'Oranienburger Straße', [-110]: 'Dorotheenstraße', 0: 'Unter den Linden', 110: 'Französische Straße', 220: 'Leipziger Straße', 330: 'Kochstraße',
  440: 'Oranienstraße', 550: 'Skalitzer Straße', 660: 'Wiener Straße', 770: 'Sonnenallee', 880: 'Weserstraße', 990: 'Flughafenstraße', 1100: 'Boddinstraße',
};
export function streetNameX(i: number, z: number) { return X_NAMES[i * CELL] || 'Seitenstraße'; }
export function streetNameZ(j: number, x: number) {
  const z = j * CELL;
  if (z === 0) return x < 0 ? 'Straße des 17. Juni' : x < 560 ? 'Unter den Linden' : 'Karl-Liebknecht-Straße';
  if (z === -110 && x > 790) return 'Karl-Marx-Allee';
  if (z === 440 && x < -600) return 'Kurfürstendamm';
  if (z === 110 && x > 800) return 'Holzmarktstraße';
  return Z_NAMES[z] || 'Nebenstraße';
}
export function streetAt(x: number, z: number) {
  const i = Math.round(x / CELL); const j = Math.round(z / CELL);
  const dx = Math.abs(x - i * CELL); const dz = Math.abs(z - j * CELL);
  return dx < dz ? streetNameX(i, z) : streetNameZ(j, x);
}
