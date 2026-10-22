import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { CITY, type Box } from '../systems/CityGen';
import { CELL, ROAD_W, WALK_W, WORLD, SPREE, SPREE_W, type V2 } from '../data/cityDistricts';
import { registerWet, pavingMat, grassMat, courtMat, lampHeadMat, metalMat, plainMat, glassMat } from '../systems/Materials';
import { groundTex, posterTex, atlasTex } from '../systems/Textures';
import { signalState } from '../systems/TrafficRules';
import { RT } from '../systems/runtime';
import { useGame } from '../store';
import { QUALITY } from '../systems/Quality';
import { mergeGeos } from './Building';

/** boxes added by landmarks, the S-Bahn and interiors before the colliders are built */
export const extraColliders: Box[] = [];

export type Inst = [number, number, number, number?, number?, number?, number?]; // x y z ry sx sy sz
export function Instanced({ geo, mat, items, shadow = true, receive = true, colors }: { geo: THREE.BufferGeometry; mat: THREE.Material; items: Inst[]; shadow?: boolean; receive?: boolean; colors?: THREE.Color[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return; const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0); const p = new THREE.Vector3(); const s = new THREE.Vector3();
    items.forEach(([x, y, z, ry = 0, sx = 1, sy = 1, sz = 1], i) => { q.setFromAxisAngle(up, ry); m4.compose(p.set(x, y, z), q, s.set(sx, sy, sz)); m.setMatrixAt(i, m4); if (colors) m.setColorAt(i, colors[i]); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere();
  }, [items, colors]);
  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow={shadow} receiveShadow={receive} />;
}

function ribbon(pl: V2[], half: number, y: number, step = 6) {
  const pts: { x: number; z: number; nx: number; nz: number; s: number }[] = []; let s = 0;
  for (let i = 0; i < pl.length - 1; i++) {
    const [ax, az] = pl[i]; const [bx, bz] = pl[i + 1]; const len = Math.hypot(bx - ax, bz - az); const ux = (bx - ax) / len; const uz = (bz - az) / len;
    for (let t = 0; t < len; t += step) pts.push({ x: ax + ux * t, z: az + uz * t, nx: -uz, nz: ux, s: s + t });
    s += len;
  }
  const last = pl[pl.length - 1]; const prev = pts[pts.length - 1]; pts.push({ x: last[0], z: last[1], nx: prev.nx, nz: prev.nz, s });
  const pos: number[] = []; const uv: number[] = []; const idx: number[] = [];
  pts.forEach((p, k) => { pos.push(p.x - p.nx * half, y, p.z - p.nz * half, p.x + p.nx * half, y, p.z + p.nz * half); uv.push(0, p.s / 20, (half * 2) / 20, p.s / 20); if (k) { const a = (k - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return { g, pts };
}

function riverMask() {
  const W = 2048; const H = Math.round((W * (WORLD.z1 - WORLD.z0)) / (WORLD.x1 - WORLD.x0)); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); const sx = W / (WORLD.x1 - WORLD.x0); const sz = H / (WORLD.z1 - WORLD.z0);
  g.strokeStyle = '#000'; g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = (SPREE_W - 1) * sx; g.beginPath();
  SPREE.forEach(([x, z], i) => { const px = (x - WORLD.x0) * sx; const pz = (z - WORLD.z0) * sz; if (i) g.lineTo(px, pz); else g.moveTo(px, pz); }); g.stroke();
  const t = new THREE.CanvasTexture(c); t.flipY = false; return t;
}

export function BerlinEnvironment() {
  const quality = useGame((s) => s.settings.quality); const Q = QUALITY[quality];
  const data = useMemo(() => {
    // ground: asphalt everywhere in the city, cut where the river flows
    const gw = WORLD.x1 - WORLD.x0; const gd = WORLD.z1 - WORLD.z0;
    const groundGeo = new THREE.PlaneGeometry(gw, gd, 1, 1); groundGeo.rotateX(-Math.PI / 2);
    const at = groundTex('asphalt'); const am = at.map.clone(); am.repeat.set(gw / 9, gd / 9); am.needsUpdate = true; const an = at.normal.clone(); an.repeat.set(gw / 9, gd / 9); an.needsUpdate = true;
    const asphalt = new THREE.MeshStandardMaterial({ map: am, normalMap: an, roughness: 0.92 }); registerWet(asphalt, 0.92, 0.07);
    asphalt.alphaMap = riverMask(); asphalt.alphaTest = 0.5; (asphalt.alphaMap as THREE.Texture).repeat.set(1, 1);
    // uv of the plane: (0,0) at the north-west corner after flipY=false mask
    const uvA = groundGeo.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setY(i, 1 - uvA.getY(i));
    // pavements / grass / courtyards merged by kind
    const parts: Record<string, THREE.BufferGeometry[]> = { pave: [], grass: [], court: [] };
    for (const s of CITY.slabs) { const h = s.kind === 'court' ? 0.04 : 0.15; const g = new THREE.BoxGeometry(s.x1 - s.x0, h, s.z1 - s.z0); g.translate((s.x0 + s.x1) / 2, h / 2 + (s.kind === 'court' ? 0.15 : 0), (s.z0 + s.z1) / 2); worldUV(g); parts[s.kind].push(g); }
    // river: water, quay walls, parapets
    const water = ribbon(SPREE, SPREE_W / 2 + 1, -1.4).g;
    const wallsL = ribbon(SPREE, SPREE_W / 2 - 0.4, 0).pts;
    const quay: THREE.BufferGeometry[] = [];
    for (const side of [1, -1]) { const pos: number[] = []; const idx: number[] = []; wallsL.forEach((p, k) => { const x = p.x + p.nx * side * (SPREE_W / 2 - 0.4); const z = p.z + p.nz * side * (SPREE_W / 2 - 0.4); pos.push(x, 0.1, z, x, -2.2, z); if (k) { const a = (k - 1) * 2; if (side > 0) idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const uv: number[] = []; wallsL.forEach((p) => uv.push(p.s / 6, 0.4, p.s / 6, 0)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); quay.push(g); }
    // bridges over the Spree
    const bridges: THREE.BufferGeometry[] = []; const bridgeSides: THREE.BufferGeometry[] = []; const bridgeRail: Inst[] = [];
    for (const e of CITY.edges) if (e.bridge) {
      const ax = e.a[0] * CELL; const az = e.a[1] * CELL; const L = e.bridge.s1 - e.bridge.s0; const s = (e.bridge.s0 + e.bridge.s1) / 2; const W = ROAD_W + WALK_W * 2;
      const cx = ax + (e.horiz ? s : 0); const cz = az + (e.horiz ? 0 : s);
      const deck = new THREE.BoxGeometry(e.horiz ? L : W, 1.2, e.horiz ? W : L); deck.translate(cx, -0.58, cz); worldUV(deck); bridges.push(deck);
      for (const side of [1, -1]) { const o = W / 2 - 0.35; const g = new THREE.BoxGeometry(e.horiz ? L : 0.6, 1.1, e.horiz ? 0.6 : L); g.translate(cx + (e.horiz ? 0 : side * o), 0.55, cz + (e.horiz ? side * o : 0)); worldUV(g); bridgeSides.push(g); }
      const pier = new THREE.BoxGeometry(e.horiz ? 3 : W, 2.5, e.horiz ? W : 3); pier.translate(cx, -2.2, cz); bridgeSides.push(pier);
    }
    // markings: dashed centre lines, zebra crossings, stop lines
    const marks: Inst[] = [];
    for (const e of CITY.edges) {
      const ax = e.a[0] * CELL; const az = e.a[1] * CELL;
      for (let s = 14; s < CELL - 14; s += 8) marks.push(e.horiz ? [ax + s, 0.03, az, 0, 3, 1, 0.16] : [ax, 0.03, az + s, 0, 0.16, 1, 3]);
      for (const end of [10.5, CELL - 10.5]) {
        for (let k = -5; k <= 5; k++) marks.push(e.horiz ? [ax + end, 0.031, az + k * 1.2, 0, 2.6, 1, 0.55] : [ax + k * 1.2, 0.031, az + end, 0, 0.55, 1, 2.6]);
        const st = end < CELL / 2 ? end + 2.2 : end - 2.2; const off = end < CELL / 2 ? -3.3 : 3.3;
        marks.push(e.horiz ? [ax + st, 0.031, az + off, 0, 0.35, 1, 6.6] : [ax - off, 0.031, az + st, 0, 6.6, 1, 0.35]);
      }
    }
    return { groundGeo, asphalt, pave: mergeGeos(parts.pave), grass: mergeGeos(parts.grass), court: mergeGeos(parts.court), water, quay, bridges: bridges.length ? mergeGeos(bridges) : null, bridgeSides: bridgeSides.length ? mergeGeos(bridgeSides) : null, marks, bridgeRail };
  }, []);

  const farGrass = useMemo(() => { const m = grassMat().clone(); m.map = (m.map as THREE.Texture).clone(); m.map.repeat.set(300, 300); m.map.needsUpdate = true; m.normalMap = null; return m; }, []);
  // water ripples
  const waterMat = useMemo(() => { const t = groundTex('water'); const n = t.normal.clone(); n.repeat.set(1, 1); n.needsUpdate = true; return new THREE.MeshStandardMaterial({ color: '#2f4d57', roughness: 0.06, metalness: 0.15, normalMap: n, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.3 }); }, []);
  const stoneMat = useMemo(() => { const t = groundTex('cobble'); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, color: '#b8ad9a', roughness: 0.9 }); }, []);
  useFrame((_, dt) => { const n = waterMat.normalMap!; n.offset.x += dt * 0.012; n.offset.y += dt * 0.02; });

  return (
    <group>
      <mesh geometry={data.groundGeo} material={data.asphalt} receiveShadow position={[(WORLD.x0 + WORLD.x1) / 2, 0, (WORLD.z0 + WORLD.z1) / 2]} />
      {/* the countryside around the city: four strips, so nothing lies under the streets or the river */}
      {([[WORLD.x0 - 2000, WORLD.z0 - 3000, WORLD.x0, WORLD.z1 + 3000], [WORLD.x1, WORLD.z0 - 3000, WORLD.x1 + 2000, WORLD.z1 + 3000], [WORLD.x0, WORLD.z0 - 3000, WORLD.x1, WORLD.z0], [WORLD.x0, WORLD.z1, WORLD.x1, WORLD.z1 + 3000]] as const).map(([x0, z0, x1, z1], k) => (
        <mesh key={k} rotation-x={-Math.PI / 2} position={[(x0 + x1) / 2, -0.02, (z0 + z1) / 2]} receiveShadow material={farGrass}><planeGeometry args={[x1 - x0, z1 - z0]} /></mesh>
      ))}
      <mesh geometry={data.pave} material={pavingMat()} receiveShadow castShadow={false} />
      <mesh geometry={data.grass} material={grassMat()} receiveShadow />
      <mesh geometry={data.court} material={courtMat()} receiveShadow />
      <mesh geometry={data.water} material={waterMat} receiveShadow />
      {data.quay.map((g, k) => <mesh key={k} geometry={g} material={stoneMat} receiveShadow />)}
      {data.bridges && <mesh geometry={data.bridges} material={stoneMat} receiveShadow castShadow />}
      {data.bridgeSides && <mesh geometry={data.bridgeSides} material={stoneMat} receiveShadow castShadow />}
      <Instanced geo={unitPlane} mat={plainMat('#efeee8', 0.7)} items={data.marks} shadow={false} />
      <RiverParapets />
      <Trees density={Q.trees} />
      <StreetLamps />
      <TrafficLights />
      <StreetFurniture />
      <StaticColliders />
    </group>
  );
}

const unitPlane = (() => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; })();

function worldUV(g: THREE.BufferGeometry, scale = 4) {
  // planar UVs from world position so pavement patterns line up across pieces
  const p = g.attributes.position; const n = g.attributes.normal; const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const ny = Math.abs(n.getY(i)); const nx = Math.abs(n.getX(i)); if (ny > 0.5) uv.setXY(i, p.getX(i) / scale, p.getZ(i) / scale); else if (nx > 0.5) uv.setXY(i, p.getZ(i) / scale, p.getY(i) / scale); else uv.setXY(i, p.getX(i) / scale, p.getY(i) / scale); }
}

function RiverParapets() {
  const items = useMemo(() => CITY.banks.map((b) => [b.x, 0.5, b.z, b.ry, 0.55, 1, b.len] as Inst), []);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return <Instanced geo={geo} mat={plainMat('#b9ae9b', 0.85)} items={items} />;
}

/** street and park trees: only the ones near the camera are drawn (the list is refreshed as you move) */
function Trees({ density }: { density: number }) {
  const { trunk, crowns, all } = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.16, 0.26, 4.2, 7); trunk.translate(0, 2.1, 0);
    const crown = (seed: number) => { const parts: THREE.BufferGeometry[] = []; let s2 = seed; const r = () => { s2 = (s2 * 16807) % 2147483647; return s2 / 2147483647; }; for (let k = 0; k < 4; k++) { const g = new THREE.IcosahedronGeometry(1.6 + r() * 0.8, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const f = 0.85 + r() * 0.3; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.85, p.getZ(i) * f); } g.computeVertexNormals(); g.translate((r() - 0.5) * 2.2, 5.2 + r() * 2, (r() - 0.5) * 2.2); parts.push(g); } return mergeGeos(parts); };
    return { trunk, crowns: [crown(3), crown(7), crown(11)], all: CITY.trees };
  }, []);
  const MAX = 2600; const tr = useRef<THREE.InstancedMesh>(null); const cr = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
  const leafMats = useMemo(() => ['#4d7d34', '#5b8a3a', '#416f30'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })), []);
  const last = useRef(new THREE.Vector3(1e9, 0, 0)); const m4 = useMemo(() => new THREE.Matrix4(), []); const q = useMemo(() => new THREE.Quaternion(), []); const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useFrame(() => {
    const cam = RT.camObj?.position; if (!cam || !tr.current) return; if (cam.distanceToSquared(last.current) < 15 * 15) return; last.current.copy(cam);
    const R2 = (180 + 260 * density) ** 2; let n = 0; const nc = [0, 0, 0];
    for (let k = 0; k < all.length && n < MAX; k++) { const [x, z, sc] = all[k]; if ((x - cam.x) ** 2 + (z - cam.z) ** 2 > R2) continue; q.setFromAxisAngle(up, k); m4.compose(new THREE.Vector3(x, 0.15, z), q, new THREE.Vector3(sc, sc, sc)); tr.current.setMatrixAt(n++, m4); const v = k % 3; cr[v].current!.setMatrixAt(nc[v]++, m4); }
    tr.current.count = n; tr.current.instanceMatrix.needsUpdate = true; cr.forEach((r, v) => { r.current!.count = nc[v]; r.current!.instanceMatrix.needsUpdate = true; });
  });
  return (
    <>
      <instancedMesh ref={tr} args={[trunk, plainMat('#5d4630', 0.95), MAX]} castShadow receiveShadow frustumCulled={false} />
      {crowns.map((g, k) => <instancedMesh key={k} ref={cr[k]} args={[g, leafMats[k], MAX]} castShadow receiveShadow frustumCulled={false} />)}
    </>
  );
}

