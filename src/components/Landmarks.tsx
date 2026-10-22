import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { buildChunk, type Balcony } from '../systems/BuildingMesh';
import { matFor, plainMat, metalMat, glassMat } from '../systems/Materials';
import { muralTex, signTex } from '../systems/Textures';
import { spreeZ, SPREE_W, distToPolyline, SPREE } from '../data/cityDistricts';
import type { Box, Building } from '../systems/CityGen';
import { extraColliders } from './BerlinEnvironment';
import { mergeGeos } from './Building';
import { timed } from '../systems/prof';
import { mergeByMaterial } from '../systems/merge';

/* ---------- small modelling kit ---------- */
const sandstone = () => plainMat('#d8c9a8', 0.85);
const copper = () => plainMat('#5d9a83', 0.55, 0.35);
const gold = () => plainMat('#e2b54a', 0.25, 1);
const brick = () => plainMat('#a4472f', 0.9);
type G = THREE.Group;
function box(par: G, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, ry = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; par.add(m); return m; }
function cyl(par: G, rt: number, rb: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 18) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; par.add(m); return m; }
function sph(par: G, r: number, x: number, y: number, z: number, mat: THREE.Material, sx = 1, sy = 1, sz = 1, half = false) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; par.add(m); return m; }
function column(par: G, r: number, h: number, x: number, y: number, z: number, mat: THREE.Material) {
  // fluted shaft with a base and a capital
  const shaft = new THREE.CylinderGeometry(r * 0.88, r, h, 20, 1); const p = shaft.attributes.position;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const k = 1 - 0.05 * Math.max(0, Math.cos(a * 20)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  shaft.computeVertexNormals(); const m = new THREE.Mesh(shaft, mat); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; par.add(m);
  box(par, r * 2.6, r * 0.5, r * 2.6, x, y + h, z, mat); cyl(par, r * 1.25, r * 1.25, r * 0.4, x, y, z, mat, 20);
}
const col = (b: Box) => extraColliders.push(b);
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };
function facadeBuilding(par: G, b: Partial<Building> & { x0: number; z0: number; x1: number; z1: number; h: number }) {
  const full: Building = { style: 'stone', tint: [0.9, 0.86, 0.78], gf: 0, front: 0, shop: null, roof: 'flat', balcony: false, chunk: 'lm', district: 'mitte', ...b } as Building;
  const balc: Balcony[] = []; for (const p of buildChunk([full], balc)) { const m = new THREE.Mesh(p.geo, matFor(p.key)); m.castShadow = true; m.receiveShadow = true; par.add(m); }
  col({ x: (b.x0 + b.x1) / 2, y: b.h / 2, z: (b.z0 + b.z1) / 2, w: b.x1 - b.x0, h: b.h, d: b.z1 - b.z0 });
}
function textPlane(par: G, text: string, w: number, h: number, x: number, y: number, z: number, ry: number, bg = '#d8c9a8', fg = '#3a3226') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signTex(text, bg, fg, 1024, 128, '700 64px Georgia, serif'), roughness: 0.8 })); m.position.set(x, y, z); m.rotation.y = ry; par.add(m); return m;
}

