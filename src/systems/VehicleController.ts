import { CAR_DIM } from './VehicleModels';
import type { CarState } from './runtime';
import { syncCar } from '../components/Vehicle';

export interface DriveInput { up: boolean; down: boolean; left: boolean; right: boolean; brake: boolean }

/**
 * Arcade car physics with real collisions: bicycle steering model, engine force that falls with speed,
 * brakes, reverse, rolling resistance and a handbrake. The Rapier character controller moves the car's
 * box collider and stops it at walls, other cars and kerbs.
 */
export function driveStep(c: CarState, inp: DriveInput, dt: number, ctrl: any) {
  const D = CAR_DIM[c.type]; const maxF = D.maxV; const maxR = -7; const accel = c.type === 'bus' ? 2.2 : 6.5; const brake = 13;
  let v = c.speed;
  if (inp.up) v += accel * dt * Math.max(0.05, 1 - v / maxF) * (v < 0 ? 3 : 1);
  if (inp.down) v -= (v > 0.3 ? brake : 3.5) * dt;
  if (!inp.up && !inp.down) { const roll = (0.6 + 0.012 * v * v) * dt; v = Math.abs(v) < roll ? 0 : v - Math.sign(v) * roll; }
  if (inp.brake) v *= 1 - Math.min(1, 3 * dt);
  v = Math.max(maxR, Math.min(maxF, v));
  const steerMax = 0.55 * (1 - Math.min(0.68, Math.abs(v) / 42)); const want = ((inp.left ? 1 : 0) - (inp.right ? 1 : 0)) * steerMax;
  c.steer += (want - c.steer) * Math.min(1, dt * 6);
  const wheelbase = D.l * 0.62; const slip = inp.brake && Math.abs(v) > 8 ? 1.6 : 1;
  c.heading += (v / wheelbase) * Math.tan(c.steer) * dt * slip;
  c.vy = (c.vy || 0) - 20 * dt;
  const move = { x: Math.sin(c.heading) * v * dt, y: c.vy * dt, z: Math.cos(c.heading) * v * dt };
  syncCar(c); // the collider must have the new heading before we test the movement
  ctrl.computeColliderMovement(c.col, move, undefined, undefined, (col: any) => col !== c.col);
  const m = ctrl.computedMovement();
  if (ctrl.computedGrounded() && c.vy < 0) c.vy = 0;
  const want2 = Math.hypot(move.x, move.z); const got = Math.hypot(m.x, m.z);
  if (want2 > 0.02 && got < want2 * 0.4 && Math.abs(v) > 3) v *= -0.25; // crash: bounce back
  else if (want2 > 0.02) v *= 0.3 + 0.7 * Math.min(1, got / want2); // scraping along a wall slows you down
  c.pos.set(c.pos.x + m.x, Math.max(0, c.pos.y + m.y), c.pos.z + m.z);
  c.speed = v; syncCar(c);
}
