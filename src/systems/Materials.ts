import * as THREE from 'three';
import { facadeTex, shopTex, groundTex, atlasTex, type Style } from './Textures';
import { SHOPS } from './CityGen';

/** Shared materials. DayNight changes their emissive / wetness every frame, so every chunk reacts at once. */
const cache = new Map<string, THREE.Material>();
const once = <T extends THREE.Material>(k: string, f: () => T): T => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k) as T; };
export const nightMats: THREE.MeshStandardMaterial[] = []; // windows, lamps, signs: glow at night
export const wetMats: { m: THREE.MeshStandardMaterial; dry: number; wet: number; color: THREE.Color }[] = [];

export function wallMat(style: Style) {
  return once(`wall-${style}`, () => {
    const t = facadeTex(style);
    const m = new THREE.MeshStandardMaterial({
      map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(0.9, 0.9), roughnessMap: t.rough, emissiveMap: t.emissive, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0,
      vertexColors: true, roughness: style === 'glass' ? 0.25 : 1, metalness: style === 'glass' ? 0.55 : 0, envMapIntensity: style === 'glass' ? 1.4 : 0.8,
    });
    nightMats.push(m); return m;
  });
}
export const shopMat = () => once('shop', () => { const t = shopTex(); const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, roughnessMap: t.rough, emissiveMap: t.emissive, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.15, roughness: 1, envMapIntensity: 1.1 }); nightMats.push(m); (m as any).userData.dayGlow = 0.15; return m; });
export const roofMat = () => once('roof', () => { const t = groundTex('roof'); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, vertexColors: true, roughness: 0.65, metalness: 0.2 }); });
export const gravelMat = () => once('gravel', () => { const t = groundTex('gravel'); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, vertexColors: true, roughness: 1 }); });
export const trimMat = () => once('trim', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
export const awningMat = () => once('awning', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }));
export function signsMat() {
  return once('signs', () => { const t = atlasTex(SHOPS.map((s) => ({ text: s.name, bg: s.bg, fg: s.fg })), 'shops'); const m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.05, roughness: 0.5 }); (m as any).userData.dayGlow = 0.05; (m as any).userData.nightGlow = 0.9; nightMats.push(m); return m; });
}
export function matFor(key: string): THREE.Material {
  if (key.startsWith('wall-')) return wallMat(key.slice(5) as Style);
  if (key === 'signs') return signsMat();
  return ({ shop: shopMat, roof: roofMat, gravel: gravelMat, trim: trimMat, awning: awningMat } as Record<string, () => THREE.Material>)[key]();
}

function ground(kind: Parameters<typeof groundTex>[0], repeat: number, rough: number, color = '#ffffff', wetRough = 0.12) {
  return once(`gr-${kind}-${repeat}-${color}`, () => {
    const t = groundTex(kind); const map = t.map.clone(); map.repeat.set(repeat, repeat); map.needsUpdate = true; const nm = t.normal.clone(); nm.repeat.set(repeat, repeat); nm.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({ map, normalMap: nm, roughness: rough, color: new THREE.Color(color) });
    wetMats.push({ m, dry: rough, wet: wetRough, color: new THREE.Color(color) }); return m;
  });
}
export const asphaltMat = (repeat = 1) => ground('asphalt', repeat, 0.92, '#ffffff', 0.08);
export const pavingMat = () => ground('paving', 1, 0.85, '#ffffff', 0.15);
export const cobbleMat = () => ground('cobble', 1, 0.8, '#ffffff', 0.15);
export const grassMat = () => ground('grass', 1, 1, '#ffffff', 0.6);
export const courtMat = () => ground('gravel', 1, 1, '#c7cbb8', 0.5);

export const lampHeadMat = () => once('lamphead', () => { const m = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: new THREE.Color('#ffd28a'), emissiveIntensity: 0.1, roughness: 0.3 }); (m as any).userData.dayGlow = 0.1; (m as any).userData.nightGlow = 6; nightMats.push(m); return m; });
export const metalMat = (c = '#3b4248') => once(`metal${c}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.7 }));
export const plainMat = (c: string, rough = 0.85, metal = 0) => once(`p${c}${rough}${metal}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal }));
export const glassMat = () => once('glass', () => new THREE.MeshStandardMaterial({ color: '#9fb8c6', roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.45, envMapIntensity: 1.6 }));

export function registerWet(m: THREE.MeshStandardMaterial, dry: number, wet: number) { wetMats.push({ m, dry, wet, color: m.color.clone() }); }

/** called every frame by DayNight */
export function updateMaterials(night: number, wet: number) {
  for (const m of nightMats) {
    const ud = (m as any).userData; const day = ud.dayGlow ?? 0; const nightG = ud.nightGlow ?? 1.25;
    m.emissiveIntensity = day + (nightG - day) * night;
  }
  for (const w of wetMats) { w.m.roughness = w.dry + (w.wet - w.dry) * wet; w.m.color.copy(w.color).multiplyScalar(1 - 0.35 * wet); }
}
