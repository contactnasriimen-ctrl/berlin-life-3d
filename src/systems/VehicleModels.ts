import * as THREE from 'three';
import { nightMats } from './Materials';
import { signTex } from './Textures';
import { mergeByMaterial } from './merge';

export type CarType = 'hatch' | 'sedan' | 'van' | 'taxi' | 'bus';
export const CAR_DIM: Record<CarType, { w: number; h: number; l: number; maxV: number }> = {
  hatch: { w: 1.8, h: 1.48, l: 4.1, maxV: 30 }, sedan: { w: 1.82, h: 1.46, l: 4.6, maxV: 34 }, van: { w: 2.0, h: 2.4, l: 5.6, maxV: 25 }, taxi: { w: 1.82, h: 1.46, l: 4.8, maxV: 32 }, bus: { w: 2.55, h: 4.1, l: 11.6, maxV: 16 },
};
export const CAR_COLORS = ['#e9eaec', '#1c1f24', '#5d6670', '#9aa3ab', '#2a3f66', '#7b1d23', '#2f5a3b', '#c7c2b4', '#38485a', '#b8b8b8', '#123a6b', '#d3a12a'];

// shape points: [along the car (front = +), height]
const PROFILES: Record<'hatch' | 'sedan' | 'van', [number, number][]> = {
  hatch: [[-2.0, 0.32], [-2.06, 0.62], [-2.02, 1.02], [-1.8, 1.42], [0.35, 1.47], [0.95, 1.0], [1.85, 0.86], [2.05, 0.62], [2.0, 0.32]],
  sedan: [[-2.25, 0.32], [-2.32, 0.72], [-2.12, 0.98], [-1.45, 1.02], [-0.95, 1.43], [0.55, 1.45], [1.2, 0.98], [2.1, 0.84], [2.3, 0.6], [2.25, 0.32]],
  van: [[-2.75, 0.34], [-2.8, 2.35], [1.25, 2.38], [1.8, 1.5], [2.7, 1.05], [2.8, 0.6], [2.75, 0.34]],
};
const CABIN: Record<'hatch' | 'sedan' | 'van', [number, number][]> = {
  hatch: [[-1.92, 0.98], [-1.72, 1.4], [0.33, 1.44], [0.9, 0.98]],
  sedan: [[-1.4, 0.98], [-0.92, 1.4], [0.53, 1.42], [1.15, 0.96]],
  van: [[1.28, 2.25], [1.78, 1.5], [1.3, 1.5]],
};

const geoCache = new Map<string, THREE.BufferGeometry>();
function extrude(key: string, pts: [number, number][], width: number, bevel: number) {
  if (geoCache.has(key)) return geoCache.get(key)!;
  const s = new THREE.Shape(); pts.forEach(([z, y], i) => (i ? s.lineTo(-z, y) : s.moveTo(-z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 8 });
  g.rotateY(Math.PI / 2); g.translate(-(width - bevel * 2) / 2, 0, 0); g.computeVertexNormals(); geoCache.set(key, g); return g;
}

const matCache = new Map<string, THREE.Material>();
const mat = (k: string, f: () => THREE.Material) => { if (!matCache.has(k)) matCache.set(k, f()); return matCache.get(k)!; };
export const paint = (c: string) => mat(`paint${c}`, () => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }));
const glass = () => mat('glass', () => new THREE.MeshPhysicalMaterial({ color: '#141b22', metalness: 0.2, roughness: 0.04, envMapIntensity: 1.8, clearcoat: 1 }));
const tyre = () => mat('tyre', () => new THREE.MeshStandardMaterial({ color: '#16181b', roughness: 0.9 }));
const rim = () => mat('rim', () => new THREE.MeshStandardMaterial({ color: '#c9ced3', metalness: 0.9, roughness: 0.25 }));
const trim = () => mat('trim', () => new THREE.MeshStandardMaterial({ color: '#202428', roughness: 0.6 }));
export const headM = () => mat('head', () => { const m = new THREE.MeshStandardMaterial({ color: '#fff8e6', emissive: new THREE.Color('#fff2cc'), emissiveIntensity: 0.2, roughness: 0.1 }); (m as any).userData = { dayGlow: 0.2, nightGlow: 5 }; nightMats.push(m); return m; });
export const tailM = () => mat('tail', () => { const m = new THREE.MeshStandardMaterial({ color: '#8a1218', emissive: new THREE.Color('#ff2020'), emissiveIntensity: 0.2, roughness: 0.2 }); (m as any).userData = { dayGlow: 0.25, nightGlow: 3 }; nightMats.push(m); return m; });

