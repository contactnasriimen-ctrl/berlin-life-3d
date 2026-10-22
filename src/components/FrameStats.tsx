import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../store';
import { mark } from '../systems/prof';
import { QUALITY_ORDER } from '../systems/Quality';

/** FPS counter + automatic quality: if the game runs below 28 FPS for a few seconds, it steps the quality down. */
export function FrameStats() {
  const acc = useRef({ n: 0, t: 0, warm: 5, slow: 0 });
  useFrame((st, dt) => {
    const a = acc.current; if (!(window as any).__ff) { (window as any).__ff = 1; mark('firstFrame'); }
    a.n++; a.t += dt;
    if (a.t < 1) return;
    const fps = Math.round(a.n / a.t); a.n = 0; a.t = 0; const g = useGame.getState();
    if (g.settings.showFps) useGame.setState({ fps });
    (window as any).__berlin = { fps, calls: st.gl.info.render.calls, tris: st.gl.info.render.triangles, quality: g.settings.quality };
    if (g.screen !== 'playing' || g.loading || !g.settings.autoQuality) { a.warm = 4; a.slow = 0; return; }
    if (a.warm > 0) { a.warm--; return; }
    a.slow = fps < 28 ? a.slow + 1 : 0;
    const i = QUALITY_ORDER.indexOf(g.settings.quality);
    if (a.slow >= 3 && i > 0) { const q = QUALITY_ORDER[i - 1]; g.setSettings({ quality: q }); g.showToast(`⚙ Graphics lowered to ${q} for smoother play (${fps} FPS) – change it in Settings`); a.slow = 0; a.warm = 5; }
  });
  return null;
}
