import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../store';

export function FrameStats() {
  const acc = useRef({ n: 0, t: 0 });
  useFrame((st, dt) => {
    const a = acc.current; a.n++; a.t += dt;
    if (a.t > 0.5) { const fps = Math.round(a.n / a.t); a.n = 0; a.t = 0; if (useGame.getState().settings.showFps) useGame.setState({ fps }); (window as any).__berlin = { fps, calls: st.gl.info.render.calls, tris: st.gl.info.render.triangles }; }
  });
  return null;
}
