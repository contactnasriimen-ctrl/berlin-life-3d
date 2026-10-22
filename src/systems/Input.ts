import { RT } from './runtime';
import { useGame } from '../store';

/** Keyboard + mouse (pointer lock) input. Keys are physical codes, so ZQSD on AZERTY works like WASD. */
export function installInput(canvas: HTMLElement) {
  const inp = RT.input;
  const typing = (e: Event) => { const t = e.target as HTMLElement | null; return !!t && /INPUT|TEXTAREA|SELECT/.test(t.tagName); };

  const down = (e: KeyboardEvent) => {
    if (typing(e)) return;
    const g = useGame.getState();
    if (e.code === 'Escape') {
      if (g.screen === 'playing' && (g.panel || g.dialog)) { g.set({ panel: null, dialog: null }); return; }
      if (g.screen === 'playing') { g.setScreen('paused'); document.exitPointerLock?.(); return; }
      if (g.screen === 'paused' && !g.panel) { g.setScreen('playing'); requestLock(); return; }
    }
    if (g.screen !== 'playing') return;
    if (e.code === 'KeyM') { g.setPanel(g.panel === 'map' ? null : 'map'); return; }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!e.repeat) inp.pressed.add(e.code);
    inp.keys.add(e.code);
  };
  const up = (e: KeyboardEvent) => { inp.keys.delete(e.code); };
  const blur = () => { inp.keys.clear(); };
  const move = (e: MouseEvent) => {
    if (!inp.locked) return;
    inp.mouseDX += e.movementX;
    inp.mouseDY += e.movementY;
  };
  const wheel = (e: WheelEvent) => { if (useGame.getState().screen === 'playing') inp.wheel += e.deltaY; };
  const lockChange = () => {
    inp.locked = document.pointerLockElement === canvas;
    const g = useGame.getState();
    if (!inp.locked && g.screen === 'playing' && !g.panel && !g.dialog) g.setScreen('paused');
  };
  const click = () => { const g = useGame.getState(); if (g.screen === 'playing' && !inp.locked && !g.panel) requestLock(); };
  // drag-to-look fallback when pointer lock is not available (or on touch screens)
  let drag: { x: number; y: number } | null = null;
  const pdown = (e: PointerEvent) => { if (!inp.locked && e.button === 0) drag = { x: e.clientX, y: e.clientY }; };
  const pmove = (e: PointerEvent) => { if (!drag || inp.locked) return; inp.mouseDX += (e.clientX - drag.x) * 1.5; inp.mouseDY += (e.clientY - drag.y) * 1.5; drag = { x: e.clientX, y: e.clientY }; };
  const pup = () => { drag = null; };

  function requestLock() {
    try { const r = (canvas as any).requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch { /* not allowed (iframe, headless) */ }
  }

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  document.addEventListener('mousemove', move);
  window.addEventListener('wheel', wheel, { passive: true });
  document.addEventListener('pointerlockchange', lockChange);
  canvas.addEventListener('click', click);
  canvas.addEventListener('pointerdown', pdown);
  window.addEventListener('pointermove', pmove);
  window.addEventListener('pointerup', pup);
  return {
    requestLock,
    dispose() {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur);
      document.removeEventListener('mousemove', move); window.removeEventListener('wheel', wheel); document.removeEventListener('pointerlockchange', lockChange);
      canvas.removeEventListener('click', click); canvas.removeEventListener('pointerdown', pdown); window.removeEventListener('pointermove', pmove); window.removeEventListener('pointerup', pup);
    },
  };
}

export let inputApi: ReturnType<typeof installInput> | null = null;
export function setInputApi(a: ReturnType<typeof installInput>) { inputApi = a; }