function wheel(g: THREE.Group, x: number, z: number, r = 0.34) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.26, 22), tyre()); t.rotation.z = Math.PI / 2; t.position.set(x, r, z); t.castShadow = true; g.add(t);
  const rm = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.27, 14), rim()); rm.rotation.z = Math.PI / 2; rm.position.set(x * 1.01, r, z); g.add(rm);
  t.name = 'wheel'; return t;
}

/** builds the visual car; forward is +z, origin on the ground in the middle */
export function makeCar(type: CarType, color: string) {
  const g = new THREE.Group(); const D = CAR_DIM[type];
  if (type === 'bus') {
    // BVG double-decker
    const yellow = paint('#f2c200'); const body = new THREE.Mesh(new THREE.BoxGeometry(D.w, D.h - 0.4, D.l), yellow); body.position.y = 0.4 + (D.h - 0.4) / 2; body.castShadow = true; g.add(body);
    for (const y of [1.45, 3.15]) for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.95, D.l - 1.2), glass()); w.position.set(sd * (D.w / 2 + 0.005), y, -0.3); g.add(w); }
    const front = new THREE.Mesh(new THREE.BoxGeometry(D.w - 0.2, 2.6, 0.02), glass()); front.position.set(0, 2.3, D.l / 2 + 0.005); g.add(front);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.32), new THREE.MeshBasicMaterial({ map: signTex('100 Alexanderplatz', '#111111', '#ffb000', 512, 90), toneMapped: false })); sign.position.set(0, 3.82, D.l / 2 + 0.02); g.add(sign);
    for (const z of [3.9, -3.6]) for (const x of [-1.05, 1.05]) wheel(g, x, z, 0.48);
    for (const x of [-0.85, 0.85]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.05), headM()); h.position.set(x, 0.75, D.l / 2 + 0.02); g.add(h); const t = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.05), tailM()); t.position.set(x, 0.9, -D.l / 2 - 0.02); g.add(t); }
    return mergeByMaterial(g);
  }
  const shape = type === 'taxi' ? 'sedan' : type; const c = type === 'taxi' ? '#efe6c4' : color;
  const body = new THREE.Mesh(extrude(`b${shape}`, PROFILES[shape as 'hatch'], D.w, 0.09), paint(c)); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const cab = new THREE.Mesh(extrude(`c${shape}`, CABIN[shape as 'hatch'], D.w - 0.1, 0.05), glass()); g.add(cab);
  if (shape !== 'van') { const pil = new THREE.Mesh(new THREE.BoxGeometry(D.w - 0.02, 0.42, 0.1), paint(c)); pil.position.set(0, 1.2, shape === 'hatch' ? -0.55 : -0.2); g.add(pil); }
  else { for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 1.4), glass()); w.position.set(sd * (D.w / 2 + 0.01), 1.85, 0.6); g.add(w); } }
  const wz = shape === 'hatch' ? 1.3 : shape === 'van' ? 1.85 : 1.42;
  for (const z of [wz, -wz]) for (const x of [-0.8, 0.8]) wheel(g, x * (D.w / 1.8), z);
  const fz = PROFILES[shape as 'hatch'].reduce((m, p) => Math.max(m, p[0]), 0); const bz = PROFILES[shape as 'hatch'].reduce((m, p) => Math.min(m, p[0]), 0);
  for (const x of [-0.6, 0.6]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.13, 0.06), headM()); h.position.set(x * (D.w / 1.8), shape === 'van' ? 0.95 : 0.74, fz + 0.04); g.add(h); const t = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), tailM()); t.position.set(x * (D.w / 1.8), shape === 'van' ? 1.0 : 0.82, bz - 0.04); g.add(t); }
  for (const z of [fz + 0.02, bz - 0.02]) { const bp = new THREE.Mesh(new THREE.BoxGeometry(D.w + 0.02, 0.18, 0.14), trim()); bp.position.set(0, 0.44, z); g.add(bp); }
  for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.2), paint(c)); m.position.set(sd * (D.w / 2 + 0.08), 1.0, shape === 'van' ? 1.2 : 0.7); g.add(m); }
  if (type === 'taxi') { const ts = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.25), new THREE.MeshStandardMaterial({ map: signTex('TAXI', '#ffd500', '#13202b', 256, 80), emissive: new THREE.Color('#ffd500'), emissiveIntensity: 0.3 })); ts.position.set(0, 1.55, -0.1); g.add(ts); }
  return mergeByMaterial(g);
}