/* ---------- the landmarks ---------- */
function brandenburgGate() {
  const g = new THREE.Group(); const s = sandstone();
  box(g, 9, 0.8, 44, 0, 0, 0, s); col({ x: 0, y: 0.4, z: 0, w: 9, h: 0.8, d: 44 });
  const zs = [-15.2, -9.4, -3.4, 3.4, 9.4, 15.2];
  for (const x of [-2.9, 2.9]) for (const z of zs) { column(g, 0.78, 9.6, x, 0.8, z, s); col({ x, y: 5.6, z, w: 1.7, h: 9.6, d: 1.7 }); }
  for (const z of [-15.2, -9.4, 9.4, 15.2]) { box(g, 4.6, 9.6, 1.1, 0, 0.8, z, s); col({ x: 0, y: 5.6, z, w: 5.8, h: 9.6, d: 1.4 }); }
  box(g, 8.4, 1.9, 33.5, 0, 10.4, 0, s); box(g, 8.8, 0.5, 34, 0, 12.3, 0, s); // entablature + cornice
  // triglyph frieze
  for (let z = -16; z <= 16; z += 1.6) box(g, 8.5, 1.1, 0.32, 0, 10.8, z, plainMat('#c4b38f', 0.85));
  box(g, 6.6, 2.6, 22, 0, 12.8, 0, s); box(g, 5, 1.6, 11, 0, 15.4, 0, s); // attic, raised centre
  // side wings (guard houses with porticos)
  for (const sd of [-1, 1]) { box(g, 9, 7, 7, -0.5, 0.8, sd * 25.5, s); box(g, 9.6, 0.6, 7.6, -0.5, 7.8, sd * 25.5, s); for (const x of [-3, 0, 3]) column(g, 0.45, 6, x + 4.6, 0.8, sd * 25.5, s); col({ x: 0, y: 4, z: sd * 25.5, w: 10, h: 8, d: 7 }); }
  // the Quadriga: Victoria on a chariot pulled by four horses, facing east
  const q = new THREE.Group(); q.position.set(0, 17, 0); g.add(q); const br = copper();
  for (const z of [-2.1, -0.7, 0.7, 2.1]) {
    const h = new THREE.Group(); h.position.set(1.6, 0, z); q.add(h); h.rotation.y = z * 0.06;
    sph(h, 1, 0, 1.55, 0, br, 1.15, 0.52, 0.42); // body
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.1, 10), br); neck.position.set(1.05, 2.05, 0); neck.rotation.z = -0.75; h.add(neck);
    sph(h, 0.3, 1.5, 2.5, 0, br, 1.4, 0.7, 0.6); // head
    for (const [lx, lz] of [[0.7, 0.22], [0.7, -0.22], [-0.7, 0.22], [-0.7, -0.22]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 1.25, 6), br); leg.position.set(lx + (lx > 0 ? 0.25 : 0), 0.75, lz); leg.rotation.z = lx > 0 ? -0.5 : 0.15; h.add(leg); }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.9, 6), br); tail.position.set(-1.2, 1.3, 0); tail.rotation.z = 0.6; h.add(tail);
  }
  box(q, 1.6, 1.3, 2.6, -1.2, 0.2, 0, br); // chariot
  const v = new THREE.Group(); v.position.set(-1.2, 1.5, 0); q.add(v);
  v.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 12), br), 0, 1.2, 0)); sph(v, 0.25, 0, 2.6, 0, br);
  for (const sd of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.7), br); wing.position.set(-0.3, 2.2, sd * 0.45); wing.rotation.x = sd * 0.5; v.add(wing); }
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), br); staff.position.set(0.4, 3, 0.4); v.add(staff);
  const eagle = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.07, 6, 16), br); eagle.position.set(0.4, 4.7, 0.4); v.add(eagle);
  return g;
}

