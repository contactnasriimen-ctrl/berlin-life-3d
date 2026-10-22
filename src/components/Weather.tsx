import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RT } from '../systems/runtime';
import { useGame } from '../store';

const N = 2600;
/** Rain streaks around the camera and a layer of soft clouds that thickens with bad weather. */
export function Weather() {
  const rain = useRef<THREE.InstancedMesh>(null);
  const drops = useMemo(() => Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 60, y: Math.random() * 30, z: (Math.random() - 0.5) * 60, v: 18 + Math.random() * 8 })), []);
  const geo = useMemo(() => new THREE.BoxGeometry(0.022, 0.9, 0.022), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#d6e2ea', transparent: true, opacity: 0.6, depthWrite: false }), []);
  const cloudTex = useMemo(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d')!; for (let k = 0; k < 40; k++) { const x = 60 + Math.random() * 136; const y = 80 + Math.random() * 96; const r = 30 + Math.random() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } return new THREE.CanvasTexture(c); }, []);
  const clouds = useMemo(() => Array.from({ length: 70 }, (_, k) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0 })); const s = 180 + Math.random() * 260; m.scale.set(s, s * 0.45, 1); m.position.set((Math.random() - 0.5) * 3000, 260 + Math.random() * 120, (Math.random() - 0.5) * 2400); m.userData.k = k; return m; }), [cloudTex]);
  const grp = useMemo(() => { const g = new THREE.Group(); clouds.forEach((c) => g.add(c)); return g; }, [clouds]);
  const m4 = new THREE.Matrix4(); const amount = useRef(0);
  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05); const cam = RT.camObj; if (!cam) return;
    const target = RT.weather === 'rain' ? 1 : 0; amount.current += (target - amount.current) * Math.min(1, dt * 0.4);
    const im = rain.current; const n = Math.floor(N * amount.current);
    if (im) {
      for (let i = 0; i < n; i++) { const d = drops[i]; d.y -= d.v * dt; if (d.y < -2) { d.y = 28 + Math.random() * 4; d.x = (Math.random() - 0.5) * 60; d.z = (Math.random() - 0.5) * 60; } m4.makeTranslation(cam.position.x + d.x, cam.position.y - 6 + d.y, cam.position.z + d.z); im.setMatrixAt(i, m4); }
      im.count = n; im.instanceMatrix.needsUpdate = true; im.visible = n > 0 && !useGame.getState().inside;
    }
    // clouds: few and white when clear, many and grey when it rains; dark at night
    const cover = RT.weather === 'clear' ? 0.25 : RT.weather === 'cloudy' ? 0.85 : 1; const shade = RT.weather === 'rain' ? 0.55 : 0.92; const night = RT.night;
    for (const c of clouds) { const on = (c.userData.k / clouds.length) < cover; const mm = c.material as THREE.SpriteMaterial; mm.opacity += ((on ? 0.85 : 0) - mm.opacity) * Math.min(1, dt * 0.3); mm.color.setScalar(shade * (1 - night * 0.8)); c.position.x += dt * 3; if (c.position.x > 1600) c.position.x = -1600; }
    void st;
  });
  return (<><instancedMesh ref={rain} args={[geo, mat, N]} frustumCulled={false} /><primitive object={grp} /></>);
}