function StreetLamps() {
  const geos = useMemo(() => {
    const pole = new THREE.CylinderGeometry(0.07, 0.11, 5.6, 8); pole.translate(0, 2.8, 0);
    const arm = new THREE.BoxGeometry(0.08, 0.08, 1.4); arm.translate(0, 5.5, 0.65);
    const head = new THREE.CylinderGeometry(0.35, 0.22, 0.25, 12); head.translate(0, 5.4, 1.3);
    return { pole: mergeGeos([pole, arm]), head };
  }, []);
  const items = useMemo(() => CITY.lamps.map(([x, z, ry]) => [x, 0.15, z, ry] as Inst), []);
  return (<><Instanced geo={geos.pole} mat={metalMat('#2d3439')} items={items} /><Instanced geo={geos.head} mat={lampHeadMat()} items={items} shadow={false} /></>);
}

function TrafficLights() {
  const { poles, heads, bulbs, bulbInfo } = useMemo(() => {
    const poles: Inst[] = []; const heads: Inst[] = []; const bulbs: Inst[] = []; const bulbInfo: { i: number; j: number; horiz: boolean; color: 'red' | 'yellow' | 'green' }[] = [];
    const o = ROAD_W / 2 + 0.9;
    for (const s of CITY.signals) {
      // one light per approach, on the right-hand corner before the crossing, facing the arriving cars
      const corners: [number, number, number, boolean][] = [[s.x - o, s.z + o, Math.PI / 2, true], [s.x + o, s.z - o, -Math.PI / 2, true], [s.x + o, s.z + o, 0, false], [s.x - o, s.z - o, Math.PI, false]];
      for (const [x, z, ry, horiz] of corners) {
        // ry: the direction the light faces (towards the approaching traffic)
        poles.push([x, 0.15, z, ry]); heads.push([x, 3.3, z, ry]);
        (['red', 'yellow', 'green'] as const).forEach((c, k) => { const fx = Math.sin(ry) * 0.17; const fz = Math.cos(ry) * 0.17; bulbs.push([x + fx, 3.72 - k * 0.38, z + fz, ry]); bulbInfo.push({ i: s.i, j: s.j, horiz, color: c }); });
      }
    }
    return { poles, heads, bulbs, bulbInfo };
  }, []);
  const g = useMemo(() => { const pole = new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8); pole.translate(0, 1.7, 0); const head = new THREE.BoxGeometry(0.34, 1.2, 0.26); head.translate(0, 0.4, 0); const bulb = new THREE.SphereGeometry(0.11, 10, 8); return { pole, head, bulb }; }, []);
  const ref = useRef<THREE.InstancedMesh>(null); const bulbMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const t = useRef(0); const C = useMemo(() => ({ red: new THREE.Color(3, 0.2, 0.15), yellow: new THREE.Color(3, 1.8, 0.1), green: new THREE.Color(0.2, 3, 0.8), off: new THREE.Color(0.06, 0.06, 0.06) }), []);
  useFrame((st, dt) => {
    t.current -= dt; if (t.current > 0 || !ref.current) return; t.current = 0.25; const now = st.clock.elapsedTime;
    bulbInfo.forEach((b, i) => { const s = signalState(b.i, b.j, b.horiz, now); ref.current!.setColorAt(i, s === b.color ? C[b.color] : C.off); });
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  });
  const init = useMemo(() => bulbs.map(() => new THREE.Color(0.06, 0.06, 0.06)), [bulbs]);
  return (
    <>
      <Instanced geo={g.pole} mat={metalMat('#2a3035')} items={poles} />
      <Instanced geo={g.head} mat={plainMat('#1d2226', 0.6)} items={heads} />
      <InstancedBulbs refObj={ref} geo={g.bulb} mat={bulbMat} items={bulbs} colors={init} />
    </>
  );
}
function InstancedBulbs({ refObj, geo, mat, items, colors }: { refObj: React.RefObject<THREE.InstancedMesh>; geo: THREE.BufferGeometry; mat: THREE.Material; items: Inst[]; colors: THREE.Color[] }) {
  useLayoutEffect(() => {
    const m = refObj.current; if (!m) return; const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0);
    items.forEach(([x, y, z, ry = 0], i) => { q.setFromAxisAngle(up, ry); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); m.setMatrixAt(i, m4); m.setColorAt(i, colors[i]); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
  }, [items, colors, refObj]);
  return <instancedMesh ref={refObj} args={[geo, mat, items.length]} />;
}

