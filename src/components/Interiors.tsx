import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CITY, type Door } from '../systems/CityGen';
import { RT, type Interactable } from '../systems/runtime';
import { HK, randLook, seeded } from '../systems/Characters';
import { plainMat, metalMat, glassMat } from '../systems/Materials';
import { groundTex, signTex } from '../systems/Textures';
import { extraColliders } from './BerlinEnvironment';
import { useGame } from '../store';
import { mergeByMaterial } from '../systems/merge';

type Kind = Door['kind'];
const ROOMS: Record<Kind, { at: THREE.Vector3; title: string; staff: string; lines: [string, string][]; buy: [string, string, string] }> = {
  cafe: { at: new THREE.Vector3(0, -300, 0), title: 'Café', staff: 'Jonas', lines: [['Hallo! Was darf’s sein?', 'Hi! What can I get you?'], ['Einen Cappuccino? Kommt sofort.', 'A cappuccino? Coming right up.'], ['Mit Hafermilch? Kein Problem.', 'With oat milk? No problem.']], buy: ['Einen Kaffee, bitte.', 'A coffee, please.', '☕ Kaffee – 3,20 €'] },
  spaeti: { at: new THREE.Vector3(60, -300, 0), title: 'Späti', staff: 'Mehmet', lines: [['Na? Was brauchst du?', 'So? What do you need?'], ['Club-Mate ist im Kühlschrank hinten.', 'Club-Mate is in the fridge at the back.'], ['Wir haben bis zwei Uhr offen.', 'We’re open until 2 a.m.']], buy: ['Eine Club-Mate, bitte.', 'A Club-Mate, please.', '🥤 Club-Mate – 2,50 €'] },
  baeckerei: { at: new THREE.Vector3(120, -300, 0), title: 'Bäckerei', staff: 'Frau Wagner', lines: [['Guten Tag! Was hätten Sie gern?', 'Good day! What would you like?'], ['Die Schrippen sind ganz frisch.', 'The bread rolls are really fresh.'], ['Sonst noch etwas?', 'Anything else?']], buy: ['Zwei Schrippen und eine Brezel, bitte.', 'Two bread rolls and a pretzel, please.', '🥨 Brezel & Schrippen – 2,10 €'] },
};
const W = 16; const D = 12; const H = 3.8;

