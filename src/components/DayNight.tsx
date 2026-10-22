import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Environment } from '@react-three/drei';
import { skyState } from '../systems/DayNightCycle';
import { updateMaterials } from '../systems/Materials';
import { RT } from '../systems/runtime';
import { useGame, type Weather } from '../store';
import { QUALITY } from '../systems/Quality';
import { CITY } from '../systems/CityGen';

const WEATHER_CYCLE: Weather[] = ['clear', 'clear', 'cloudy', 'rain', 'cloudy'];

/** Sun, moon, sky, fog, reflections, street lights and wet streets – all driven by the game clock. */
export function DayNight() {
  const { scene, gl } = useThree();
  const sky = useRef<any>(null); const sun = useRef<THREE.DirectionalLight>(null); const moon = useRef<THREE.DirectionalLight>(null); const hemi = useRef<THREE.HemisphereLight>(null); const stars = useRef<THREE.Points>(null);
  const lampLights = useRef<(THREE.PointLight | null)[]>([]);
  const quality = useGame((s) => s.settings.quality); const Q = QUALITY[quality];
  const [env, setEnv] = useState({ key: 0, sun: new THREE.Vector3(0.3, 0.7, 0.2), turbidity: 4, rayleigh: 1 });
  const last = useRef({ hour: -10, weather: '' as string, hud: 0, wchange: 0, lamp: 0 });
  useMemo(() => { scene.fog = new THREE.Fog('#bcd3e2', 200, 1200); }, [scene]);
  useFrame((state, dt) => {
    const g = useGame.getState();
    if (g.screen === 'playing') RT.hour = (RT.hour + (dt * g.settings.timeSpeed) / 60) % 24;
    // weather: fixed by the settings, or changing by itself every ~25 game minutes
    const want = g.settings.weather;
    if (want !== 'auto') RT.weather = want;
    else { last.current.wchange += dt * g.settings.timeSpeed; if (last.current.wchange > 90) { last.current.wchange = 0; RT.weather = WEATHER_CYCLE[(WEATHER_CYCLE.indexOf(RT.weather) + 1) % WEATHER_CYCLE.length]; } }
    RT.wet += ((RT.weather === 'rain' ? 1 : 0) - RT.wet) * Math.min(1, dt * (RT.weather === 'rain' ? 0.25 : 0.05));
    const s = skyState(RT.hour, RT.weather); RT.sunDir.copy(s.sunDir); RT.night = s.lampsOn;
    const p = RT.player.mode === 'drive' && RT.car ? RT.car.pos : RT.player.pos;
    if (sun.current) {
      sun.current.position.set(p.x + s.sunDir.x * 160, p.y + Math.max(20, s.sunDir.y * 160), p.z + s.sunDir.z * 160); sun.current.target.position.copy(p); sun.current.target.updateMatrixWorld();
      sun.current.intensity = s.sunIntensity; sun.current.color.copy(s.sunColor); sun.current.castShadow = Q.shadows && s.sunIntensity > 0.15;
    }
    if (moon.current) { moon.current.position.set(p.x + s.moonDir.x * 160, p.y + s.moonDir.y * 160, p.z + s.moonDir.z * 160); moon.current.target.position.copy(p); moon.current.target.updateMatrixWorld(); moon.current.intensity = s.moonIntensity; moon.current.castShadow = Q.shadows && s.moonIntensity > 0.15 && s.sunIntensity < 0.15; }
    if (hemi.current) { hemi.current.intensity = s.hemiIntensity; hemi.current.color.set(s.night > 0.5 ? '#4a5d8a' : '#cfe3ff'); hemi.current.groundColor.set(s.night > 0.5 ? '#1a1d24' : '#6b6656'); }
    const fog = scene.fog as THREE.Fog; fog.color.copy(s.fogColor); fog.near = s.fogNear; fog.far = Q.draw + (RT.weather === 'rain' ? -150 : 150);
    gl.toneMappingExposure = s.exposure;
    if (sky.current?.material) { const u = sky.current.material.uniforms; u.sunPosition.value.copy(s.sunDir); u.turbidity.value = s.turbidity; u.rayleigh.value = s.rayleigh; u.mieCoefficient.value = 0.005 + s.cloud * 0.02; }
    if (stars.current) { stars.current.visible = s.night > 0.4 && RT.weather === 'clear'; }
    scene.environmentIntensity = 0.35 + s.day * 0.75;
    updateMaterials(s.lampsOn, RT.wet);
    // the 4 street lamps nearest to you really light the street at night
    last.current.lamp = (last.current.lamp || 0) - dt;
    if (s.lampsOn > 0.05 && last.current.lamp <= 0) {
      last.current.lamp = 0.5;
      const near = CITY.lamps.map(([x, z]) => [x, z, (x - p.x) ** 2 + (z - p.z) ** 2]).sort((a, b) => a[2] - b[2]).slice(0, 4);
      lampLights.current.forEach((l, i) => { if (!l || !near[i]) return; l.position.set(near[i][0], 5.2, near[i][1]); l.intensity = 30 * s.lampsOn; });
    } else if (s.lampsOn <= 0.05) lampLights.current.forEach((l) => { if (l) l.intensity = 0; });
    // reflections: re-render the sky into the environment map when the light has changed enough
    if (Math.abs(RT.hour - last.current.hour) > 0.35 || last.current.weather !== RT.weather) { last.current.hour = RT.hour; last.current.weather = RT.weather; setEnv((e) => ({ key: e.key + 1, sun: s.sunDir.clone(), turbidity: s.turbidity, rayleigh: s.rayleigh })); }
    last.current.hud -= dt; if (last.current.hud <= 0) { last.current.hud = 0.5; useGame.setState({ hour: RT.hour, weather: RT.weather }); }
  });
  return (
    <>
      <Sky ref={sky} distance={4500} sunPosition={[0.3, 0.7, 0.2]} turbidity={4} rayleigh={1} mieCoefficient={0.005} mieDirectionalG={0.85} />
      <Stars ref={stars as any} radius={1600} depth={200} count={4000} factor={6} saturation={0} fade />
      <directionalLight ref={sun} castShadow intensity={3} shadow-mapSize={[Q.shadowSize, Q.shadowSize]} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-Q.shadowBox} shadow-camera-right={Q.shadowBox} shadow-camera-top={Q.shadowBox} shadow-camera-bottom={-Q.shadowBox} shadow-camera-near={10} shadow-camera-far={400} />
      <directionalLight ref={moon} color="#9db4ff" intensity={0} />
      <hemisphereLight ref={hemi} args={['#cfe3ff', '#6b6656', 0.6]} />
      {[0, 1, 2, 3].map((k) => <pointLight key={k} ref={(l) => { lampLights.current[k] = l; }} color="#ffcf8a" intensity={0} distance={26} decay={1.6} position={[0, -100, 0]} />)}
      <Environment key={env.key} resolution={64} frames={1}>
        <Sky distance={50} sunPosition={env.sun} turbidity={env.turbidity} rayleigh={env.rayleigh} mieCoefficient={0.005} mieDirectionalG={0.85} />
        <mesh rotation-x={-Math.PI / 2} position={[0, -2, 0]}><planeGeometry args={[200, 200]} /><meshBasicMaterial color={env.sun.y > 0 ? '#6b6a5e' : '#0c0d12'} /></mesh>
      </Environment>
    </>
  );
}
