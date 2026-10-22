import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CITY } from '../systems/CityGen';
import { CELL, LANE } from '../data/cityDistricts';
import { RT, type CarState } from '../systems/runtime';
import { spawnCar, removeCar, syncCar } from './Vehicle';
import { CAR_COLORS, CAR_DIM, type CarType } from '../systems/VehicleModels';
import { signalState } from '../systems/TrafficRules';
import { useGame } from '../store';
import { QUALITY } from '../systems/Quality';
import { HK, randLook, seeded } from '../systems/Characters';
import { mergeGeos } from './Building';
import { plainMat, metalMat } from '../systems/Materials';

type Node = [number, number];
const key = (n: Node) => `${n[0]},${n[1]}`;
const NEIGH = new Map<string, Node[]>();
for (const e of CITY.edges) { for (const [a, b] of [[e.a, e.b], [e.b, e.a]] as [Node, Node][]) { if (!NEIGH.has(key(a))) NEIGH.set(key(a), []); NEIGH.get(key(a))!.push(b); } }
const NODES = [...NEIGH.keys()].map((k) => k.split(',').map(Number) as Node);
const pos = (n: Node) => new THREE.Vector3(n[0] * CELL, 0, n[1] * CELL);
const dirOf = (a: Node, b: Node) => new THREE.Vector3(Math.sign(b[0] - a[0]), 0, Math.sign(b[1] - a[1]));
const rightOf = (d: THREE.Vector3) => new THREE.Vector3(-d.z, 0, d.x); // right-hand traffic
const STOP = 13; const SIGNAL = new Set(CITY.signals.map((s) => `${s.i},${s.j}`));

function lanePoint(a: Node, b: Node, s: number, lane: number) { const d = dirOf(a, b); return pos(a).addScaledVector(d, s).addScaledVector(rightOf(d), lane); }
function chooseNext(a: Node, b: Node): Node { const opts = (NEIGH.get(key(b)) || []).filter((n) => !(n[0] === a[0] && n[1] === a[1])); if (!opts.length) return a; const d = dirOf(a, b); const straight = opts.find((n) => dirOf(b, n).equals(d)); return straight && Math.random() < 0.55 ? straight : opts[Math.floor(Math.random() * opts.length)]; }
function startTurn(c: { a: Node; b: Node; lane: number }) {
  const next = chooseNext(c.a, c.b); const d1 = dirOf(c.a, c.b); const d2 = dirOf(c.b, next);
  const p0 = lanePoint(c.a, c.b, CELL - 7, c.lane); const p2 = lanePoint(c.b, next, 7, c.lane);
  const B = pos(c.b); const straight = d1.equals(d2); const uturn = d1.dot(d2) < -0.5;
  const ctrl = straight ? p0.clone().add(p2).multiplyScalar(0.5) : uturn ? B.clone().addScaledVector(d1, 9) : B.clone().addScaledVector(rightOf(d1), c.lane).addScaledVector(rightOf(d2), c.lane);
  const len = p0.distanceTo(ctrl) + ctrl.distanceTo(p2);
  return { p0, c: ctrl, p2, t: 0, len: Math.max(1, len * 0.92), next };
}
const bez = (t: { p0: THREE.Vector3; c: THREE.Vector3; p2: THREE.Vector3 }, u: number, out: THREE.Vector3) => out.copy(t.p0).multiplyScalar((1 - u) * (1 - u)).addScaledVector(t.c, 2 * u * (1 - u)).addScaledVector(t.p2, u * u);

interface Bike { a: Node; b: Node; s: number; turn: ReturnType<typeof startTurn> | null; speed: number; g: THREE.Group; human: THREE.Group; st: any; pos: THREE.Vector3; heading: number }

