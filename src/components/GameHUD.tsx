import { useEffect, useState } from 'react';
import { useGame } from '../store';
import { fmtHour } from '../systems/DayNightCycle';
import { Minimap, BigMap } from './Minimap';
import { RT } from '../systems/runtime';

const W_ICON = { clear: '☀️', cloudy: '☁️', rain: '🌧️' } as const;

export function GameHUD() {
  const s = useGame();
  const [hint, setHint] = useState(true);
  useEffect(() => { if (s.screen === 'playing') { const t = window.setTimeout(() => setHint(false), 14000); return () => window.clearTimeout(t); } return undefined; }, [s.screen]);
  if (s.screen === 'menu') return null;
  const night = s.hour < 6 || s.hour > 20.5; const icon = s.weather === 'clear' && night ? '🌙' : W_ICON[s.weather];
  return (
    <div className="hud">
      <div className="hud-tl">
        <div className="clock"><span className="t">{fmtHour(s.hour)}</span><span className="w">{icon} {s.weather === 'clear' ? (night ? 'Klar' : 'Sonnig') : s.weather === 'cloudy' ? 'Bewölkt' : 'Regen'}</span></div>
        <div className="where"><b>{s.district}</b><span>{s.inside ? ROOMS_T[s.inside] : s.street}</span></div>
      </div>
      {s.settings.showFps && <div className="fps">{s.fps} FPS</div>}
      <div className="hud-bl"><Minimap /></div>
      {s.prompt && !s.dialog && <div className="prompt"><kbd>E</kbd>{s.prompt}</div>}
      {s.driving && (
        <div className="speedo">
          <svg viewBox="0 0 200 120"><path d="M20 110 A80 80 0 0 1 180 110" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="10" strokeLinecap="round" />
            <path d="M20 110 A80 80 0 0 1 180 110" fill="none" stroke="#f0ab00" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${Math.min(1, s.speedKmh / 140) * 251} 400`} />
            {[0, 20, 40, 60, 80, 100, 120, 140].map((v) => { const a = Math.PI - (v / 140) * Math.PI; return <text key={v} x={100 + Math.cos(a) * 62} y={112 - Math.sin(a) * 62} fill="rgba(255,255,255,.6)" fontSize="10" textAnchor="middle">{v}</text>; })}
          </svg>
          <div className="kmh"><b>{s.speedKmh}</b><span>km/h</span></div><div className="gear">{s.gear}</div>
          <div className="keys">F · aussteigen</div>
        </div>
      )}
      {s.toast && <div className="toast">{s.toast}</div>}
      {s.dialog && (
        <div className="dialog" onClick={() => useGame.getState().set({ dialog: null })}>
          <b>{s.dialog.name}</b>
          {s.dialog.de.split('\n').map((l, i) => <p key={i} className="de">{l}</p>)}
          {s.dialog.en.split('\n').map((l, i) => <p key={i} className="en">{l}</p>)}
          <small>Click or press Esc to continue</small>
        </div>
      )}
      {hint && s.screen === 'playing' && !s.driving && <div className="hint">WASD move · Shift run · Space jump · Mouse look · E interact · M map · Esc pause</div>}
      {s.panel === 'map' && <BigMap />}
      {s.screen === 'playing' && !RT.input.locked && !s.panel && !s.dialog && <div className="clickhint">Click to control the camera</div>}
    </div>
  );
}
const ROOMS_T: Record<string, string> = { cafe: 'im Café', spaeti: 'im Späti', baeckerei: 'in der Bäckerei' };