function reichstag() {
  const g = new THREE.Group(); const cx = -55; const cz = -60;
  facadeBuilding(g, { x0: cx - 29, z0: cz - 39, x1: cx + 29, z1: cz + 39, h: 17, style: 'stone', tint: [0.84, 0.8, 0.72], front: 3 });
  for (const [x, z] of [[-29, -39], [29, -39], [-29, 39], [29, 39]]) { box(g, 11, 24, 11, cx + x * 0.92, 0, cz + z * 0.92, plainMat('#cbbf9f', 0.85)); col({ x: cx + x * 0.92, y: 12, z: cz + z * 0.92, w: 11, h: 24, d: 11 }); }
  // west portico with six columns and the pediment "DEM DEUTSCHEN VOLKE"
  const px = cx - 33; box(g, 9, 3.5, 30, px, 0, cz, sandstone()); for (let k = 0; k < 6; k++) column(g, 0.9, 13, px, 3.5, cz - 12.5 + k * 5, sandstone());
  col({ x: px, y: 8, z: cz, w: 9, h: 16, d: 30 });
  box(g, 6, 2, 30, px + 1, 16.5, cz, sandstone());
  const ped = new THREE.Shape(); ped.moveTo(-15, 0); ped.lineTo(15, 0); ped.lineTo(0, 5); ped.closePath(); const pm = new THREE.Mesh(new THREE.ExtrudeGeometry(ped, { depth: 6, bevelEnabled: false }), sandstone()); pm.rotation.y = Math.PI / 2; pm.position.set(px - 2, 18.5, cz); pm.castShadow = true; g.add(pm);
  textPlane(g, 'DEM DEUTSCHEN VOLKE', 18, 1.6, px - 3.06, 17.5, cz, -Math.PI / 2);
  for (let k = 0; k < 7; k++) box(g, 9, 0.5, 30 - k * 0.1, px + 2 - k * 0.9, k * 0.5 - 0.5, cz, plainMat('#c9bda2', 0.9)); // steps
  // Norman Foster's glass dome with its mirror cone
  const dome = new THREE.Mesh(new THREE.SphereGeometry(12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glassMat()); dome.scale.set(1, 1.15, 1); dome.position.set(cx, 17.6, cz); g.add(dome);
  const ribs = new THREE.Group(); ribs.position.set(cx, 17.6, cz); g.add(ribs); for (let k = 0; k < 24; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(12, 0.08, 4, 32, Math.PI / 2), metalMat('#c7cdd2')); r.rotation.y = (k / 24) * Math.PI * 2; r.rotation.x = 0; r.scale.set(1, 1.15, 1); r.rotateZ(0); ribs.add(r); }
  for (let k = 1; k < 6; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(12 * Math.cos((k / 6) * Math.PI / 2), 0.07, 4, 40), metalMat('#c7cdd2')); ring.rotation.x = Math.PI / 2; ring.position.set(cx, 17.6 + 13.8 * Math.sin((k / 6) * Math.PI / 2), cz); g.add(ring); }
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3, 10, 24, 1, true), metalMat('#e4e8eb')); cone.rotation.x = Math.PI; cone.position.set(cx, 22, cz); g.add(cone);
  return g;
}

function hauptbahnhof() {
  const g = new THREE.Group(); const cx = -165; const cz = -275;
  // glass barrel vault over the east-west platforms
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 110, 32, 1, true, -Math.PI / 2, Math.PI), glassMat()); vault.rotation.z = Math.PI / 2; vault.position.set(cx, 8, cz); g.add(vault);
  for (let k = -5; k <= 5; k++) { const arch = new THREE.Mesh(new THREE.TorusGeometry(18, 0.25, 6, 32, Math.PI), metalMat('#d5dade')); arch.position.set(cx + k * 10, 8, cz); arch.rotation.y = Math.PI / 2; g.add(arch); }
  for (const sd of [-1, 1]) box(g, 110, 8, 1, cx, 0, cz + sd * 18, metalMat('#bfc6cc'));
  col({ x: cx, y: 4, z: cz - 18, w: 110, h: 8, d: 1.2 }); col({ x: cx, y: 4, z: cz + 18, w: 110, h: 8, d: 1.2 });
  // the two office "bridges" crossing the hall north–south
  for (const dx of [-17, 17]) facadeBuilding(g, { x0: cx + dx - 6, z0: cz - 34, x1: cx + dx + 6, z1: cz + 34, h: 40, style: 'glass', tint: [0.82, 0.88, 0.94] });
  box(g, 110, 0.6, 36, cx, 4, cz, plainMat('#9aa1a7', 0.7)); // platform level
  textPlane(g, 'Berlin Hauptbahnhof', 22, 2.4, cx, 31, cz + 34.1, 0, '#ffffff', '#cc0a1e');
  return g;
}

