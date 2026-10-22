import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { VIADUCT, VIADUCT_H, STATIONS, pointOnPolyline, polylineLength } from '../data/cityDistricts';
import { RT, type Interactable } from '../systems/runtime';
import { plainMat, metalMat, glassMat } from '../systems/Materials';
import { signTex } from '../systems/Textures';
import { extraColliders } from './BerlinEnvironment';
import { useGame } from '../store';
import { mergeGeos } from './Building';

export const S_LEN = polylineLength(VIADUCT);
const brickTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d')!; g.fillStyle = '#8f3d2a'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 128; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < 128; x += 16) { g.fillStyle = `hsl(${10 + Math.random() * 10},45%,${30 + Math.random() * 12}%)`; g.fillRect(x + 1, y + 1, 14, 6); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();

/** distance along the viaduct of each station */
export const STATION_S = STATIONS.map((s) => { let best = 0; let bd = 1e9; for (let d = 0; d < S_LEN; d += 2) { const p = pointOnPolyline(VIADUCT, d); const dd = Math.hypot(p.x - s.at[0], p.z - s.at[1]); if (dd < bd) { bd = dd; best = d; } } return best; });

export function SBahn() {
  const data = useMemo(() => {
    const deck: THREE.BufferGeometry[] = []; const piers: THREE.BufferGeometry[] = []; const rails: THREE.BufferGeometry[] = [];
    for (let d = 0; d < S_LEN; d += 10) {
      const p = pointOnPolyline(VIADUCT, d + 5); const g = new THREE.BoxGeometry(11, 1.4, 10.4); g.rotateY(p.dir); g.translate(p.x, VIADUCT_H, p.z); deck.push(g);
      const pr = new THREE.BoxGeometry(10.4, VIADUCT_H - 0.5, 1.6); pr.rotateY(p.dir); const q = pointOnPolyline(VIADUCT, d); pr.translate(q.x, (VIADUCT_H - 0.5) / 2, q.z); piers.push(pr);
      extraColliders.push({ x: q.x, y: VIADUCT_H / 2, z: q.z, w: 10.4, h: VIADUCT_H, d: 1.6, ry: p.dir });
      for (const o of [-3.2, -1.8, 1.8, 3.2]) { const r = new THREE.BoxGeometry(0.1, 0.15, 10.2); r.translate(o, 0, 0); r.rotateY(p.dir); r.translate(p.x, VIADUCT_H + 0.78, p.z); rails.push(r); }
    }
    const uv = (g: THREE.BufferGeometry) => { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * 3, a.getY(i) * 2); return g; };
    // stations: a platform roof up on the viaduct and an entrance on the street
    const roofs: THREE.BufferGeometry[] = []; const kiosks: { x: number; z: number; ry: number; name: string }[] = [];
    STATIONS.forEach((s, k) => {
      const p = pointOnPolyline(VIADUCT, STATION_S[k]); const r = new THREE.BoxGeometry(12, 0.3, 40); r.rotateY(p.dir); r.translate(p.x, VIADUCT_H + 5, p.z); roofs.push(r);
      for (const o of [-14, 0, 14]) { const c = new THREE.BoxGeometry(0.3, 4.3, 0.3); c.translate(0, 0, o); c.rotateY(p.dir); c.translate(p.x, VIADUCT_H + 2.85, p.z); roofs.push(c); }
      const side = Math.cos(p.dir) * 9; const sidez = -Math.sin(p.dir) * 9; kiosks.push({ x: p.x + side, z: p.z + sidez, ry: p.dir, name: s.name });
    });
    return { deck: uv(mergeGeos(deck)), piers: uv(mergeGeos(piers)), rails: mergeGeos(rails), roofs: mergeGeos(roofs), kiosks };
  }, []);
  const brick = useMemo(() => new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.9 }), []);
  // the entrances: a green "S" sign; E opens the travel map
  const its = useMemo<Interactable[]>(() => data.kiosks.map((k, i) => ({ id: `sbahn-${i}`, label: `S-Bahn ${k.name} – travel`, key: 'E', pos: new THREE.Vector3(k.x, 0, k.z), radius: 4.5, run: () => { RT.station = i; useGame.getState().setPanel('sbahn'); document.exitPointerLock?.(); } })), [data]);
  useEffect(() => { RT.interactables.push(...its); return () => { for (const it of its) RT.interactables.splice(RT.interactables.indexOf(it), 1); }; }, [its]);
  const sMat = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex('S', '#008d4f', '#ffffff', 128, 128, '800 110px Arial'), emissive: new THREE.Color('#00a65a'), emissiveIntensity: 0.3 }), []);
  const nameMats = useMemo(() => data.kiosks.map((k) => new THREE.MeshStandardMaterial({ map: signTex(k.name, '#008d4f', '#ffffff', 512, 96), side: THREE.DoubleSide })), [data]);
  // two trains, red and ochre like the Berlin S-Bahn
  const trains = useMemo(() => [0, 1].map((k) => { const g = new THREE.Group(); for (let c = 0; c < 4; c++) { const car = new THREE.Group(); car.position.z = -c * 17; g.add(car); const lower = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 16.4), plainMat('#9e1b1e', 0.4, 0.2)); lower.position.y = 1.1; car.add(lower); const upper = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 16.4), plainMat('#e0a422', 0.4, 0.2)); upper.position.y = 2.65; car.add(upper); const win = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.8, 15), glassMat()); win.position.y = 2.6; car.add(win); const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.35, 16.2), metalMat('#6d7378')); roof.position.y = 3.55; car.add(roof); } g.children.forEach((c) => c.traverse((m) => { if ((m as THREE.Mesh).isMesh) (m as THREE.Mesh).castShadow = true; })); return g; }), []);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    trains.forEach((g, k) => {
      // run along the line and back, stopping 20 s at every station
      const period = S_LEN / 14 + STATIONS.length * 20; const ph = ((t.current + k * period * 0.5) % (period * 2)) / period; const back = ph > 1; const u = back ? 2 - ph : ph;
      let s = u * S_LEN; const stop = STATION_S.find((st) => Math.abs(st - s) < 25); if (stop !== undefined) s = stop + (s - stop) * 0.2;
      const p = pointOnPolyline(VIADUCT, Math.min(S_LEN - 1, Math.max(1, s))); const off = k ? -1.8 : 1.8; const nx = Math.cos(p.dir); const nz = -Math.sin(p.dir);
      g.position.set(p.x + nx * off, VIADUCT_H + 0.85, p.z + nz * off); g.rotation.y = p.dir + (back ? Math.PI : 0);
    });
  });
  return (
    <group>
      <mesh geometry={data.deck} material={brick} castShadow receiveShadow />
      <mesh geometry={data.piers} material={brick} castShadow receiveShadow />
      <mesh geometry={data.rails} material={metalMat('#7b8187')} />
      <mesh geometry={data.roofs} material={metalMat('#8d969c')} castShadow />
      {data.kiosks.map((k, i) => (
        <group key={i} position={[k.x, 0.15, k.z]} rotation-y={k.ry}>
          <mesh position={[0, 1.6, 0]} castShadow><boxGeometry args={[3.2, 3.2, 3.2]} /><meshStandardMaterial color="#d9d3c7" roughness={0.8} /></mesh>
          <mesh position={[0, 4.4, 0]} material={sMat}><boxGeometry args={[1.1, 1.1, 1.1]} /></mesh>
          <mesh position={[0, 2.6, 1.62]} material={nameMats[i]}><planeGeometry args={[3, 0.56]} /></mesh>
          <mesh position={[0, 1.1, 1.61]}><planeGeometry args={[1.4, 2.2]} /><meshStandardMaterial color="#202830" roughness={0.2} metalness={0.5} /></mesh>
        </group>
      ))}
      {trains.map((g, k) => <primitive key={k} object={g} />)}
    </group>
  );
}

export function travelTo(i: number) {
  const k = STATIONS[i]; const p = pointOnPolyline(VIADUCT, STATION_S[i]); const nx = Math.cos(p.dir); const nz = -Math.sin(p.dir);
  const g = useGame.getState(); g.setPanel(null); g.set({ loading: `S-Bahn → ${k.name}` });
  window.setTimeout(() => { RT.teleport = { x: p.x + nx * 9 + Math.sin(p.dir) * 3, y: 0.2, z: p.z + nz * 9 + Math.cos(p.dir) * 3, heading: p.dir }; RT.cam.yaw = p.dir + Math.PI; }, 300);
  window.setTimeout(() => { g.set({ loading: null }); g.showToast(`🚆 ${k.name}`); }, 1400);
}
