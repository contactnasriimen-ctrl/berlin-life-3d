import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRapier, useBeforePhysicsStep } from '@react-three/rapier';
import { RT, consumePressed, type CarState, type Interactable } from '../systems/runtime';
import { CITY } from '../systems/CityGen';
import { makeCar, CAR_DIM, CAR_COLORS, type CarType } from '../systems/VehicleModels';
import { driveStep } from '../systems/VehicleController';
import { useGame } from '../store';
import { QUALITY } from '../systems/Quality';

/* ---------- registry shared with the traffic system ---------- */
let carRoot: THREE.Group | null = null; let nextId = 1;
const up = new THREE.Vector3(0, 1, 0); const q = new THREE.Quaternion();

export function spawnCar(init: Omit<CarState, 'id' | 'lights' | 'steer'> & Partial<CarState>): CarState | null {
  const W = RT.world; const R = RT.rapier; if (!W || !R || !carRoot) return null;
  const c: CarState = { id: nextId++, lights: false, steer: 0, ...init } as CarState; const D = CAR_DIM[c.type];
  c.group = makeCar(c.type, c.color); carRoot.add(c.group);
  c.body = W.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(c.pos.x, c.pos.y, c.pos.z));
  c.col = W.createCollider(R.ColliderDesc.cuboid(D.w / 2, D.h / 2 - 0.15, D.l / 2).setTranslation(0, D.h / 2 + 0.1, 0), c.body);
  RT.carColliders.add(c.col.handle); RT.cars.push(c); syncCar(c, true); return c;
}
export function removeCar(c: CarState) {
  if (c.group && carRoot) carRoot.remove(c.group); if (c.col) RT.carColliders.delete(c.col.handle); if (c.body && RT.world) RT.world.removeRigidBody(c.body); c.body = null; c.col = null; (c as any).removed = true;
  const i = RT.cars.indexOf(c); if (i >= 0) RT.cars.splice(i, 1);
}
export function syncCar(c: CarState, now = false) {
  if ((c as any).removed) return; q.setFromAxisAngle(up, c.heading);
  if (c.body && Number.isFinite(c.pos.x) && Number.isFinite(c.pos.z) && Number.isFinite(c.heading)) { if (now) { c.body.setTranslation({ x: c.pos.x, y: c.pos.y, z: c.pos.z }, true); c.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true); } else { c.body.setNextKinematicTranslation({ x: c.pos.x, y: c.pos.y, z: c.pos.z }); c.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w }); } }
  if (c.group) { c.group.position.copy(c.pos); c.group.quaternion.copy(q); }
}

const TYPES: CarType[] = ['hatch', 'hatch', 'sedan', 'sedan', 'van', 'taxi'];

