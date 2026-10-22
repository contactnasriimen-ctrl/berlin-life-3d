import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRapier, useBeforePhysicsStep } from '@react-three/rapier';
import { HK, playerLook, type PoseState } from '../systems/Characters';
import { RT, consumePressed } from '../systems/runtime';
import { useGame } from '../store';
import { districtAt, DISTRICT_NAMES, streetAt } from '../data/cityDistricts';

const WALK = 2.9; const RUN = 6.8; const JUMP = 6.4; const GRAV = 20; const HALF = 0.55; const RADIUS = 0.32; const CENTER = HALF + RADIUS; // capsule centre above the feet

export function Player() {
  const { world, rapier } = useRapier();
  const look = useGame((s) => s.settings) as any;
  const model = useMemo(() => HK.build(playerLook(look.charSeed ?? 3, look.charSex ?? 'm')), [look.charSeed, look.charSex]);
  const group = useRef<THREE.Group>(null);
  const phys = useRef<{ body: any; col: any; ctrl: any } | null>(null);
  const st = useRef<PoseState>({ mode: 'idle', ph: 0 });
  const vel = useRef(new THREE.Vector3());
  const last = useRef({ prompt: '' as string | null, district: '', street: '', t: 0 });

  useEffect(() => {
    RT.world = world; RT.rapier = rapier;
    const p = RT.player.pos;
    const body = world.createRigidBody(rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y + CENTER, p.z));
    const col = world.createCollider(rapier.ColliderDesc.capsule(HALF, RADIUS), body);
    const ctrl = world.createCharacterController(0.04);
    ctrl.enableAutostep(0.45, 0.2, true); ctrl.enableSnapToGround(0.45); ctrl.setMaxSlopeClimbAngle((55 * Math.PI) / 180); ctrl.setSlideEnabled(true);
    phys.current = { body, col, ctrl }; RT.playerCollider = col;
    return () => { world.removeCharacterController(ctrl); world.removeRigidBody(body); phys.current = null; };
  }, [world, rapier]);

  useBeforePhysicsStep(() => {
    const ph = phys.current; if (!ph) return; const P = RT.player; const dt = 1 / 60;
    if (RT.teleport) { const t = RT.teleport; RT.teleport = null; ph.body.setTranslation({ x: t.x, y: t.y + CENTER, z: t.z }, true); P.pos.set(t.x, t.y, t.z); P.heading = t.heading; P.vy = 0; vel.current.set(0, 0, 0); return; }
    if (P.mode !== 'walk') { ph.col.setEnabled(false); ph.body.setNextKinematicTranslation({ x: P.pos.x, y: P.pos.y + CENTER + 50, z: P.pos.z }); return; }
    ph.col.setEnabled(true);
    const g = useGame.getState(); const playing = g.screen === 'playing' && !g.panel && !g.dialog && !RT.frozen;
    const k = RT.input.keys; let ix = 0; let iz = 0;
    if (playing) { ix = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0); iz = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); }
    if (P.action && (ix || iz)) P.action = null;
    const yaw = RT.cam.yaw; const fx = -Math.sin(yaw); const fz = -Math.cos(yaw); const rx = Math.cos(yaw); const rz = -Math.sin(yaw);
    let mx = fx * iz + rx * ix; let mz = fz * iz + rz * ix; const l = Math.hypot(mx, mz); if (l > 0) { mx /= l; mz /= l; }
    const run = k.has('ShiftLeft') || k.has('ShiftRight'); const target = l > 0 ? (run ? RUN : WALK) : 0;
    const v = vel.current; const acc = Math.min(1, dt * (P.grounded ? 10 : 2.5));
    v.x += (mx * target - v.x) * acc; v.z += (mz * target - v.z) * acc;
    if (playing && P.grounded && consumePressed('Space')) { P.vy = JUMP; P.grounded = false; }
    P.vy -= GRAV * dt; if (P.grounded && P.vy < 0) P.vy = -2;
    ph.ctrl.computeColliderMovement(ph.col, { x: v.x * dt, y: P.vy * dt, z: v.z * dt });
    const mv = ph.ctrl.computedMovement(); const cur = ph.body.translation();
    const nx = cur.x + mv.x; const ny = cur.y + mv.y; const nz = cur.z + mv.z;
    ph.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    const wasGround = P.grounded; P.grounded = ph.ctrl.computedGrounded(); if (P.grounded && !wasGround && P.vy < -9) st.current.t = 0.25;
    if (P.grounded && P.vy < 0) P.vy = 0;
    // blocked by a wall: lose the speed in that direction
    if (Math.abs(mv.x) < Math.abs(v.x * dt) * 0.3) v.x *= 0.5; if (Math.abs(mv.z) < Math.abs(v.z * dt) * 0.3) v.z *= 0.5;
    P.pos.set(nx, ny - CENTER, nz); P.speed = Math.hypot(v.x, v.z);
    if (P.speed > 0.3) { const want = Math.atan2(v.x, v.z); let d = want - P.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); P.heading += d * Math.min(1, dt * 12); }
  });

  useFrame((_, dt) => {
    const P = RT.player; const grp = group.current; if (!grp) return; const g = useGame.getState();
    if (P.mode === 'walk') { grp.position.copy(P.pos); grp.rotation.set(0, P.heading, 0); }
    else if (P.mode === 'drive' && RT.car) { const c = RT.car; const s = Math.sin(c.heading); const co = Math.cos(c.heading); grp.position.set(c.pos.x + co * 0.38 + s * -0.25, c.pos.y + 0.05, c.pos.z - s * 0.38 + co * -0.25); grp.rotation.set(0, c.heading, 0); }
    grp.visible = P.mode !== 'ride';
    // animation
    const s = st.current; const t = (s.t || 0) - dt; s.t = Math.max(0, t);
    if (P.mode === 'drive') s.mode = 'drive';
    else if (P.action) { P.action.t += dt; s.mode = P.action.kind; s.t = P.action.t; if (P.action.t > P.action.len && P.action.kind !== 'sit') P.action = null; }
    else if (!P.grounded) { s.mode = 'jump'; s.vy = P.vy; }
    else if (t > 0) s.mode = 'land';
    else s.mode = P.speed > 4.6 ? 'run' : P.speed > 0.4 ? 'walk' : 'idle';
    s.ph = (s.ph || 0) + dt * P.speed * (s.mode === 'run' ? 2.05 : 3.4);
    HK.pose(model, s, dt);
    // interaction prompt: the nearest thing you can use
    if (g.screen === 'playing') {
      let best: typeof RT.interact = null; let bd = 1e9; const me = P.mode === 'drive' && RT.car ? RT.car.pos : P.pos;
      if (!g.panel && !g.dialog) for (const it of RT.interactables) { if (P.mode === 'drive' && !it.id.startsWith('exit')) continue; const d = it.pos.distanceTo(me); if (d < it.radius && d < bd) { bd = d; best = it; } }
      RT.interact = best; const text = best ? best.label : P.mode === 'drive' ? null : null;
      if (text !== last.current.prompt) { last.current.prompt = text; useGame.setState({ prompt: text }); }
      if (best && consumePressed('KeyE')) best.run(); else consumePressed('KeyE');
      last.current.t -= dt;
      if (last.current.t <= 0) { last.current.t = 0.5; const dn = DISTRICT_NAMES[districtAt(me.x, me.z)]; const sn = streetAt(me.x, me.z); if (dn !== last.current.district) { if (last.current.district) g.showToast(`📍 ${dn}`); last.current.district = dn; useGame.setState({ district: dn }); } if (sn !== last.current.street) { last.current.street = sn; useGame.setState({ street: sn }); } }
    }
  });
  return <group ref={group}><primitive object={model} /></group>;
}
