import * as THREE from 'three';
import type { Weather } from '../store';

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Sun path for Berlin (52.5° N): rises in the east, highest in the south at noon, sets in the west. */
export function skyState(hour: number, weather: Weather) {
  const p = (hour - 6) / 12; // 0 = sunrise, 1 = sunset
  const elev = Math.sin(p * Math.PI) * THREE.MathUtils.degToRad(56) - THREE.MathUtils.degToRad(3);
  const az = THREE.MathUtils.degToRad(80 + p * 200); // azimuth from north, clockwise
  const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), -Math.cos(az) * Math.cos(elev)).normalize();
  const day = smooth(-0.08, 0.18, sunDir.y);
  const golden = day * (1 - smooth(0.12, 0.45, sunDir.y));
  const cloud = weather === 'clear' ? 0 : weather === 'cloudy' ? 0.65 : 0.9;
  const sunColor = new THREE.Color('#ffffff').lerp(new THREE.Color('#ff9b4e'), golden * 0.9);
  const moonDir = new THREE.Vector3(-sunDir.x, Math.max(0.35, -sunDir.y), -sunDir.z).normalize();
  const night = 1 - day;
  const fogDay = new THREE.Color('#bcd3e2').lerp(new THREE.Color('#f2b98d'), golden * 0.8).lerp(new THREE.Color('#9aa3ab'), cloud);
  const fogColor = fogDay.lerp(new THREE.Color('#0b1222'), night * 0.92);
  return {
    sunDir, moonDir, day, night, golden, cloud,
    sunColor,
    sunIntensity: day * (3.1 - cloud * 2.3),
    moonIntensity: night * 0.35 * (1 - cloud * 0.6),
    hemiIntensity: 0.25 + day * (0.5 + cloud * 0.35),
    fogColor,
    fogNear: weather === 'rain' ? 80 : weather === 'cloudy' ? 200 : 320,
    exposure: 0.95 + night * 0.35 - cloud * 0.05,
    turbidity: 3 + cloud * 14,
    rayleigh: 0.9 + golden * 1.4 - cloud * 0.5,
    lampsOn: smooth(0.14, -0.02, sunDir.y),
  };
}
export type SkyState = ReturnType<typeof skyState>;

export function fmtHour(h: number) { const hh = Math.floor(h) % 24; const mm = Math.floor((h % 1) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; }