export function Vehicles() {
  const { world, rapier } = useRapier();
  const root = useMemo(() => new THREE.Group(), []);
  const ctrl = useRef<any>(null);
  const spots = useRef(new Map<number, CarState>());
  const lights = useMemo(() => { const g = new THREE.Group(); for (const x of [-0.6, 0.6]) { const s = new THREE.SpotLight('#fff2d0', 0, 45, 0.45, 0.5, 1.4); s.position.set(x, 0.75, 2.2); s.target.position.set(x * 1.5, 0, 14); g.add(s, s.target); } return g; }, []);
  const tmr = useRef(0); const hud = useRef(0);
  const carIt = useMemo<Interactable>(() => ({ id: 'car', label: '', key: 'E', pos: new THREE.Vector3(0, -999, 0), radius: 3.6, run: () => enter() }), []);

  useEffect(() => {
    carRoot = root; RT.world = world; RT.rapier = rapier;
    ctrl.current = world.createCharacterController(0.05); ctrl.current.setSlideEnabled(true); ctrl.current.enableAutostep(0.3, 0.3, false); ctrl.current.enableSnapToGround(0.3); ctrl.current.setMaxSlopeClimbAngle(0.6);
    RT.interactables.push(carIt);
    return () => { world.removeCharacterController(ctrl.current); RT.interactables.splice(RT.interactables.indexOf(carIt), 1); };
  }, [world, rapier, root, carIt]);

  function enter() {
    const P = RT.player; const c = (carIt as any).car as CarState | undefined; if (!c) return;
    c.kind = 'player'; c.ai = undefined; c.spot = undefined; RT.car = c; P.mode = 'drive'; c.speed = 0; c.group?.add(lights);
    const g = useGame.getState(); g.set({ driving: true }); g.showToast('🚗 W/S: gas & brake · A/D: steer · Space: handbrake · F: get out');
  }
  function exit() {
    const c = RT.car; if (!c) return; const P = RT.player; const left = new THREE.Vector3(Math.cos(c.heading), 0, -Math.sin(c.heading));
    c.kind = 'parked'; c.speed = 0; c.group?.remove(lights); RT.car = null; P.mode = 'walk';
    RT.teleport = { x: c.pos.x + left.x * 1.9, y: c.pos.y + 0.2, z: c.pos.z + left.z * 1.9, heading: c.heading }; useGame.getState().set({ driving: false, speedKmh: 0 });
  }

  // the player's car is driven in the physics step (stable at any frame rate)
  useBeforePhysicsStep(() => {
    const c = RT.car; if (!c || RT.player.mode !== 'drive' || !ctrl.current) return; const g = useGame.getState(); const k = RT.input.keys; const on = g.screen === 'playing' && !g.panel;
    driveStep(c, { up: on && (k.has('KeyW') || k.has('ArrowUp')), down: on && (k.has('KeyS') || k.has('ArrowDown')), left: on && (k.has('KeyA') || k.has('ArrowLeft')), right: on && (k.has('KeyD') || k.has('ArrowRight')), brake: on && k.has('Space') }, 1 / 60, ctrl.current);
  });

  useFrame((_, dt) => {
    const P = RT.player; const g = useGame.getState();
    if (P.mode === 'drive' && RT.car) {
      syncCar(RT.car); const night = RT.night; lights.children.forEach((l) => { if ((l as THREE.SpotLight).isSpotLight) (l as THREE.SpotLight).intensity = night * 60; });
      if (g.screen === 'playing' && consumePressed('KeyF')) { exit(); return; }
      hud.current -= dt; if (hud.current <= 0) { hud.current = 0.1; const kmh = Math.round(Math.abs(RT.car.speed) * 3.6); g.set({ speedKmh: kmh, gear: RT.car.speed < -0.3 ? 'R' : kmh < 1 ? 'N' : kmh < 20 ? '1' : kmh < 35 ? '2' : kmh < 55 ? '3' : kmh < 75 ? '4' : '5' }); }
    }
    // wheels spin with the speed
    for (const c of RT.cars) if (c.group && Math.abs(c.speed) > 0.05) c.group.children.forEach((m) => { if (m.name === 'wheel') m.rotation.x += (c.speed * dt) / 0.34; });
    // the car you can get into
    let best: CarState | null = null; let bd = 1e9;
    if (P.mode === 'walk') for (const c of RT.cars) { const d = c.pos.distanceTo(P.pos); if (d < CAR_DIM[c.type].l / 2 + 1.8 && d < bd && Math.abs(c.speed) < 3) { bd = d; best = c; } }
    (carIt as any).car = best; carIt.pos.copy(best ? best.pos : new THREE.Vector3(0, -999, 0)); carIt.radius = best ? CAR_DIM[best.type].l / 2 + 1.9 : 0;
    carIt.label = best ? `Enter the ${best.type === 'bus' ? 'BVG bus' : best.type === 'taxi' ? 'taxi' : best.type === 'van' ? 'van' : 'car'}` : '';
    // parked cars along the kerbs near you (spawned and removed as you move)
    tmr.current -= dt; if (tmr.current > 0) return; tmr.current = 1;
    const me = P.mode === 'drive' && RT.car ? RT.car.pos : P.pos;
    const near = CITY.parking.map(([x, z], i) => [i, (x - me.x) ** 2 + (z - me.z) ** 2] as [number, number]).filter(([, d]) => d < 150 * 150).sort((a, b) => a[1] - b[1]).slice(0, QUALITY[useGame.getState().settings.quality].parked);
    const keep = new Set(near.map(([i]) => i));
    for (const [i, c] of spots.current) if (!keep.has(i) || c.kind !== 'parked' || c.spot !== i) { if (c.kind === 'parked' && c.spot === i) removeCar(c); spots.current.delete(i); }
    for (const [i] of near) if (!spots.current.has(i)) { const [x, z, ry] = CITY.parking[i]; const c = spawnCar({ pos: new THREE.Vector3(x, 0, z), heading: ry, speed: 0, color: CAR_COLORS[i % CAR_COLORS.length], kind: 'parked', type: TYPES[i % TYPES.length], spot: i }); if (c) spots.current.set(i, c); }
    // cars you left somewhere far away are taken away
    for (const c of [...RT.cars]) if (c.kind === 'parked' && c.spot === undefined && c.pos.distanceTo(me) > 350) removeCar(c);
  });
  return <primitive object={root} />;
}
