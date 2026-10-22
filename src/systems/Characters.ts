import * as THREE from 'three';
import { humanKit, randLook, seeded, LOOK0 } from './Human';

/** One shared kit (materials and geometries are cached inside it). */
export const HK = humanKit(THREE) as { build: (look: any) => THREE.Group; pose: (m: THREE.Group, st: any, dt: number) => void; M: any; lin: any; mergeStatic: any };
export { randLook, seeded, LOOK0 };

export interface PoseState { mode: string; ph?: number; vy?: number; t?: number; talking?: boolean; look?: { x: number; y: number } }

export function playerLook(seed: number, sex: 'm' | 'f') {
  const r = seeded(seed * 7919 + 13);
  return { ...randLook(r, sex), hat: 'none', glasses: 'none', bag: 1, bagC: '#13202b', top: sex === 'f' ? 'jacket' : 'jacket', topC: '#2d4a6b', top2: '#f4f6f8', bottom: 'jeans', botC: '#22303e', shoes: 'sneaker', shoeC: '#f4f6f8', h: sex === 'f' ? 1 : 1.02 };
}