function buildRoom(kind: Kind) {
  const R = ROOMS[kind]; const g = new THREE.Group(); g.position.copy(R.at); const o = R.at;
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, coll = false) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); b.castShadow = true; b.receiveShadow = true; g.add(b); if (coll) extraColliders.push({ x: o.x + x, y: o.y + y + h / 2, z: o.z + z, w, h, d }); return b; };
  const floorT = groundTex(kind === 'cafe' ? 'paving' : 'concrete'); const fm = new THREE.MeshStandardMaterial({ map: floorT.map, normalMap: floorT.normal, roughness: 0.35, color: kind === 'cafe' ? '#c9a77a' : '#d8d8d8' });
  box(W, 0.2, D, 0, -0.2, 0, fm, true); box(W, 0.2, D, 0, H, 0, plainMat('#f2efe8', 0.9), false);
  const wallM = plainMat(kind === 'cafe' ? '#e9dcc8' : kind === 'spaeti' ? '#e8eef0' : '#f3e8cf', 0.95);
  box(W, H, 0.3, 0, 0, -D / 2, wallM, true); box(0.3, H, D, -W / 2, 0, 0, wallM, true); box(0.3, H, D, W / 2, 0, 0, wallM, true);
  box(6, H, 0.3, -5, 0, D / 2, wallM, true); box(6, H, 0.3, 5, 0, D / 2, wallM, true); box(4, 1, 0.3, 0, H - 1, D / 2, wallM, false); extraColliders.push({ x: o.x, y: o.y + H / 2, z: o.z + D / 2, w: 4, h: H, d: 0.3 }); // the door: you leave with E
  // shop window: bright street outside
  const win = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.4), new THREE.MeshBasicMaterial({ color: '#dfeaf2' })); win.position.set(-5, 1.6, D / 2 - 0.16); win.rotation.y = Math.PI; g.add(win);
  const win2 = win.clone(); win2.position.x = 5; g.add(win2);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.6), new THREE.MeshStandardMaterial({ color: '#2b3138', metalness: 0.5, roughness: 0.3 })); door.position.set(0, 1.3, D / 2 - 0.1); door.rotation.y = Math.PI; g.add(door);
  // counter and staff
  box(7, 1.1, 1, -2, 0, -D / 2 + 2.2, plainMat('#5b3a26', 0.6), true); box(7.2, 0.08, 1.15, -2, 1.1, -D / 2 + 2.2, plainMat('#e9e6df', 0.3));
  const staff = HK.build(randLook(seeded(kind === 'cafe' ? 41 : kind === 'spaeti' ? 77 : 12), kind === 'baeckerei' ? 'f' : 'm')); staff.position.set(-2, 0, -D / 2 + 1.1); g.add(staff);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.4), new THREE.MeshStandardMaterial({ map: signTex(kind === 'cafe' ? 'Kaffee 2,80 · Cappuccino 3,20 · Kuchen 3,90' : kind === 'spaeti' ? 'Club-Mate 2,50 · Bier 1,80 · Chips 1,90' : 'Schrippe 0,45 · Brezel 1,20 · Kuchen 2,80', '#1d2329', '#ffd25a', 1024, 160, '700 54px "Barlow Condensed", Arial') })); board.position.set(-2, 2.7, -D / 2 + 0.17); g.add(board);
  const lamps: THREE.PointLight[] = [];
  for (const x of [-4.5, 0, 4.5]) { const l = new THREE.PointLight('#ffd9a8', 14, 14, 1.6); l.position.set(x, H - 0.4, 0); g.add(l); lamps.push(l); const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff3d6' })); b.position.set(x, H - 0.5, 0); g.add(b); }
  if (kind === 'cafe') {
    box(1, 0.6, 0.7, -4.5, 1.18, -D / 2 + 2.1, metalMat('#c9ced3'));
    for (const [x, z] of [[3.5, -1.5], [3.5, 2.5], [-3, 2.5]]) { box(0.08, 0.75, 0.08, x, 0, z, metalMat()); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 20), plainMat('#f2f2ee', 0.4)); t.position.set(x, 0.77, z); g.add(t); extraColliders.push({ x: o.x + x, y: o.y + 0.4, z: o.z + z, w: 0.9, h: 0.8, d: 0.9 }); for (const s of [-1, 1]) box(0.45, 0.45, 0.45, x + s * 0.8, 0, z, plainMat('#3a2a1e', 0.7)); }
    const guest = HK.build(randLook(seeded(91))); guest.position.set(3.5 + 0.8, -0.85 * 1 + 0.45, -1.5); guest.rotation.y = -Math.PI / 2; g.add(guest); (guest as any).__sit = true;
  } else if (kind === 'spaeti') {
    const cols = ['#cf343a', '#2459c4', '#f0ab00', '#1b8a4e', '#e0681a', '#7a4bd8'];
    for (const [x, z, ry] of [[-W / 2 + 0.7, 0, Math.PI / 2], [W / 2 - 0.7, 0, -Math.PI / 2]] as [number, number, number][]) {
      const s = box(0.9, 2.2, 8, x, 0, z, plainMat('#cfd4d8', 0.6), true); void s;
      for (let r = 0; r < 4; r++) for (let k = 0; k < 14; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8), plainMat(cols[(k + r) % 6], 0.3)); b.position.set(x + (ry > 0 ? 0.3 : -0.3), 0.35 + r * 0.5, z - 3.6 + k * 0.55); g.add(b); }
    }
    const fridge = box(2.4, 2.4, 0.8, 4, 0, -D / 2 + 0.5, glassMat(), true); void fridge;
  } else {
    box(4, 1.3, 1, 3, 0, -D / 2 + 2.2, glassMat(), true);
    for (let k = 0; k < 8; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), plainMat('#b8783a', 0.7)); b.scale.set(1.5, 0.7, 1); b.position.set(1.4 + k * 0.45, 1.35, -D / 2 + 2.2); g.add(b); }
  }
  return { g, staff, lamps };
}

