import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { RT } from '../systems/runtime';
import { useGame } from '../store';

const tmp = new THREE.Vector3(); const tgt = new THREE.Vector3();

/** Orbit camera behind the player (or the car). Mouse turns it, the wheel zooms, walls push it closer. */
export function ThirdPersonCamera() {
  const { camera } = useThree();
  const s = useRef({ menuA: 0.6, lastMouse: 0, smoothT: new THREE.Vector3(), init: false });
  useFrame((state, dt) => {
    const g = useGame.getState(); const cam = RT.cam; const inp = RT.input; dt = Math.min(dt, 0.05);
    if (g.screen === 'menu') {
      // cinematic flight around Mitte behind the main menu
      s.current.menuA += dt * 0.035; const a = s.current.menuA; const cx = 250; const cz = -60;
      camera.position.set(cx + Math.cos(a) * 420, 95 + Math.sin(a * 0.7) * 25, cz + Math.sin(a) * 300); camera.lookAt(300, 35, -80); s.current.init = false; inp.mouseDX = 0; inp.mouseDY = 0; return;
    }
    const sens = g.settings.sensitivity; const inv = g.settings.invertY ? -1 : 1;
    if (g.screen === 'playing' && !g.panel) {
      if (inp.mouseDX || inp.mouseDY) s.current.lastMouse = state.clock.elapsedTime;
      cam.yaw -= inp.mouseDX * 0.0024 * sens; cam.pitch = THREE.MathUtils.clamp(cam.pitch + inp.mouseDY * 0.002 * sens * inv, -0.25, 1.25);
      if (inp.wheel) cam.targetDist = THREE.MathUtils.clamp(cam.targetDist + inp.wheel * 0.004, 2.2, RT.player.mode === 'drive' ? 16 : 12);
    }
    inp.mouseDX = 0; inp.mouseDY = 0; inp.wheel = 0;
    const driving = RT.player.mode === 'drive' && RT.car;
    if (driving) {
      const c = RT.car!; tgt.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
      // swing behind the car when driving and the mouse is idle
      if (state.clock.elapsedTime - s.current.lastMouse > 1.2 && Math.abs(c.speed) > 2) { const want = c.heading + (c.speed < 0 ? 0 : Math.PI); let d = want - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * Math.min(1, dt * 2.2); cam.pitch += (0.22 - cam.pitch) * Math.min(1, dt); }
      if (cam.targetDist < 7) cam.targetDist = 7.5;
    } else tgt.set(RT.player.pos.x, RT.player.pos.y + 1.55, RT.player.pos.z);
    if (!s.current.init) { s.current.smoothT.copy(tgt); s.current.init = true; cam.dist = cam.targetDist; }
    s.current.smoothT.lerp(tgt, 1 - Math.exp(-dt * (driving ? 10 : 16)));
    const T = s.current.smoothT;
    const dir = tmp.set(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)).normalize();
    let dist = cam.targetDist;
    // keep the camera out of walls
    const W = RT.world; const R = RT.rapier;
    if (W && R) {
      const ray = new R.Ray({ x: T.x, y: T.y, z: T.z }, { x: dir.x, y: dir.y, z: dir.z });
      const hit = W.castRay(ray, dist, true, undefined, undefined, undefined, RT.player.mode === 'drive' ? RT.car?.body : undefined, (c: any) => c !== RT.playerCollider && !(RT.carColliders && RT.carColliders.has(c.handle)));
      if (hit) dist = Math.max(0.8, hit.timeOfImpact - 0.25);
    }
    cam.dist += (dist - cam.dist) * Math.min(1, dt * (dist < cam.dist ? 20 : 4));
    camera.position.set(T.x + dir.x * cam.dist, Math.max(T.y - 1.25, T.y + dir.y * cam.dist), T.z + dir.z * cam.dist);
    camera.lookAt(T.x, T.y + (driving ? 0 : 0.15), T.z);
  });
  return null;
}
