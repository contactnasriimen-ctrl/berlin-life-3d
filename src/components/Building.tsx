import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CITY } from '../systems/CityGen';
import { buildChunk, type Balcony } from '../systems/BuildingMesh';
import { matFor, plainMat } from '../systems/Materials';
import { RT } from '../systems/runtime';
import { useGame } from '../store';
import { QUALITY } from '../systems/Quality';

/**
 * All generated buildings, grouped in 220 m chunks. Each chunk is one mesh per material.
 * WorldStreaming: chunks farther than the draw distance are hidden (the fog hides the edge).
 */
export function Buildings() {
  const quality = useGame((s) => s.settings.quality);
  const { chunks, balconies } = useMemo(() => {
    const by = new Map<string, typeof CITY.buildings>();
    for (const b of CITY.buildings) { if (!by.has(b.chunk)) by.set(b.chunk, []); by.get(b.chunk)!.push(b); }
    const balconies: Balcony[] = [];
    const chunks = [...by.entries()].map(([key, list]) => {
      const parts = buildChunk(list, balconies);
      const g = new THREE.Group(); g.name = `chunk ${key}`;
      for (const p of parts) { const m = new THREE.Mesh(p.geo, matFor(p.key)); m.castShadow = p.key !== 'signs' && p.key !== 'gravel'; m.receiveShadow = true; m.matrixAutoUpdate = false; g.add(m); }
      const [cx, cz] = key.split(',').map(Number); return { g, cx: cx * 220 + 110, cz: cz * 220 + 110 };
    });
    return { chunks, balconies };
  }, []);
  const groupRef = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current -= dt; if (t.current > 0) return; t.current = 0.4;
    const p = RT.camObj?.position || RT.player.pos; const draw = QUALITY[useGame.getState().settings.quality].draw;
    for (const c of chunks) c.g.visible = Math.hypot(c.cx - p.x, c.cz - p.z) < draw + 160;
  });
  return (
    <group ref={groupRef}>
      {chunks.map((c) => <primitive key={c.g.name} object={c.g} />)}
      {QUALITY[quality].balconies && <Balconies list={balconies} />}
    </group>
  );
}

function Balconies({ list }: { list: Balcony[] }) {
  const { slab, rail } = useMemo(() => {
    const slabG = new THREE.BoxGeometry(1, 0.16, 1.15); slabG.translate(0, 0, 0);
    const railParts: THREE.BufferGeometry[] = [];
    const bar = (w: number, h: number, d: number, x: number, y: number, z: number) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); railParts.push(g); };
    bar(1, 0.05, 0.05, 0, 1.0, 0.55); bar(0.05, 0.05, 1.1, -0.5, 1.0, 0); bar(0.05, 0.05, 1.1, 0.5, 1.0, 0);
    for (let k = 0; k <= 8; k++) bar(0.025, 0.95, 0.025, -0.5 + k / 8, 0.55, 0.55);
    for (const s of [-0.5, 0.5]) for (let k = 1; k < 4; k++) bar(0.025, 0.95, 0.025, s, 0.55, 0.55 - k * 0.27);
    return { slab: slabG, rail: mergeGeos(railParts) };
  }, []);
  const refs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
  useLayoutEffect(() => {
    {
      const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const sc = new THREE.Vector3(); const up = new THREE.Vector3(0, 1, 0);
      list.forEach((b, i) => { q.setFromAxisAngle(up, b.ry); sc.set(b.w, 1, 1); m4.compose(new THREE.Vector3(b.x, b.y, b.z), q, sc); refs.forEach((r) => r.current?.setMatrixAt(i, m4)); });
      refs.forEach((r) => { if (r.current) { r.current.instanceMatrix.needsUpdate = true; r.current.computeBoundingSphere(); } });
    }
  }, [list]);
  return (
    <>
      <instancedMesh ref={refs[0]} args={[slab, plainMat('#d9d3c7', 0.8), list.length]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={refs[1]} args={[rail, plainMat('#2c3136', 0.4, 0.6), list.length]} castShadow frustumCulled={false} />
    </>
  );
}

export function mergeGeos(parts: THREE.BufferGeometry[]) {
  const pos: number[] = []; const nor: number[] = []; const uv: number[] = []; const idx: number[] = [];
  for (const g of parts) {
    const base = pos.length / 3; const p = g.attributes.position; const n = g.attributes.normal; const u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base); else for (let i = 0; i < p.count; i++) idx.push(base + i);
  }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); out.setIndex(idx); out.computeBoundingSphere(); return out;
}
