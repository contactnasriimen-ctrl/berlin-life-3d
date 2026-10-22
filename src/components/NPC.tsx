import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RT, type Interactable } from '../systems/runtime';
import { HK, randLook, seeded } from '../systems/Characters';
import { CITY } from '../systems/CityGen';
import { CELL } from '../data/cityDistricts';
import { useGame } from '../store';
import { QUALITY } from '../systems/Quality';
import { type Ped, loopPoint, loopLen, walkableCell, maybeCross, crossingAllowed, randomName, SMALLTALK } from '../systems/NPCBehavior';

const LOOKS = Array.from({ length: 48 }, (_, k) => randLook(seeded(500 + k * 37)));
const MAX_IMP = 220;

/** Pedestrians around the player. The nearest ones are full 3D people, the others cheap instanced figures. */
export function NPCs() {
  const quality = useGame((s) => s.settings.quality);
  const root = useMemo(() => new THREE.Group(), []);
  const peds = useRef<Ped[]>([]); const nextId = useRef(1);
  const full = useRef(new Map<number, THREE.Group>()); const pool = useRef(new Map<number, THREE.Group[]>());
  const imp = { legs: useRef<THREE.InstancedMesh>(null), body: useRef<THREE.InstancedMesh>(null), head: useRef<THREE.InstancedMesh>(null) };
  const geos = useMemo(() => {
    const legs = new THREE.BoxGeometry(0.34, 0.88, 0.2); legs.translate(0, 0.44, 0);
    const body = new THREE.CylinderGeometry(0.2, 0.17, 0.66, 8); body.translate(0, 1.2, 0);
    const head = new THREE.SphereGeometry(0.12, 10, 8); head.translate(0, 1.66, 0);
    return { legs, body, head };
  }, []);
  const mats = useMemo(() => ({ legs: new THREE.MeshStandardMaterial({ roughness: 0.9 }), body: new THREE.MeshStandardMaterial({ roughness: 0.9 }), head: new THREE.MeshStandardMaterial({ roughness: 0.7 }) }), []);
  const talkIt = useMemo<Interactable>(() => ({ id: 'npc', label: '', key: 'E', pos: new THREE.Vector3(0, -999, 0), radius: 0, run: () => talk() }), []);
  const tmr = useRef(0); const lodT = useRef(0);

  useEffect(() => { RT.interactables.push(talkIt); return () => { RT.interactables.splice(RT.interactables.indexOf(talkIt), 1); }; }, [talkIt]);

  function talk() {
    const p = (talkIt as any).ped as Ped | undefined; if (!p) return; const line = SMALLTALK[(p.id * 7 + Math.floor(performance.now() / 4000)) % SMALLTALK.length];
    p.stopT = 6; p.heading = Math.atan2(RT.player.pos.x - p.x, RT.player.pos.z - p.z); RT.player.heading = Math.atan2(p.x - RT.player.pos.x, p.z - RT.player.pos.z);
    useGame.getState().set({ dialog: { name: p.name, de: line[0], en: line[1] } });
  }

  function spawn(kind: Ped['kind'], me: THREE.Vector3): Ped | null {
    const id = nextId.current++; const look = Math.floor(Math.random() * LOOKS.length);
    const base: Ped = { id, kind, x: 0, z: 0, y: 0.15, heading: 0, look, speed: 0, name: randomName(id + look), phase: Math.random() * 6 };
    if (kind === 'walk') {
      for (let k = 0; k < 8; k++) {
        const i = Math.floor((me.x + (Math.random() - 0.5) * 420) / CELL); const j = Math.floor((me.z + (Math.random() - 0.5) * 420) / CELL); if (!walkableCell(i, j)) continue;
        const t = Math.random() * loopLen(i, j); const p = loopPoint(i, j, t); const d = Math.hypot(p.x - me.x, p.z - me.z); if (d > 210 || d < 25) continue;
        return { ...base, cell: [i, j], t, dir: Math.random() < 0.5 ? 1 : -1, x: p.x, z: p.z, speed: 1.15 + Math.random() * 0.5 };
      }
      return null;
    }
    if (kind === 'sit') {
      const seats: [number, number, number, number][] = [];
      for (const [x, z, ry] of CITY.cafes) for (const k of [-1.6, 1.6]) { const tx = x + Math.cos(ry) * k; const tz = z - Math.sin(ry) * k; seats.push([tx + 0.65, tz, -Math.PI / 2, 0.6], [tx - 0.65, tz, Math.PI / 2, 0.6]); }
      for (const [x, z] of CITY.benches) seats.push([x - 0.5, z + 0.05, 0, 0.61], [x + 0.5, z + 0.05, 0, 0.61]);
      const near = seats.filter(([x, z]) => Math.hypot(x - me.x, z - me.z) < 140 && !peds.current.some((q) => q.kind === 'sit' && Math.abs(q.x - x) < 0.1 && Math.abs(q.z - z) < 0.1));
      if (!near.length) return null; const [x, z, ry, sy] = near[Math.floor(Math.random() * near.length)];
      return { ...base, x, z, heading: ry, seatY: sy };
    }
    if (kind === 'wait') {
      const near = CITY.busStops.filter(([x, z]) => Math.hypot(x - me.x, z - me.z) < 160); if (!near.length) return null; const [x, z] = near[Math.floor(Math.random() * near.length)];
      return { ...base, x: x + (Math.random() - 0.5) * 3.2, z: z + 0.6 + Math.random() * 1.2, heading: Math.PI + (Math.random() - 0.5) };
    }
    // a small group talking on the pavement
    for (let k = 0; k < 6; k++) {
      const i = Math.floor((me.x + (Math.random() - 0.5) * 300) / CELL); const j = Math.floor((me.z + (Math.random() - 0.5) * 300) / CELL); if (!walkableCell(i, j)) continue;
      const p = loopPoint(i, j, Math.random() * loopLen(i, j)); if (Math.hypot(p.x - me.x, p.z - me.z) < 20) continue;
      return { ...base, x: p.x + 0.9, z: p.z + 0.9, heading: Math.random() * 6 };
    }
    return null;
  }

  useFrame((st, dtRaw) => {
    const dt = Math.min(0.05, dtRaw); const g = useGame.getState(); const Q = QUALITY[g.settings.quality]; const now = st.clock.elapsedTime;
    const me = RT.player.mode === 'drive' && RT.car ? RT.car.pos : RT.player.pos;
    // population
    tmr.current -= dt;
    if (tmr.current <= 0) {
      tmr.current = 0.6;
      for (const p of [...peds.current]) if (Math.hypot(p.x - me.x, p.z - me.z) > 260) { peds.current.splice(peds.current.indexOf(p), 1); release(p); }
      const count = (k: Ped['kind']) => peds.current.filter((p) => p.kind === k).length;
      const want: [Ped['kind'], number][] = [['walk', Q.walkers], ['sit', Math.round(Q.walkers / 5)], ['wait', Math.round(Q.walkers / 12)], ['talk', Math.round(Q.walkers / 8)]];
      for (const [k, n] of want) for (let a = 0; a < 4 && count(k) < n; a++) {
        const p = spawn(k, me); if (!p) continue; peds.current.push(p);
        if (k === 'talk') { const p2 = { ...spawn('talk', me)!, x: p.x + 1.1, z: p.z + 0.3, look: (p.look + 7) % LOOKS.length, id: nextId.current++ }; if (p2) { p.heading = Math.atan2(p2.x - p.x, p2.z - p.z); p2.heading = p.heading + Math.PI; p2.name = randomName(p2.id); peds.current.push(p2); } }
      }
    }
    // behaviour
    RT.peds.length = 0;
    for (const p of peds.current) {
      if (p.stopT && p.stopT > 0) { p.stopT -= dt; continue; }
      if (p.kind !== 'walk') continue;
      if (p.cross) {
        const c = p.cross;
        if (c.u < 0) { if (crossingAllowed(p, now)) c.u = 0; else continue; }
        c.u += (p.speed * 1.15 * dt) / c.len; const u = Math.min(1, c.u); p.x = c.x0 + (c.x1 - c.x0) * u; p.z = c.z0 + (c.z1 - c.z0) * u; p.heading = Math.atan2(c.x1 - c.x0, c.z1 - c.z0); p.y = u > 0.08 && u < 0.92 ? 0 : 0.15;
        RT.peds.push({ x: p.x, z: p.z, vx: 0, vz: 0 });
        if (c.u >= 1) { p.cell = c.next; p.t = c.nt; p.cross = null; p.y = 0.15; }
        continue;
      }
      const before = p.t!; p.t = before + p.dir! * p.speed * dt; const [i, j] = p.cell!; const L = loopLen(i, j);
      const crossedCorner = Math.floor(before / (L / 4)) !== Math.floor(p.t / (L / 4));
      const q = loopPoint(i, j, p.t); const dx = q.x - p.x; const dz = q.z - p.z; if (dx * dx + dz * dz > 1e-6) p.heading = Math.atan2(dx, dz); p.x = q.x; p.z = q.z;
      if (crossedCorner) maybeCross(p, now);
      // keep out of the player's way
      const px = RT.player.pos.x - p.x; const pz = RT.player.pos.z - p.z; if (RT.player.mode === 'walk' && px * px + pz * pz < 0.8) { p.x -= px * 0.3; p.z -= pz * 0.3; }
    }
    // level of detail: the nearest people get a full model
    lodT.current -= dt;
    if (lodT.current <= 0) {
      lodT.current = 0.3; const cam = RT.camObj?.position || me;
      const order = [...peds.current].sort((a, b) => (a.x - cam.x) ** 2 + (a.z - cam.z) ** 2 - ((b.x - cam.x) ** 2 + (b.z - cam.z) ** 2));
      const want = new Set(order.slice(0, Q.npcFull).filter((p) => (p.x - cam.x) ** 2 + (p.z - cam.z) ** 2 < 75 * 75).map((p) => p.id)); let built = 0;
      for (const [id, m] of full.current) if (!want.has(id)) { const p = peds.current.find((q) => q.id === id); if (p) release(p); else { root.remove(m); full.current.delete(id); } }
      for (const p of order) if (want.has(p.id) && !full.current.has(p.id)) { const free = pool.current.get(p.look); let m = free && free.pop(); if (!m) { if (built++ > 1) continue; m = HK.build(LOOKS[p.look]); } root.add(m); full.current.set(p.id, m); }
    }
    let n = 0; const m4 = new THREE.Matrix4(); const qt = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0); const one = new THREE.Vector3(1, 1, 1); const col = new THREE.Color();
    let best: Ped | null = null; let bd = 2.4;
    for (const p of peds.current) {
      const m = full.current.get(p.id);
      const mode = p.stopT && p.stopT > 0 ? 'talk' : p.kind === 'walk' ? (p.cross && p.cross.u < 0 ? 'idle' : 'walk') : p.kind === 'sit' ? 'sit' : p.kind === 'talk' ? (Math.sin(now * 0.7 + p.phase) > 0 ? 'talk' : 'idle') : 'idle';
      if (m) {
        const L = LOOKS[p.look]; const sc = (L.sex === 'f' ? 0.95 : 1) * L.h; const y = p.kind === 'sit' ? (p.seatY || 0.6) - 0.845 * sc : p.y;
        m.position.set(p.x, y, p.z); m.rotation.y = p.heading; const stt = (m as any).__st || ((m as any).__st = { mode: 'idle', ph: p.phase }); stt.mode = mode; stt.ph += dt * p.speed * 3.4; stt.talking = mode === 'talk' && Math.sin(now * 3 + p.phase) > 0;
        HK.pose(m, stt, dt);
        const d = Math.hypot(p.x - RT.player.pos.x, p.z - RT.player.pos.z); if (d < bd && RT.player.mode === 'walk') { bd = d; best = p; }
      } else if (n < MAX_IMP && imp.body.current) {
        const L = LOOKS[p.look]; const bob = mode === 'walk' ? Math.abs(Math.sin(now * 6 + p.phase)) * 0.04 : 0; const sitDrop = p.kind === 'sit' ? -0.45 : 0;
        qt.setFromAxisAngle(up, p.heading); m4.compose(new THREE.Vector3(p.x, p.y + bob + sitDrop, p.z), qt, one);
        imp.legs.current!.setMatrixAt(n, m4); imp.body.current.setMatrixAt(n, m4); imp.head.current!.setMatrixAt(n, m4);
        imp.legs.current!.setColorAt(n, col.set(L.top === 'dress' ? L.topC : L.botC)); imp.body.current.setColorAt(n, col.set(L.topC)); imp.head.current!.setColorAt(n, col.set(L.hair === 'hijab' ? L.scarf : L.skin)); n++;
      }
    }
    for (const r of [imp.legs, imp.body, imp.head]) { const im = r.current; if (!im) continue; im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
    (talkIt as any).ped = best; talkIt.pos.set(best ? best.x : 0, best ? 0 : -999, best ? best.z : 0); talkIt.radius = best ? 2.4 : 0; talkIt.label = best ? `Talk to ${best.name}` : '';
  });

  function release(p: Ped) { const m = full.current.get(p.id); if (!m) return; root.remove(m); full.current.delete(p.id); if (!pool.current.has(p.look)) pool.current.set(p.look, []); pool.current.get(p.look)!.push(m); }

  return (
    <>
      <primitive object={root} />
      <instancedMesh ref={imp.legs} args={[geos.legs, mats.legs, MAX_IMP]} castShadow frustumCulled={false} />
      <instancedMesh ref={imp.body} args={[geos.body, mats.body, MAX_IMP]} castShadow frustumCulled={false} />
      <instancedMesh ref={imp.head} args={[geos.head, mats.head, MAX_IMP]} frustumCulled={false} />
    </>
  );
}
