import { useEffect, useRef } from 'react';
import { RT } from '../systems/runtime';
import { mapCanvas, toMap, landmarkPositions } from '../systems/MapRender';
import { STATIONS } from '../data/cityDistricts';
import { useGame } from '../store';

/** Round minimap that turns with the camera (forward is always up). */
export function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0; let last = 0; const map = mapCanvas(); const lms = landmarkPositions();
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw); if (t - last < 66) return; last = t; const c = ref.current; if (!c) return; const g = c.getContext('2d')!; const S = c.width; const r = S / 2;
      const driving = RT.player.mode === 'drive' && RT.car; const inside = useGame.getState().inside && RT.outside; const me = inside ? { x: RT.outside!.x, z: RT.outside!.z } : driving ? RT.car!.pos : RT.player.pos; const zoom = driving ? 0.55 + 0.35 * Math.max(0, 1 - Math.abs(RT.car!.speed) / 30) : 1.1;
      const [mx, mz] = toMap(me.x, me.z); const fx = -Math.sin(RT.cam.yaw); const fz = -Math.cos(RT.cam.yaw); const rot = -Math.PI / 2 - Math.atan2(fz, fx);
      g.clearRect(0, 0, S, S); g.save(); g.beginPath(); g.arc(r, r, r - 2, 0, 7); g.clip();
      g.fillStyle = '#23272c'; g.fillRect(0, 0, S, S);
      g.translate(r, r); g.rotate(rot); g.scale(zoom, zoom); g.drawImage(map, -mx, -mz);
      // landmarks
      for (const l of lms) { const [lx, lz] = toMap(l.x, l.z); g.save(); g.translate(lx - mx, lz - mz); g.rotate(-rot); g.scale(1 / zoom, 1 / zoom); g.font = '15px "Segoe UI Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l.icon, 0, 0); g.restore(); }
      void STATIONS;
      g.restore();
      // you
      const head = driving ? RT.car!.heading : RT.player.heading; const a = rot + Math.atan2(Math.cos(head), Math.sin(head)) ; void a;
      g.save(); g.translate(r, r); const dir = Math.atan2(Math.cos(head), Math.sin(head)) + rot; g.rotate(dir + Math.PI / 2);
      g.fillStyle = '#f0ab00'; g.strokeStyle = '#13202b'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
      // north marker
      const nx = r + Math.cos(rot - Math.PI / 2) * (r - 12); const nz = r + Math.sin(rot - Math.PI / 2) * (r - 12);
      g.fillStyle = '#e5484d'; g.beginPath(); g.arc(nx, nz, 9, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 11px Inter, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', nx, nz + 0.5);
      g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 3; g.beginPath(); g.arc(r, r, r - 2, 0, 7); g.stroke();
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="minimap" width={200} height={200} />;
}

/** The big map (key M) */
export function BigMap() {
  const ref = useRef<HTMLCanvasElement>(null); const close = () => useGame.getState().setPanel(null);
  useEffect(() => {
    const c = ref.current; if (!c) return; const map = mapCanvas(); const g = c.getContext('2d')!; const k = Math.min(c.width / map.width, c.height / map.height);
    g.fillStyle = '#1b1f24'; g.fillRect(0, 0, c.width, c.height); const ox = (c.width - map.width * k) / 2; const oy = (c.height - map.height * k) / 2; g.drawImage(map, ox, oy, map.width * k, map.height * k);
    for (const l of landmarkPositions()) { const [x, z] = toMap(l.x, l.z); g.font = '18px "Segoe UI Emoji", sans-serif'; g.textAlign = 'center'; g.fillText(l.icon, ox + x * k, oy + z * k); g.font = '600 12px Inter, Arial'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3; g.strokeText(l.name, ox + x * k, oy + z * k + 16); g.fillText(l.name, ox + x * k, oy + z * k + 16); }
    for (const s of STATIONS) { const [x, z] = toMap(s.at[0], s.at[1]); g.font = '600 11px Inter, Arial'; g.fillStyle = '#7ee2a8'; g.fillText(s.name, ox + x * k, oy + z * k - 14); }
    const me = RT.player.mode === 'drive' && RT.car ? RT.car.pos : RT.player.pos; const [px, pz] = toMap(me.x, me.z);
    g.fillStyle = '#f0ab00'; g.strokeStyle = '#13202b'; g.lineWidth = 3; g.beginPath(); g.arc(ox + px * k, oy + pz * k, 8, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.font = '700 13px Inter'; g.fillText('YOU', ox + px * k, oy + pz * k - 14);
  }, []);
  return (
    <div className="panel bigmap" onClick={close}>
      <div className="panel-h"><b>Berlin</b><span>Map · press M or click to close</span></div>
      <canvas ref={ref} width={1180} height={680} />
      <div className="legend"><span><i style={{ background: '#2f6f9a' }} /> Spree</span><span><i style={{ background: '#3f6340' }} /> Parks</span><span><i style={{ background: '#b4523b' }} /> S-Bahn</span><span><i style={{ background: '#d7dadd' }} /> Streets</span></div>
    </div>
  );
}
