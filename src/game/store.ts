import { create } from 'zustand';
import type { WeaponId } from '../weapons/config';
import type { Debris, Effect } from '../data/types';
export const BEST_KEY = 'hnubs-smash:best:v1';
export function loadBest(): number {
  try { const n = Number(localStorage.getItem(BEST_KEY)); return Number.isSafeInteger(n) && n > 0 ? n : 0; } catch { return 0; }
}
interface State {
  weapon: WeaponId; score: number; best: number; destroyed: Record<string, true>; round: number;
  effects: Effect[]; debris: Debris[]; sound: boolean; quality: 'low' | 'high'; walls: boolean; ceiling: boolean;
  cameraRequest: number; cameraMode: 'home' | 'top' | 'photo' | 'technical' | 'announcer'; hovered: string; hint: string; ready: boolean;
  select: (weapon: WeaponId) => void; destroy: (id: string, points: number) => boolean;
  reset: () => void; addEffect: (effect: Effect) => void; addDebris: (parts: Debris[]) => void;
}
export const useGame = create<State>((set, get) => ({
  weapon: 'bat', score: 0, best: loadBest(), destroyed: {}, round: 0, effects: [], debris: [], sound: false,
  // 휴대폰·태블릿(터치 위주 기기)은 가벼운 그래픽으로 시작한다.
  quality: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 'low' : 'high',
  walls: true, ceiling: false, cameraRequest: 0, cameraMode: 'home', hovered: '', hint: '', ready: false,
  select: (weapon) => set({ weapon }),
  destroy: (id, points) => {
    if (get().destroyed[id]) return false;
    const score = get().score + points;
    const best = Math.max(score, get().best);
    try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* 브라우저 저장 차단 시 현재 세션 점수는 유지한다. */ }
    set({ score, best, destroyed: { ...get().destroyed, [id]: true } }); return true;
  },
  reset: () => set(s => ({ score: 0, destroyed: {}, debris: [], effects: [], round: s.round + 1, hovered: '', hint: '방송국을 원래 모습으로 복구했습니다.' })),
  addEffect: effect => set(s => ({ effects: [...s.effects.slice(-23), effect] })),
  addDebris: parts => set(s => ({ debris: [...s.debris, ...parts].slice(-(s.quality === 'high' ? 240 : 100)) })),
}));