function StreetFurniture() {
  const d = useMemo(() => {
    const signPole = new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6); signPole.translate(0, 1.6, 0);
    const litfass = new THREE.CylinderGeometry(0.72, 0.72, 2.6, 20, 1, true); litfass.translate(0, 1.45, 0);
    const litTop = mergeGeos([new THREE.CylinderGeometry(0.85, 0.8, 0.25, 20).translate(0, 2.85, 0), new THREE.CylinderGeometry(0.2, 0.62, 0.45, 20).translate(0, 3.2, 0), new THREE.CylinderGeometry(0.8, 0.85, 0.3, 20).translate(0, 0.15, 0)]);
    const bench = mergeGeos([new THREE.BoxGeometry(1.8, 0.08, 0.5).translate(0, 0.46, 0), new THREE.BoxGeometry(1.8, 0.45, 0.06).translate(0, 0.72, -0.24), new THREE.BoxGeometry(0.08, 0.45, 0.45).translate(-0.8, 0.22, 0), new THREE.BoxGeometry(0.08, 0.45, 0.45).translate(0.8, 0.22, 0)]);
    const shelterRoof = new THREE.BoxGeometry(4.2, 0.12, 1.7).translate(0, 2.55, 0); const shelterFrame = mergeGeos([new THREE.BoxGeometry(0.08, 2.5, 0.08).translate(-2, 1.25, -0.7), new THREE.BoxGeometry(0.08, 2.5, 0.08).translate(2, 1.25, -0.7), new THREE.BoxGeometry(0.08, 2.5, 0.08).translate(-2, 1.25, 0.7), new THREE.BoxGeometry(0.08, 2.5, 0.08).translate(2, 1.25, 0.7), new THREE.BoxGeometry(3, 0.06, 0.4).translate(0, 0.5, -0.5), new THREE.CylinderGeometry(0.04, 0.04, 3.2, 6).translate(2.6, 1.6, 0.6)]);
    const shelterGlass = mergeGeos([new THREE.BoxGeometry(4, 2.3, 0.03).translate(0, 1.25, -0.72), new THREE.BoxGeometry(0.03, 2.3, 1.4).translate(-2, 1.25, 0)]);
    const hSign = new THREE.CircleGeometry(0.42, 24).translate(0, 0, 0);
    const table = mergeGeos([new THREE.CylinderGeometry(0.4, 0.4, 0.04, 16).translate(0, 0.75, 0), new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6).translate(0, 0.37, 0)]);
    const chair = mergeGeos([new THREE.BoxGeometry(0.42, 0.04, 0.42).translate(0, 0.45, 0), new THREE.BoxGeometry(0.42, 0.45, 0.04).translate(0, 0.68, -0.2), ...[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([a, b]) => new THREE.CylinderGeometry(0.02, 0.02, 0.45, 5).translate(a, 0.22, b))]);
    const umbrella = mergeGeos([new THREE.ConeGeometry(1.6, 0.5, 10).translate(0, 2.4, 0), new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6).translate(0, 1.2, 0)]);
    const signs: Inst[] = []; const plates = new Map<string, Inst[]>();
    for (const s of CITY.streetSigns) { signs.push([s.x, 0.15, s.z]); if (!plates.has(s.a)) plates.set(s.a, []); if (!plates.has(s.b)) plates.set(s.b, []); plates.get(s.a)!.push([s.x, 3.05, s.z, 0]); plates.get(s.b)!.push([s.x, 2.68, s.z, Math.PI / 2]); }
    const cafes: { tables: Inst[]; chairs: Inst[]; umbrellas: Inst[] } = { tables: [], chairs: [], umbrellas: [] };
    for (const [x, z, ry] of CITY.cafes) for (const k of [-1.6, 1.6]) { const tx = x + Math.cos(ry) * k; const tz = z - Math.sin(ry) * k; cafes.tables.push([tx, 0.15, tz]); cafes.umbrellas.push([tx, 0.15, tz]); cafes.chairs.push([tx + 0.65, 0.15, tz, -Math.PI / 2], [tx - 0.65, 0.15, tz, Math.PI / 2]); }
    return { signPole, litfass, litTop, bench, shelterRoof, shelterFrame, shelterGlass, hSign, table, chair, umbrella, signs, plates, cafes };
  }, []);
  const plates = useMemo(() => { const names = [...d.plates.keys()]; const tex = atlasTex(names.map((n) => ({ text: n, bg: '#1b3f8b', fg: '#ffffff' })), 'streets', 112, '700 56px "Barlow Condensed", Arial'); const parts: THREE.BufferGeometry[] = [];
    names.forEach((name, row) => { for (const [x, y, z, ry = 0] of d.plates.get(name)!) { const g = new THREE.PlaneGeometry(1.6, 0.35); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + 1 - uv.getY(i)) / names.length); g.rotateY(ry); g.translate(x, y, z); parts.push(g); } });
    return { geo: mergeGeos(parts), mat: new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.5 }) }; }, [d]);
  const posterMat = useMemo(() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 384; const g = c.getContext('2d')!; for (let k = 0; k < 4; k++) g.drawImage(posterTex(k).image as CanvasImageSource, k * 256, 0, 256, 384); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }); }, []);
  const hMat = useMemo(() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d')!; g.fillStyle = '#f6d34a'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.fillStyle = '#1b8a4e'; g.font = '800 92px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide }); }, []);
  const lit = useMemo(() => CITY.litfass.map(([x, z]) => [x, 0.15, z] as Inst), []);
  const benches = useMemo(() => CITY.benches.map(([x, z, ry]) => [x, 0.15, z, ry] as Inst), []);
  const stops = useMemo(() => CITY.busStops.map(([x, z, ry]) => [x, 0.15, z, ry] as Inst), []);
  const hs = useMemo(() => CITY.busStops.map(([x, z]) => [x + 2.6, 3.3, z + 0.6, 0] as Inst), []);
  return (
    <>
      <Instanced geo={d.signPole} mat={metalMat('#2a3035')} items={d.signs} />
      <mesh geometry={plates.geo} material={plates.mat} />
      <Instanced geo={d.litfass} mat={posterMat} items={lit} />
      <Instanced geo={d.litTop} mat={plainMat('#1f4d36', 0.6)} items={lit} />
      <Instanced geo={d.bench} mat={plainMat('#7a5432', 0.85)} items={benches} />
      <Instanced geo={d.shelterRoof} mat={plainMat('#e9edf0', 0.5, 0.3)} items={stops} />
      <Instanced geo={d.shelterFrame} mat={metalMat('#9aa3aa')} items={stops} />
      <Instanced geo={d.shelterGlass} mat={glassMat()} items={stops} shadow={false} />
      <Instanced geo={d.hSign} mat={hMat} items={hs} shadow={false} />
      <Instanced geo={d.table} mat={metalMat('#d8d8d8')} items={d.cafes.tables} />
      <Instanced geo={d.chair} mat={plainMat('#3a2a1e', 0.8)} items={d.cafes.chairs} />
      <Instanced geo={d.umbrella} mat={plainMat('#e9e2d0', 0.9)} items={d.cafes.umbrellas} />
    </>
  );
}

