import * as THREE from 'three';
import type { CarType } from './VehicleModels';

/**
 * Mutable per-frame game state shared by the systems. It lives outside React so that
 * 60 updates per second never cause a re-render; the HUD reads a few values from the store.
 */
export interface Interactable {
  id: string;
  label: string;
  key: 'E';
  pos: THREE.Vector3;
  radius: number;
  run: () => void;
}

export interface CarState {
  id: number;
  pos: THREE.Vector3;
  heading: number;
  speed: number;
  steer: number;
  color: string;
  kind: 'ai' | 'parked' | 'player';
  type: CarType;
  spot?: number;
  group?: THREE.Group;
  body?: any;
  col?: any;
  vy?: number;
  /** AI route */
  ai?: { a: [number, number]; b: [number, number]; s: number; turn: null | { p0: THREE.Vector3; c: THREE.Vector3; p2: THREE.Vector3; t: number; len: number; next: [number, number] }; vmax: number };
  lights: boolean;
}

export const RT = {
  input: { keys: new Set<string>(), pressed: new Set<string>(), mouseDX: 0, mouseDY: 0, wheel: 0, locked: false },
  cam: { yaw: Math.PI, pitch: 0.28, dist: 5.2, targetDist: 5.2 },
  player: {
    pos: new THREE.Vector3(30, 1, 6),
    heading: Math.PI / 2,
    vy: 0,
    grounded: true,
    speed: 0,
    mode: 'walk' as 'walk' | 'drive' | 'ride',
    action: null as null | { kind: 'drink' | 'wave' | 'sit'; t: number; len: number },
  },
  car: null as CarState | null,
  cars: [] as CarState[],
  interact: null as Interactable | null,
  interactables: [] as Interactable[],
  teleport: null as null | { x: number; y: number; z: number; heading: number },
  hour: 9.5,
  weather: 'clear' as 'clear' | 'cloudy' | 'rain',
  wet: 0,
  night: 0,
  sunDir: new THREE.Vector3(0.4, 0.8, 0.3),
  /** set to true by the HUD when the game should not take input (menus) */
  frozen: true,
  camObj: null as THREE.Camera | null,
  staticBody: null as any,
  playerCollider: null as any,
  station: 0,
  outside: null as null | { x: number; z: number; heading: number },
  carColliders: new Set<number>(),
  world: null as any,
  rapier: null as any,
  peds: [] as { x: number; z: number; vx: number; vz: number }[],
};

export function consumePressed(code: string): boolean {
  if (RT.input.pressed.has(code)) { RT.input.pressed.delete(code); return true; }
  return false;
}

// handy in development: inspect the live game state from the console
if (import.meta.env.DEV || /[?&]debug/.test(location.search)) (window as any).__RT = RT;