function potsdamerPlatz() {
  const g = new THREE.Group();
  // Kollhoff tower: brick, stepped crown
  facadeBuilding(g, { x0: -50, z0: 232, x1: -22, z1: 266, h: 62, style: 'brick', tint: [0.85, 0.62, 0.5] });
  box(g, 22, 8, 26, -36, 62, 249, brick()); box(g, 14, 6, 16, -36, 70, 249, brick());
  // DB tower: glass
  facadeBuilding(g, { x0: 22, z0: 172, x1: 50, z1: 208, h: 70, style: 'glass', tint: [0.78, 0.85, 0.92] });
  // Sony Center: glass ring with the tent roof
  facadeBuilding(g, { x0: 22, z0: 232, x1: 52, z1: 266, h: 28, style: 'glass', tint: [0.86, 0.9, 0.96] });
  const tent = new THREE.Mesh(new THREE.ConeGeometry(20, 10, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#e8eef2', transparent: true, opacity: 0.6, side: THREE.DoubleSide, roughness: 0.3 })); tent.position.set(37, 36, 249); g.add(tent);
  facadeBuilding(g, { x0: -50, z0: 172, x1: -22, z1: 208, h: 46, style: 'glass', tint: [0.8, 0.86, 0.88] });
  return g;
}

function siegessaeule() {
  const g = new THREE.Group(); const x = -550; const z = 0; const s = plainMat('#a7362f', 0.6); const granite = plainMat('#8c857c', 0.8);
  cyl(g, 30, 30, 0.3, x, 0, z, plainMat('#5f8a3e', 1), 48);
  cyl(g, 9, 9.5, 2, x, 0.2, z, granite, 8); col({ x, y: 5, z, w: 16, h: 10, d: 16 });
  cyl(g, 7.5, 7.5, 5.5, x, 2.2, z, sandstone(), 24); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; column(g, 0.35, 5, x + Math.cos(a) * 8, 2.2, z + Math.sin(a) * 8, sandstone()); }
  cyl(g, 5.5, 6, 3, x, 7.7, z, granite, 16);
  cyl(g, 1.8, 2.1, 30, x, 10.7, z, s, 24); for (let k = 0; k < 3; k++) cyl(g, 2.3, 2.3, 1.4, x, 15 + k * 7.5, z, gold(), 24); // gilded cannon rings
  box(g, 3.2, 1, 3.2, x, 40.7, z, sandstone());
  // "Goldelse"
  const v = new THREE.Group(); v.position.set(x, 41.7, z); g.add(v); const au = gold();
  v.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 14), au), 0, 2.1, 0)); sph(v, 0.45, 0, 4.6, 0, au);
  for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 1.3), au); w.position.set(-0.4, 3.6, sd * 0.8); w.rotation.x = sd * 0.45; v.add(w); }
  return g;
}

function dom() {
  const g = new THREE.Group(); const cx = 495; const cz = -45; const st = plainMat('#b8b0a0', 0.9); const cu = copper();
  facadeBuilding(g, { x0: cx - 32, z0: cz - 22, x1: cx + 32, z1: cz + 22, h: 24, style: 'stone', tint: [0.76, 0.73, 0.68] });
  cyl(g, 13, 14, 10, cx, 24, cz, st, 24); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; column(g, 0.45, 8, cx + Math.cos(a) * 14.4, 24.6, cz + Math.sin(a) * 14.4, st); }
  sph(g, 13, cx, 34, cz, cu, 1, 1.35, 1, true); cyl(g, 1.6, 2, 4, cx, 51, cz, st, 12); sph(g, 1.8, cx, 56, cz, cu, 1, 1.4, 1, true); box(g, 0.2, 3, 0.2, cx, 58, cz, gold()); box(g, 1.4, 0.2, 0.2, cx, 59.8, cz, gold());
  for (const [x, z] of [[-28, -18], [28, -18], [-28, 18], [28, 18]]) { box(g, 9, 32, 9, cx + x, 0, cz + z, st); sph(g, 4.8, cx + x, 32, cz + z, cu, 1, 1.5, 1, true); cyl(g, 0.6, 0.8, 3, cx + x, 38.8, cz + z, st, 8); col({ x: cx + x, y: 16, z: cz + z, w: 9, h: 32, d: 9 }); }
  // west portico facing the Lustgarten
  for (let k = 0; k < 6; k++) column(g, 0.9, 16, cx - 34, 0, cz - 11 + k * 4.4, st); box(g, 4, 3, 26, cx - 34, 16, cz, st);
  return g;
}

