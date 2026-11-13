import { GRAPHICS, GRAPHICS_KEY, deviceQuality, loadGraphicsMode, type Quality, type GraphicsMode } from '../scene/graphics';
import { create } from 'zustand';
import type { MeteorStrike } from '../data/meteor';
import type { WeaponId } from '../weapons/config';
import type { Debris, Effect } from '../data/types';
export const BEST_KEY = 'hnubs-smash:best:v1';
export function loadBest(): number {
  try { const n = Number(localStorage.getItem(BEST_KEY)); return Number.isSafeInteger(n) && n > 0 ? n : 0; } catch { return 0; }
}
interface State {
  meteor: MeteorStrike | null;
  weapon: WeaponId; score: number; best: number; destroyed: Record<string, true>; round: number;
  effects: Effect[]; debris: Debris[]; sound: boolean; quality: Quality; graphicsMode: GraphicsMode; walls: boolean; ceiling: boolean;
  cameraRequest: number; cameraMode: 'home' | 'top' | 'photo' | 'technical' | 'announcer' | 'character'; hovered: string; hint: string; ready: boolean;
  setQuality: (quality: Quality) => void; selectGraphics: (mode: GraphicsMode) => void;
  select: (weapon: WeaponId) => void; destroy: (id: string, points: number) => boolean;
  reset: () => void; addEffect: (effect: Effect) => void; addDebris: (parts: Debris[]) => void;
}
const graphicsMode = loadGraphicsMode();
export const useGame = create<State>((set, get) => ({
  meteor: null, weapon: 'bat', score: 0, best: loadBest(), destroyed: {}, round: 0, effects: [], debris: [], sound: true,
  graphicsMode, quality: graphicsMode === 'auto' ? deviceQuality() : graphicsMode,
  setQuality: quality => set(s => ({ quality, debris: s.debris.slice(-GRAPHICS[quality].debris), effects: s.effects.slice(-GRAPHICS[quality].effects) })),
  selectGraphics: mode => {
    try { localStorage.setItem(GRAPHICS_KEY, mode); } catch { /* 현재 세션에는 적용한다. */ }
    set({ graphicsMode: mode }); get().setQuality(mode === 'auto' ? deviceQuality() : mode);
  },
  walls: true, ceiling: false, cameraRequest: 0, cameraMode: 'home', hovered: '', hint: '', ready: false,
  select: (weapon) => set({ weapon }),
  destroy: (id, points) => {
    if (get().destroyed[id]) return false;
    const score = get().score + points;
    const best = Math.max(score, get().best);
    try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* 브라우저 저장 차단 시 현재 세션 점수는 유지한다. */ }
    set({ score, best, destroyed: { ...get().destroyed, [id]: true } }); return true;
  },
  reset: () => set(s => ({ meteor: null, score: 0, destroyed: {}, debris: [], effects: [], round: s.round + 1, hovered: '', hint: '방송국을 원래 모습으로 복구했습니다.' })),
  addEffect: effect => set(s => ({ effects: [...s.effects.slice(-(GRAPHICS[s.quality].effects - 1)), effect] })),
  addDebris: parts => set(s => ({ debris: [...s.debris, ...parts].slice(-(GRAPHICS[s.quality].debris)) })),
}));