export function TrafficSystem() {
  const quality = useGame((s) => s.settings.quality);
  const timer = useRef(0); const bikes = useRef<Bike[]>([]); const root = useMemo(() => new THREE.Group(), []);
  const bikeGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const z of [-0.52, 0.52]) parts.push(new THREE.TorusGeometry(0.34, 0.03, 6, 22).rotateY(Math.PI / 2).translate(0, 0.36, z));
    const tube = (a: number[], b: number[]) => { const va = new THREE.Vector3(...a); const dir = new THREE.Vector3(...b).sub(va); const l = dir.length(); const g = new THREE.CylinderGeometry(0.022, 0.022, l, 6); g.translate(0, l / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())); g.translate(va.x, va.y, va.z); return g; };
    parts.push(tube([0, 0.36, -0.52], [0, 0.82, -0.12]), tube([0, 0.82, -0.12], [0, 0.85, 0.42]), tube([0, 0.36, -0.52], [0, 0.42, 0.05]), tube([0, 0.42, 0.05], [0, 0.82, -0.12]), tube([0, 0.42, 0.05], [0, 0.85, 0.42]), tube([0, 0.36, 0.52], [0, 1.0, 0.45]));
    parts.push(new THREE.BoxGeometry(0.5, 0.03, 0.03).translate(0, 1.0, 0.45), new THREE.BoxGeometry(0.12, 0.05, 0.22).translate(0, 0.86, -0.15));
    return mergeGeos(parts);
  }, []);

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05); const g = useGame.getState(); if (g.screen !== 'playing' && g.screen !== 'menu') return; const Q = QUALITY[g.settings.quality]; const now = st.clock.elapsedTime;
    const me = RT.player.mode === 'drive' && RT.car ? RT.car.pos : RT.player.pos;
    let ai = RT.cars.filter((c) => c.kind === 'ai');
    // keep the right number of cars around you
    timer.current -= dt;
    if (timer.current <= 0) {
      timer.current = 0.5;
      for (const c of ai) if (c.pos.distanceTo(me) > 460) removeCar(c);
      const want = g.screen === 'menu' ? Math.round(Q.cars * 0.7) : Q.cars; let tries = 0;
      while (RT.cars.filter((c) => c.kind === 'ai').length < want && tries++ < 6) {
        const cand = NODES.filter((n) => { const d = Math.hypot(n[0] * CELL - me.x, n[1] * CELL - me.z); return d < 380 && d > (g.screen === 'menu' ? 0 : 70); }); if (!cand.length) break;
        const a = cand[Math.floor(Math.random() * cand.length)]; const nb = NEIGH.get(key(a))!; const b = nb[Math.floor(Math.random() * nb.length)]; const s = 15 + Math.random() * 60;
        const p = lanePoint(a, b, s, LANE); if (RT.cars.some((c) => c.pos.distanceTo(p) < 14)) continue;
        const r = Math.random(); const type: CarType = r < 0.07 ? 'bus' : r < 0.17 ? 'taxi' : r < 0.27 ? 'van' : r < 0.6 ? 'hatch' : 'sedan';
        const d = dirOf(a, b); const vmax = type === 'bus' ? 9 : 10.5 + Math.random() * 3.5;
        spawnCar({ pos: p, heading: Math.atan2(d.x, d.z), speed: vmax * 0.6, color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], kind: 'ai', type, ai: { a, b, s, turn: null, vmax } });
      }
      // cyclists
      while (bikes.current.length < Q.bikes) {
        const cand = NODES.filter((n) => { const d = Math.hypot(n[0] * CELL - me.x, n[1] * CELL - me.z); return d < 250 && d > 40; }); if (!cand.length) break;
        const a = cand[Math.floor(Math.random() * cand.length)]; const nb = NEIGH.get(key(a))!; const b = nb[Math.floor(Math.random() * nb.length)];
        const gg = new THREE.Group(); const bm = new THREE.Mesh(bikeGeo, metalMat(['#cf343a', '#2459c4', '#1b8a4e', '#13202b', '#f0ab00'][bikes.current.length % 5])); bm.castShadow = true; gg.add(bm);
        const human = HK.build({ ...randLook(seeded(1000 + bikes.current.length * 31 + Math.floor(now))), bag: 1 }); human.position.set(0, 0.42, -0.18); gg.add(human); root.add(gg);
        bikes.current.push({ a, b, s: 10 + Math.random() * 80, turn: null, speed: 4.5 + Math.random() * 1.5, g: gg, human, st: { mode: 'bike', ph: 0 }, pos: new THREE.Vector3(), heading: 0 });
      }
      for (const b of [...bikes.current]) if (b.pos.distanceTo(me) > 330 && b.pos.lengthSq() > 0) { root.remove(b.g); bikes.current.splice(bikes.current.indexOf(b), 1); }
    }
    ai = RT.cars.filter((c) => c.kind === 'ai');
    // move every AI car
    const tmp = new THREE.Vector3();
    for (const c of ai) {
      const A = c.ai!; const D = CAR_DIM[c.type]; let target = A.vmax;
      if (!A.turn) {
        // traffic light at the end of the street
        const bKey = key(A.b);
        if (SIGNAL.has(bKey) && A.s < CELL - STOP + 1) { const horiz = A.a[1] === A.b[1]; const s = signalState(A.b[0], A.b[1], horiz, now); const dist = CELL - STOP - A.s; if (s !== 'green' && dist > -0.5 && (s === 'red' || dist > 6)) target = Math.min(target, Math.max(0, dist - 0.5) * 0.9); }
      }
      // anyone in front: other cars, you, your car, pedestrians crossing
      const fwd = tmp.set(Math.sin(c.heading), 0, Math.cos(c.heading));
      const obstacle = (p: THREE.Vector3, rad: number) => { const dx = p.x - c.pos.x; const dz = p.z - c.pos.z; const ahead = dx * fwd.x + dz * fwd.z; const side = Math.abs(dx * fwd.z - dz * fwd.x); if (ahead > 0 && ahead < 26 && side < rad) target = Math.min(target, Math.max(0, ahead - D.l / 2 - 4) * 0.7); };
      for (const o of RT.cars) if (o !== c) obstacle(o.pos, 1.7);
      if (RT.player.mode === 'walk') obstacle(RT.player.pos, 1.9);
      for (const p of RT.peds) obstacle(new THREE.Vector3(p.x, 0, p.z), 1.6);
      c.speed += Math.max(-9 * dt, Math.min(3 * dt, target - c.speed)); if (c.speed < 0) c.speed = 0;
      if (!A.turn) {
        A.s += c.speed * dt; if (A.s >= CELL - 7) A.turn = startTurn({ a: A.a, b: A.b, lane: LANE });
        const p = A.turn ? A.turn.p0 : lanePoint(A.a, A.b, A.s, LANE); c.pos.copy(p); const d = dirOf(A.a, A.b); c.heading = Math.atan2(d.x, d.z);
      } else {
        const T = A.turn; T.t += (c.speed * dt) / T.len; const u = Math.min(1, T.t); const p = bez(T, u, new THREE.Vector3()); const p2 = bez(T, Math.min(1, u + 0.02), new THREE.Vector3());
        if (p2.distanceToSquared(p) > 1e-6) c.heading = Math.atan2(p2.x - p.x, p2.z - p.z); c.pos.copy(p);
        if (T.t >= 1) { A.a = A.b; A.b = T.next; A.s = 7; A.turn = null; }
      }
      syncCar(c);
    }
    // cyclists ride next to the kerb
    for (const b of bikes.current) {
      let v = b.speed; const fwd = new THREE.Vector3(Math.sin(b.heading), 0, Math.cos(b.heading));
      if (!b.turn && SIGNAL.has(key(b.b))) { const horiz = b.a[1] === b.b[1]; if (signalState(b.b[0], b.b[1], horiz, now) !== 'green') { const dist = CELL - STOP - b.s; if (dist > -0.5 && dist < 12) v = Math.max(0, dist - 0.5) * 0.8; } }
      if (RT.player.mode === 'walk') { const dx = RT.player.pos.x - b.pos.x; const dz = RT.player.pos.z - b.pos.z; const ah = dx * fwd.x + dz * fwd.z; if (ah > 0 && ah < 6 && Math.abs(dx * fwd.z - dz * fwd.x) < 1.2) v = 0; }
      if (!b.turn) { b.s += v * dt; if (b.s >= CELL - 7) b.turn = startTurn({ a: b.a, b: b.b, lane: LANE + 1.4 }); const p = b.turn ? b.turn.p0 : lanePoint(b.a, b.b, b.s, LANE + 1.4); b.pos.copy(p); const d = dirOf(b.a, b.b); b.heading = Math.atan2(d.x, d.z); }
      else { const T = b.turn; T.t += (v * dt) / T.len; const u = Math.min(1, T.t); const p = bez(T, u, new THREE.Vector3()); const p2 = bez(T, Math.min(1, u + 0.03), new THREE.Vector3()); if (p2.distanceToSquared(p) > 1e-6) b.heading = Math.atan2(p2.x - p.x, p2.z - p.z); b.pos.copy(p); if (T.t >= 1) { b.a = b.b; b.b = T.next; b.s = 7; b.turn = null; } }
      b.g.position.copy(b.pos); b.g.rotation.y = b.heading; b.st.ph += dt * v * 1.6; b.st.mode = v > 0.3 ? 'bike' : 'idle'; HK.pose(b.human, b.st, dt);
    }
  });
  return <primitive object={root} />;
}
void plainMat; void syncCar;