function altesMuseum() {
  const g = new THREE.Group(); const cx = 430; const cz = -138;
  facadeBuilding(g, { x0: cx - 38, z0: cz - 16, x1: cx + 38, z1: cz + 10, h: 16, style: 'stone', tint: [0.86, 0.82, 0.74] });
  for (let k = 0; k < 18; k++) column(g, 0.75, 13, cx - 34 + k * 4, 2.2, cz + 14, sandstone());
  box(g, 76, 2.2, 8, cx, 0, cz + 14, sandstone()); box(g, 76, 2.4, 9, cx, 15.2, cz + 14, sandstone());
  for (let k = 0; k < 5; k++) box(g, 40, 0.44, 2, cx, k * 0.44, cz + 19 + k * 0.6 - 0.6, plainMat('#cbbf9f', 0.9));
  col({ x: cx, y: 8, z: cz + 14, w: 76, h: 16, d: 8 });
  return g;
}

function fernsehturm() {
  const g = new THREE.Group(); const x = 605; const z = -165; const conc = plainMat('#c9c6bf', 0.85);
  // base pavilion with its folded roof
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const w = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 9), conc); w.position.set(x + Math.cos(a) * 15, 6.5, z + Math.sin(a) * 15); w.rotation.y = -a; w.rotation.z = 0.35; w.castShadow = true; g.add(w); }
  cyl(g, 21, 21, 6, x, 0, z, glassMat(), 6); col({ x, y: 3, z, w: 30, h: 6, d: 30 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 5.2, 108, 32), conc); shaft.position.set(x, 54, z); shaft.castShadow = true; g.add(shaft); col({ x, y: 54, z, w: 8, h: 108, d: 8 });
  // the sphere: steel panels and a ring of windows
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 256; const gg = sc.getContext('2d')!; gg.fillStyle = '#b9c0c6'; gg.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 14) for (let xx = (y / 14) % 2 ? 0 : 8; xx < 512; xx += 16) { gg.fillStyle = `rgb(${170 + Math.random() * 40},${178 + Math.random() * 40},${186 + Math.random() * 40})`; gg.fillRect(xx, y, 14, 12); }
  gg.fillStyle = '#26323b'; gg.fillRect(0, 128, 512, 26); for (let xx = 0; xx < 512; xx += 16) { gg.fillStyle = '#b9c0c6'; gg.fillRect(xx, 128, 3, 26); }
  const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(9.5, 48, 32), new THREE.MeshStandardMaterial({ map: stex, metalness: 0.75, roughness: 0.28, envMapIntensity: 1.5 })); ball.position.set(x, 114, z); ball.castShadow = true; g.add(ball);
  cyl(g, 2.4, 3.0, 10, x, 122, z, conc, 24);
  for (let k = 0; k < 8; k++) cyl(g, 1.3 - k * 0.11, 1.4 - k * 0.11, 9.4, x, 132 + k * 9.4, z, plainMat(k % 2 ? '#d8402f' : '#f2f2f2', 0.6), 16);
  cyl(g, 0.25, 0.4, 6, x, 207, z, plainMat('#f2f2f2', 0.6), 8);
  return g;
}

