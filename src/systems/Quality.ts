import type { Quality } from '../store';

export interface QualityPreset {
  dpr: number; shadows: boolean; shadowSize: number; shadowBox: number; draw: number; trees: number; npcFull: number; walkers: number; cars: number; bikes: number; fx: 'none' | 'bloom' | 'full'; balconies: boolean;
}
export const QUALITY: Record<Quality, QualityPreset> = {
  low: { dpr: 1, shadows: false, shadowSize: 1024, shadowBox: 40, draw: 420, trees: 0.4, npcFull: 6, walkers: 30, cars: 16, bikes: 3, fx: 'none', balconies: false },
  medium: { dpr: 1.25, shadows: true, shadowSize: 1024, shadowBox: 45, draw: 650, trees: 0.7, npcFull: 12, walkers: 55, cars: 26, bikes: 5, fx: 'bloom', balconies: true },
  high: { dpr: 1.5, shadows: true, shadowSize: 2048, shadowBox: 60, draw: 950, trees: 1, npcFull: 18, walkers: 85, cars: 38, bikes: 8, fx: 'full', balconies: true },
  ultra: { dpr: 2, shadows: true, shadowSize: 4096, shadowBox: 70, draw: 1400, trees: 1, npcFull: 26, walkers: 115, cars: 50, bikes: 12, fx: 'full', balconies: true },
};
