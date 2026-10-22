import * as THREE from 'three';

/**
 * Bakes all static meshes of a group that share a material into one mesh (one draw call per material).
 * Skipped: objects with a name in `keep` (animated parts), people (userData.u), lights, instanced meshes,
 * meshes with several materials.
 */
export function mergeByMaterial<T extends THREE.Object3D>(root: T, keep: string[] = []): T {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const by = new Map<THREE.Material, { geo: THREE.BufferGeometry; m: THREE.Matrix4; cast: boolean; recv: boolean; mesh: THREE.Mesh }[]>();
  const walk = (o: THREE.Object3D) => {
    if (o !== root && (keep.includes(o.name) || (o.userData && o.userData.u))) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && !(m as any).isInstancedMesh && !Array.isArray(m.material) && m.geometry.index !== undefined) {
      const k = m.material as THREE.Material; if (!by.has(k)) by.set(k, []);
      by.get(k)!.push({ geo: m.geometry, m: new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld), cast: m.castShadow, recv: m.receiveShadow, mesh: m });
    }
    for (const c of [...o.children]) walk(c);
  };
  walk(root);
  for (const [mat, list] of by) {
    if (list.length < 2) continue;
    const geo = bake(list.map((l) => ({ geo: l.geo, m: l.m }))); if (!geo) continue;
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = list.some((l) => l.cast); mesh.receiveShadow = list.some((l) => l.recv);
    root.add(mesh); for (const l of list) l.mesh.parent?.remove(l.mesh);
  }
  return root;
}

function bake(items: { geo: THREE.BufferGeometry; m: THREE.Matrix4 }[]) {
  let nv = 0; let ni = 0;
  for (const { geo } of items) { const n = geo.attributes.position.count; nv += n; ni += geo.index ? geo.index.count : n; }
  const pos = new Float32Array(nv * 3); const nor = new Float32Array(nv * 3); const uv = new Float32Array(nv * 2); const idx = new Uint32Array(ni);
  const v = new THREE.Vector3(); const nm = new THREE.Matrix3(); let vo = 0; let io = 0; let hasColor = items.every(({ geo }) => !!geo.attributes.color); const col = hasColor ? new Float32Array(nv * 3) : null;
  for (const { geo, m } of items) {
    nm.getNormalMatrix(m); const P = geo.attributes.position; const N = geo.attributes.normal; const U = geo.attributes.uv; const C = geo.attributes.color;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos.set([v.x, v.y, v.z], (vo + i) * 3);
      if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3); }
      if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
      if (col && C) col.set([C.getX(i), C.getY(i), C.getZ(i)], (vo + i) * 3);
    }
    if (geo.index) { const I = geo.index; for (let k = 0; k < I.count; k++) idx[io + k] = I.getX(k) + vo; io += I.count; } else { for (let k = 0; k < P.count; k++) idx[io + k] = vo + k; io += P.count; }
    vo += P.count;
  }
  hasColor = !!col;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (hasColor) g.setAttribute('color', new THREE.BufferAttribute(col!, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere(); return g;
}