function alexanderplatz() {
  const g = new THREE.Group(); const x = 720; const z = -165;
  // Weltzeituhr
  cyl(g, 1.3, 1.6, 0.6, x, 0.15, z, plainMat('#6f7a80', 0.6), 16); cyl(g, 0.35, 0.35, 3, x, 0.75, z, metalMat('#9aa3aa'), 12);
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128; const c = cv.getContext('2d')!; const cities = ['BERLIN', 'MOSKAU', 'TOKIO', 'NEW YORK', 'KAIRO', 'PEKING', 'RIO', 'SYDNEY', 'LONDON', 'DELHI', 'HAVANNA', 'NAIROBI'];
  cities.forEach((n, k) => { c.fillStyle = k % 2 ? '#e8e2d2' : '#f6f1e6'; c.fillRect(k * 85.3, 0, 85.3, 128); c.fillStyle = '#13202b'; c.font = '700 20px Arial'; c.textAlign = 'center'; c.fillText(n, k * 85.3 + 42, 70); });
  const ct = new THREE.CanvasTexture(cv); ct.colorSpace = THREE.SRGBColorSpace;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 1.2, 24, 1, true), new THREE.MeshStandardMaterial({ map: ct, side: THREE.DoubleSide, roughness: 0.6 })); drum.position.set(x, 4.4, z); g.add(drum);
  cyl(g, 2.5, 2.5, 0.15, x, 5, z, metalMat('#aab4ba'), 24); cyl(g, 2.5, 2.5, 0.15, x, 3.7, z, metalMat('#aab4ba'), 24);
  const atom = new THREE.Group(); atom.position.set(x, 7.6, z); atom.name = 'atom'; g.add(atom);
  for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 6, 40), metalMat('#c6ccd0')); r.rotation.set(k * 1.05, k * 0.6, 0); atom.add(r); const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), plainMat('#2459c4', 0.3, 0.6)); b.position.set(Math.cos(k * 2.1) * 1.6, Math.sin(k * 2.1) * 1.6 * Math.cos(k * 1.05), 0); atom.add(b); }
  cyl(g, 0.08, 0.08, 2.2, x, 5.2, z, metalMat('#9aa3aa'), 6); col({ x, y: 2.5, z, w: 3.4, h: 5, d: 3.4 });
  // Park Inn hotel tower and the department store
  facadeBuilding(g, { x0: 780, z0: -212, x1: 818, z1: -188, h: 68, style: 'platte', tint: [0.92, 0.92, 0.9] });
  textPlane(g, 'park inn', 14, 2.2, 799, 66, -187.9, 0, '#13202b', '#ffffff');
  facadeBuilding(g, { x0: 780, z0: -150, x1: 818, z1: -120, h: 22, style: 'glass', tint: [0.9, 0.9, 0.85] });
  textPlane(g, 'GALERIA', 12, 2, 777.9, 18, -135, -Math.PI / 2, '#c8102e', '#ffffff');
  return g;
}

function checkpoint() {
  const g = new THREE.Group(); const x = 220; const z = 290;
  box(g, 2.4, 2.6, 2.6, x, 0, z, plainMat('#f2f2ee', 0.7)); box(g, 2.8, 0.25, 3, x, 2.6, z, plainMat('#f2f2ee', 0.7));
  textPlane(g, 'U.S. ARMY CHECKPOINT', 2.4, 0.5, x, 2.3, z + 1.31, 0, '#ffffff', '#13202b');
  for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.5, 4, 8), plainMat('#b8a77e', 1)); b.rotation.z = Math.PI / 2; b.position.set(x - 1 + (k % 3) * 0.8, 0.3 + Math.floor(k / 3) * 0.42, z - 2.1); g.add(b); }
  col({ x, y: 1.3, z, w: 2.4, h: 2.6, d: 2.6 });
  // the famous sign, on the pavement
  const sx = x + 9; cyl(g, 0.1, 0.1, 4.5, sx, 0.15, z, metalMat('#5a5f63'), 8); const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 340; const gg = c.getContext('2d')!; gg.fillStyle = '#f4f1e6'; gg.fillRect(0, 0, 512, 340); gg.fillStyle = '#13202b'; gg.textAlign = 'center'; gg.font = '700 30px Arial'; ['YOU ARE LEAVING', 'THE AMERICAN SECTOR', 'ВЫ ВЫЕЗЖАЕТЕ ИЗ', 'AMEРИКАНСКОГО СЕКТОРА', 'VOUS SORTEZ DU SECTEUR AMÉRICAIN', 'SIE VERLASSEN DEN AMERIKANISCHEN SEKTOR'].forEach((l, i) => { gg.font = `700 ${i > 3 ? 20 : 30}px Arial`; gg.fillText(l, 256, 46 + i * 52); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), side: THREE.DoubleSide }));
  sign.position.set(sx, 4.6, z); sign.rotation.y = Math.PI / 2; g.add(sign); col({ x: sx, y: 2, z, w: 0.3, h: 4, d: 0.3 });
  return g;
}

