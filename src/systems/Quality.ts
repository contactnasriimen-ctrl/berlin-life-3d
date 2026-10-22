import type { Quality } from '../store';

export interface QualityPreset {
  dpr: number; shadows: boolean; shadowSize: number; shadowBox: number; draw: number; trees: number; treeMax: number; npcFull: number; walkers: number; cars: number; parked: number; bikes: number; fx: 'none' | 'bloom' | 'full'; balconies: boolean;
}
// counts were measured: a parked or moving car costs ~6 draw calls, a full 3D person ~25
export const QUALITY: Record<Quality, QualityPreset> = {
  low: { dpr: 0.85, shadows: false, shadowSize: 1024, shadowBox: 35, draw: 380, trees: 0.35, treeMax: 700, npcFull: 3, walkers: 22, cars: 10, parked: 10, bikes: 2, fx: 'none', balconies: false },
  medium: { dpr: 1, shadows: true, shadowSize: 1024, shadowBox: 40, draw: 560, trees: 0.6, treeMax: 1300, npcFull: 6, walkers: 40, cars: 18, parked: 18, bikes: 4, fx: 'none', balconies: true },
  high: { dpr: 1.25, shadows: true, shadowSize: 2048, shadowBox: 55, draw: 820, trees: 0.85, treeMax: 2000, npcFull: 12, walkers: 70, cars: 30, parked: 28, bikes: 6, fx: 'bloom', balconies: true },
  ultra: { dpr: 1.75, shadows: true, shadowSize: 4096, shadowBox: 70, draw: 1200, trees: 1, treeMax: 2600, npcFull: 20, walkers: 100, cars: 44, parked: 34, bikes: 10, fx: 'full', balconies: true },
};
export const QUALITY_ORDER: Quality[] = ['low', 'medium', 'high', 'ultra'];
