import { useGame, type Quality, type Weather } from '../store';
import { RT } from '../systems/runtime';
import { inputApi } from '../systems/Input';
import { STATIONS } from '../data/cityDistricts';
import { travelTo } from './SBahn';
import { fmtHour } from '../systems/DayNightCycle';

let started = false;
function play() {
  const g = useGame.getState();
  if (!started) { started = true; RT.teleport = { x: 34, y: 0.3, z: 6, heading: -Math.PI / 2 }; RT.cam.yaw = Math.PI / 2; RT.cam.pitch = 0.18; RT.hour = 10; }
  RT.frozen = false; g.setScreen('playing'); inputApi?.requestLock();
}
function quit() { const g = useGame.getState(); g.setScreen('menu'); g.set({ dialog: null }); document.exitPointerLock?.(); }

export function Menus() {
  const s = useGame();
  if (s.loading) return <div className="loading"><div className="spinner" /><span>{s.loading}</span></div>;
  if (s.screen === 'playing' && s.panel === 'sbahn') return <SBahnPanel />;
  if (s.screen === 'playing') return null;
  return (
    <div className={`menu ${s.screen}`}>
      {!s.panel && (
        <div className="menu-card">
          {s.screen === 'menu' ? (<><div className="logo"><span>BERLIN</span><b>LIFE 3D</b></div><p className="tag">An open-world day in Berlin · Mitte · Kreuzberg · Friedrichshain · Charlottenburg · Neukölln</p></>) : <h2>Paused</h2>}
          <div className="menu-btns">
            <button className="primary" onClick={play}>{s.screen === 'menu' ? (started ? 'Continue' : 'Play Game') : 'Resume'}</button>
            {s.screen === 'paused' && <button onClick={() => s.setPanel('map')}>Map</button>}
            <button onClick={() => s.setPanel('settings')}>Settings</button>
            <button onClick={() => s.setPanel('controls')}>Controls</button>
            {s.screen === 'paused' && <button onClick={quit}>Quit to main menu</button>}
          </div>
          {s.screen === 'menu' && <p className="credits">Procedural city · landmarks modelled in code · all textures generated in the browser · three.js, React Three Fiber, Rapier</p>}
        </div>
      )}
      {s.panel === 'settings' && <SettingsPanel />}
      {s.panel === 'controls' && <ControlsPanel />}
      {s.panel === 'map' && s.screen === 'paused' && <MapLink />}
    </div>
  );
}

function MapLink() { return null; }

function SettingsPanel() {
  const s = useGame(); const st = s.settings; const set = s.setSettings;
  const Q: Quality[] = ['low', 'medium', 'high', 'ultra']; const WX: (Weather | 'auto')[] = ['auto', 'clear', 'cloudy', 'rain'];
  return (
    <div className="panel settings">
      <div className="panel-h"><b>Settings</b><button onClick={() => s.setPanel(null)}>Back</button></div>
      <label><span>Graphics quality</span><div className="seg">{Q.map((q) => <button key={q} aria-pressed={st.quality === q} onClick={() => set({ quality: q, autoQuality: false })}>{q}</button>)}</div></label>
      <p className="note">Low: no shadows, fewer people and cars · Medium: shadows · High: + glow, sharper · Ultra: + ambient occlusion, most people and cars. Choosing one turns automatic quality off.</p>
      <label><span>Mouse sensitivity · {st.sensitivity.toFixed(2)}</span><input type="range" min={0.3} max={2.5} step={0.05} value={st.sensitivity} onChange={(e) => set({ sensitivity: +e.target.value })} /></label>
      <label className="row"><span>Invert mouse Y</span><input type="checkbox" checked={st.invertY} onChange={(e) => set({ invertY: e.target.checked })} /></label>
      <label><span>Time of day · {fmtHour(s.hour)}</span><div className="seg">{[['Sunrise', 6.4], ['Day', 12], ['Sunset', 19.6], ['Night', 23]].map(([n, h]) => <button key={n as string} onClick={() => { RT.hour = h as number; useGame.setState({ hour: h as number }); }}>{n}</button>)}</div></label>
      <label><span>Day–night speed · {st.timeSpeed} game min / s</span><input type="range" min={0} max={20} step={0.5} value={st.timeSpeed} onChange={(e) => set({ timeSpeed: +e.target.value })} /></label>
      <label><span>Weather</span><div className="seg">{WX.map((w) => <button key={w} aria-pressed={st.weather === w} onClick={() => set({ weather: w })}>{w}</button>)}</div></label>
      <label><span>Your character</span><div className="seg"><button aria-pressed={st.charSex === 'm'} onClick={() => set({ charSex: 'm' })}>Man</button><button aria-pressed={st.charSex === 'f'} onClick={() => set({ charSex: 'f' })}>Woman</button><button onClick={() => set({ charSeed: Math.floor(Math.random() * 1e5) })}>New look</button></div></label>
      <label className="row"><span>Lower quality automatically when it runs slowly</span><input type="checkbox" checked={st.autoQuality} onChange={(e) => set({ autoQuality: e.target.checked })} /></label>
      <label className="row"><span>Show FPS</span><input type="checkbox" checked={st.showFps} onChange={(e) => set({ showFps: e.target.checked })} /></label>
    </div>
  );
}

function ControlsPanel() {
  const s = useGame();
  const rows = [['W A S D / arrows', 'Walk (Z Q S D on AZERTY)'], ['Shift', 'Run'], ['Space', 'Jump · handbrake in a car'], ['Mouse / drag', 'Turn the camera'], ['Mouse wheel', 'Zoom'], ['E', 'Interact · enter a car, a shop or the S-Bahn · talk'], ['F', 'Get out of the car'], ['M', 'Map'], ['Esc', 'Pause menu']];
  return (
    <div className="panel controls">
      <div className="panel-h"><b>Controls</b><button onClick={() => s.setPanel(null)}>Back</button></div>
      <table><tbody>{rows.map(([k, v]) => <tr key={k}><td><kbd>{k}</kbd></td><td>{v}</td></tr>)}</tbody></table>
      <p className="note">Driving: W accelerate · S brake / reverse · A D steer · Space handbrake · F get out.</p>
    </div>
  );
}

function SBahnPanel() {
  const s = useGame(); const here = RT.station;
  return (
    <div className="menu playing-panel">
      <div className="panel sbahn">
        <div className="panel-h"><b><span className="s-logo">S</span> S-Bahn Berlin</b><button onClick={() => { s.setPanel(null); inputApi?.requestLock(); }}>Close</button></div>
        <p className="note">You are at <b>{STATIONS[here].name}</b>. Where do you want to go?</p>
        <ol className="line">{STATIONS.map((st, i) => <li key={st.id} className={i === here ? 'here' : ''}><button disabled={i === here} onClick={() => { travelTo(i); inputApi?.requestLock(); }}>{st.name}</button></li>)}</ol>
      </div>
    </div>
  );
}
