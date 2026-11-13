import meteor from '../weapons/meteor';
import type { V3 } from './types';
export interface MeteorStrike { id: number; point: V3; born: number; impacted: boolean }
export function meteorProgress(strike: MeteorStrike, now: number) { return Math.max(0, Math.min(1, (now - strike.born) / (meteor.flight * 1000))); }
export function meteorPosition(point: V3, progress: number): V3 {
  const remaining = 1 - Math.max(0, Math.min(1, progress)) ** 2.2;
  return [point[0] - remaining * 5, point[1] + remaining * 18, point[2] - remaining * 3];
}
