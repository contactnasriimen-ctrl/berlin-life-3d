import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { useGame } from '../store';
import { QUALITY } from '../systems/Quality';
import { RT } from '../systems/runtime';
import { installInput, setInputApi } from '../systems/Input';
import { DayNight } from './DayNight';
import { BerlinEnvironment } from './BerlinEnvironment';
import { Buildings } from './Building';
import { Landmarks } from './Landmarks';
import { Player } from './Player';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { Vehicles } from './Vehicle';
import { TrafficSystem } from './TrafficSystem';
import { NPCs } from './NPC';
import { SBahn } from './SBahn';
import { Interiors } from './Interiors';
import { Weather } from './Weather';
import { Effects } from './Effects';
import { FrameStats } from './FrameStats';

function Boot() {
  const { gl, camera, scene } = useThree();
  useEffect(() => {
    RT.camObj = camera; if ((window as any).__RT) (window as any).__scene = scene; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const api = installInput(gl.domElement); setInputApi(api);
    const t = window.setTimeout(() => useGame.getState().set({ loading: null }), 400);
    return () => { api.dispose(); window.clearTimeout(t); };
  }, [gl, camera]);
  return null;
}

export function GameScene() {
  const quality = useGame((s) => s.settings.quality); const screen = useGame((s) => s.screen); const Q = QUALITY[quality];
  return (
    <Canvas shadows dpr={Math.min(window.devicePixelRatio || 1, Q.dpr)} gl={{ antialias: Q.fx === 'none', powerPreference: 'high-performance', stencil: false }} camera={{ fov: 62, near: 0.2, far: 4000, position: [60, 40, 60] }}>
      <Boot />
      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]} paused={screen !== 'playing'} timeStep={1 / 60}>
          <DayNight />
          <BerlinEnvironment />
          <Buildings />
          <Landmarks />
          <SBahn />
          <Interiors />
          <Player />
          <Vehicles />
          <TrafficSystem />
          <NPCs />
        </Physics>
        <Weather />
        <ThirdPersonCamera />
        <Effects />
        <FrameStats />
      </Suspense>
    </Canvas>
  );
}