/** every static collider of the city, created once with the Rapier API (fast even for thousands of boxes) */
function StaticColliders() {
  const { world, rapier } = useRapier();
  useEffect(() => {
    const body = world.createRigidBody(rapier.RigidBodyDesc.fixed());
    world.createCollider(rapier.ColliderDesc.cuboid((WORLD.x1 - WORLD.x0) / 2 + 2000, 1, (WORLD.z1 - WORLD.z0) / 2 + 2000).setTranslation((WORLD.x0 + WORLD.x1) / 2, -1, (WORLD.z0 + WORLD.z1) / 2), body);
    const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0);
    for (const b of [...CITY.colliders, ...extraColliders]) {
      q.setFromAxisAngle(up, b.ry || 0);
      world.createCollider(rapier.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(b.x, b.y, b.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }), body);
    }
    // the world edge
    for (const [x, z, w, d] of [[WORLD.x0 - 1, 0, 2, 4000], [WORLD.x1 + 1, 0, 2, 4000], [0, WORLD.z0 - 1, 4000, 2], [0, WORLD.z1 + 1, 4000, 2]]) world.createCollider(rapier.ColliderDesc.cuboid(w / 2, 30, d / 2).setTranslation(x as number, 30, z as number), body);
    RT.staticBody = body;
    return () => { world.removeRigidBody(body); };
  }, [world, rapier]);
  return null;
}