export function Interiors() {
  const rooms = useMemo(() => (Object.keys(ROOMS) as Kind[]).map((k) => { const r = buildRoom(k); mergeByMaterial(r.g); return { kind: k, ...r }; }), []);
  const st = useRef({ talk: 0 });
  const doorIts = useMemo<Interactable[]>(() => CITY.doors.map((d, i) => ({ id: `door-${i}`, label: `Enter ${d.name}`, key: 'E', pos: new THREE.Vector3(d.x, 0, d.z), radius: 2.6, run: () => enter(d) })), []);
  const inIts = useMemo<Interactable[]>(() => rooms.flatMap((r) => {
    const R = ROOMS[r.kind];
    return [
      { id: `exit-${r.kind}`, label: 'Leave', key: 'E' as const, pos: new THREE.Vector3(R.at.x, R.at.y, R.at.z + D / 2 - 1.2), radius: 2.4, run: () => leave() },
      { id: `order-${r.kind}`, label: `Order from ${R.staff}`, key: 'E' as const, pos: new THREE.Vector3(R.at.x - 2, R.at.y, R.at.z - D / 2 + 3.3), radius: 1.8, run: () => order(r.kind) },
    ];
  }), [rooms]);
  useEffect(() => { RT.interactables.push(...doorIts, ...inIts); return () => { for (const it of [...doorIts, ...inIts]) RT.interactables.splice(RT.interactables.indexOf(it), 1); }; }, [doorIts, inIts]);

  function enter(d: Door) {
    const g = useGame.getState(); const R = ROOMS[d.kind]; RT.outside = { x: d.x + Math.sin(d.ry) * 2.2, z: d.z + Math.cos(d.ry) * 2.2, heading: d.ry };
    g.set({ loading: d.name }); window.setTimeout(() => { RT.teleport = { x: R.at.x + 1.5, y: R.at.y + 0.1, z: R.at.z + 0.5, heading: Math.PI }; RT.cam.yaw = 0.35; RT.cam.pitch = 0.32; RT.cam.targetDist = 3.4; g.set({ inside: d.kind, loading: null }); }, 250);
  }
  function leave() {
    const g = useGame.getState(); const o = RT.outside; if (!o) return; g.set({ loading: '…' });
    window.setTimeout(() => { RT.teleport = { x: o.x, y: 0.3, z: o.z, heading: o.heading }; RT.cam.yaw = o.heading + Math.PI; RT.cam.targetDist = 5.2; g.set({ inside: null, loading: null }); }, 250);
  }
  function order(kind: Kind) {
    const R = ROOMS[kind]; const line = R.lines[st.current.talk++ % R.lines.length];
    useGame.getState().set({ dialog: { name: R.staff, de: `${line[0]}\n— ${R.buy[0]}`, en: `${line[1]}\n— ${R.buy[1]}` } });
    useGame.getState().showToast(R.buy[2]); RT.player.action = { kind: 'drink', t: 0, len: 2.6 };
  }

  useFrame((s, dt) => { const inside = useGame.getState().inside; for (const r of rooms) { r.g.visible = inside === r.kind; if (!r.g.visible) continue; HK.pose(r.staff, { mode: Math.sin(s.clock.elapsedTime * 0.8) > 0.2 ? 'talk' : 'idle', talking: Math.sin(s.clock.elapsedTime * 7) > 0.3 }, dt); r.g.traverse((o) => { if ((o as any).__sit) HK.pose(o as THREE.Group, { mode: 'sit' }, dt); }); } });
  return <>{rooms.map((r) => <primitive key={r.kind} object={r.g} />)}</>;
}