function oberbaum() {
  const g = new THREE.Group(); const x = 1430; const z = spreeZ(x); const L = SPREE_W + 14; const br = brick();
  // brick arches under the deck, crenellated towers, the U-Bahn arcade on the upper deck
  for (const sd of [-1, 1]) {
    box(g, 0.8, 2.6, L, x + sd * 12.5, -1.5, z, br);
    for (let k = 0; k < 7; k++) { const a = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.5, 6, 16, Math.PI), br); a.position.set(x + sd * 12.6, -1.4, z - L / 2 + 4 + k * ((L - 8) / 6)); a.rotation.y = Math.PI / 2; g.add(a); }
  }
  const ax = x + 8; for (let k = 0; k < 12; k++) { const zz = z - L / 2 + 2 + k * ((L - 4) / 11); box(g, 1, 6.5, 1, ax - 3, 0, zz, br); box(g, 1, 6.5, 1, ax + 3, 0, zz, br); col({ x: ax - 3, y: 3.25, z: zz, w: 1, h: 6.5, d: 1 }); col({ x: ax + 3, y: 3.25, z: zz, w: 1, h: 6.5, d: 1 }); }
  box(g, 8, 1.4, L, ax, 6.5, z, br); for (let k = 0; k < 11; k++) { const zz = z - L / 2 + 4 + k * ((L - 8) / 10); const a = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.35, 6, 14, Math.PI), br); a.position.set(ax - 3.4, 4.3, zz); a.rotation.y = Math.PI / 2; g.add(a); }
  for (const sd of [-1, 1]) { const tz = z + sd * 3.5; box(g, 6, 22, 6, x + 13, -1.5, tz, br); for (let k = 0; k < 4; k++) box(g, 1.2, 1.4, 1.2, x + 10.6 + (k % 2) * 4.8, 20.5, tz - 2.4 + Math.floor(k / 2) * 4.8, br); sph(g, 1.2, x + 13, 22, tz, copper(), 1, 2, 1); col({ x: x + 13, y: 10, z: tz, w: 6, h: 22, d: 6 }); }
  // a yellow U-Bahn train on the upper deck
  const u = new THREE.Group(); u.name = 'ubahn'; g.add(u); u.position.set(ax, 7.9, z);
  for (let k = 0; k < 2; k++) { box(u, 2.6, 2.9, 12.5, 0, 0, -7 + k * 13, plainMat('#f2c400', 0.4, 0.2)); box(u, 2.66, 0.9, 12.3, 0, 1.4, -7 + k * 13, plainMat('#20262b', 0.2, 0.5)); }
  return g;
}

