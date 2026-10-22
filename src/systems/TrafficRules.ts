/** Traffic lights: a 26 s cycle per crossing (a "green wave" offset along the streets). */
export const CYCLE = 26;
export type Light = 'green' | 'yellow' | 'red';
export function signalState(i: number, j: number, horiz: boolean, t: number): Light {
  const c = (((t + (i * 3 + j * 5) * 1.3) % CYCLE) + CYCLE) % CYCLE;
  // 0–10 east-west green, 10–12 yellow, 12–13 all red, 13–23 north-south green, 23–25 yellow, 25–26 all red
  if (horiz) return c < 10 ? 'green' : c < 12 ? 'yellow' : 'red';
  return c >= 13 && c < 23 ? 'green' : c >= 23 && c < 25 ? 'yellow' : 'red';
}