function eastSideGallery() {
  const g = new THREE.Group(); let k = 0; let mural = 0;
  const off = -(SPREE_W / 2 + 7); const segs: { x: number; z: number; ry: number }[] = [];
  for (let x = 1290; x < 1462; x += 1.25) { const z = spreeZ(x); const z2 = spreeZ(x + 1); const ang = Math.atan2(z2 - z, 1); const nx = -Math.sin(ang); const nz = Math.cos(ang); segs.push({ x: x + nx * off, z: z + nz * off, ry: -ang }); }
  for (let s = 0; s < segs.length; s += 10) {
    const tex = muralTex(mural++); const mmat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }); const n = Math.min(10, segs.length - s);
    for (let j = 0; j < n; j++) {
      const p = segs[s + j]; const geo = new THREE.BoxGeometry(1.24, 3.6, 0.22); const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (j + uv.getX(i)) / 10); // the painting runs across ten segments
      const m = new THREE.Mesh(geo, mmat); m.position.set(p.x, 1.95, p.z); m.rotation.y = p.ry; m.castShadow = true; m.receiveShadow = true; g.add(m);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.24, 8), plainMat('#cfc9bd', 0.9)); cap.rotation.z = Math.PI / 2; cap.rotation.y = p.ry; cap.position.set(p.x, 3.75, p.z); g.add(cap);
      col({ x: p.x, y: 1.9, z: p.z, w: 1.25, h: 3.8, d: 0.3, ry: p.ry }); k++;
    }
  }
  return g;
}

function gedaechtniskirche() {
  const g = new THREE.Group(); const x = -935; const z = 385; const dark = plainMat('#8a7f70', 0.95);
  box(g, 12, 40, 12, x, 0, z, dark); col({ x, y: 20, z, w: 12, h: 40, d: 12 });
  for (let k = 0; k < 7; k++) box(g, 1.6 + (k % 3), 3 + ((k * 5) % 7), 1.6, x - 5 + k * 1.7, 40, z + ((k * 3) % 5) - 2, dark); // the broken top
  box(g, 6, 9, 0.6, x, 26, z + 6.05, plainMat('#3a3330', 0.95));
  const blue = new THREE.MeshStandardMaterial({ color: '#2a4fa8', emissive: new THREE.Color('#1a3fb8'), emissiveIntensity: 0.25, roughness: 0.3 });
  cyl(g, 10, 10, 20, x + 26, 0, z, blue, 8); cyl(g, 10.5, 10.5, 0.8, x + 26, 20, z, plainMat('#5a5f63', 0.6), 8); col({ x: x + 26, y: 10, z, w: 20, h: 20, d: 20 });
  cyl(g, 4.5, 4.5, 50, x - 24, 0, z, blue, 6); col({ x: x - 24, y: 25, z, w: 9, h: 50, d: 9 });
  return g;
}

function hermannplatz() {
  const g = new THREE.Group();
  facadeBuilding(g, { x0: 1005, z0: 1005, x1: 1088, z1: 1075, h: 30, style: 'stone', tint: [0.82, 0.78, 0.7], front: 0 });
  for (const x of [1012, 1081]) { box(g, 10, 20, 10, x, 30, 1010, plainMat('#cfc6b4', 0.85)); }
  textPlane(g, 'KAUFHAUS', 22, 3, 1046.5, 24, 1004.9, Math.PI, '#13202b', '#f2c400');
  return g;
}

export function Landmarks() {
  const groups = useMemo(() => timed('landmarks', () => [brandenburgGate(), reichstag(), hauptbahnhof(), potsdamerPlatz(), siegessaeule(), dom(), altesMuseum(), fernsehturm(), alexanderplatz(), checkpoint(), oberbaum(), eastSideGallery(), gedaechtniskirche(), hermannplatz()].map((g) => mergeByMaterial(g, ['atom', 'ubahn']))), []);
  const t = useRef(0);
  useFrame((st, dt) => {
    const atom = groups[8].getObjectByName('atom'); if (atom) atom.rotation.y += dt * 0.4;
    const u = groups[10].getObjectByName('ubahn'); if (u) { t.current += dt; const L = SPREE_W + 10; u.position.z = spreeZ(1430) - L / 2 - 30 + ((t.current * 9) % (L + 60)); }
  });
  return <>{groups.map((g, k) => <primitive key={k} object={g} />)}</>;
}
// keep the helpers referenced
void distToPolyline; void SPREE; void mergeGeos;
