export type Quality = 'low' | 'medium' | 'high';
export type GraphicsMode = 'auto' | Quality;
export const GRAPHICS_KEY = 'hnubs-smash:graphics:v1';
export const QUALITY_LABELS = { low: '저사양', medium: '균형', high: '고화질' };
export const GRAPHICS = {
  low: { dpr: [.5, 1] as [number, number], pixels: 650000, shadow: 512, roundedSegments: 1, cylinderSegments: 10, debris: 80, effects: 8, fragments: 24, chips: 8, dust: 4, lifetime: 5000, reflection: 0 },
  medium: { dpr: [.65, 1.25] as [number, number], pixels: 1300000, shadow: 1024, roundedSegments: 2, cylinderSegments: 16, debris: 180, effects: 14, fragments: 38, chips: 18, dust: 9, lifetime: 8000, reflection: 256 },
  high: { dpr: [1, 2] as [number, number], pixels: 2400000, shadow: 2048, roundedSegments: 3, cylinderSegments: 24, debris: 340, effects: 24, fragments: 56, chips: 34, dust: 16, lifetime: 11000, reflection: 1024 },
};
export function initialQuality(coarse = false, cores = 4, memory = 4): Quality {
  return coarse || cores <= 2 || memory <= 2 ? 'low' : 'medium';
}
export function deviceQuality(): Quality {
  const nav = typeof navigator === 'undefined' ? undefined : navigator as Navigator & { deviceMemory?: number };
  return initialQuality(typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches, nav?.hardwareConcurrency ?? 4, nav?.deviceMemory ?? 4);
}
export function loadGraphicsMode(): GraphicsMode {
  try { const mode = localStorage.getItem(GRAPHICS_KEY); if (mode === 'auto' || mode === 'low' || mode === 'medium' || mode === 'high') return mode; } catch { /* 저장 차단 시 자동 품질로 시작한다. */ }
  return 'auto';
}
export function renderDpr(quality: Quality, width: number, height: number, deviceDpr = 1) {
  const settings = GRAPHICS[quality];
  return Math.max(.25, Math.min(deviceDpr, settings.dpr[1], Math.sqrt(settings.pixels / Math.max(1, width * height))));
}
export function advanceQuality(quality: Quality, fps: number, history: { slow: number; fast: number }) {
  const slow = fps < (quality === 'high' ? 48 : 35) ? history.slow + 1 : 0;
  const fast = fps > 57 ? history.fast + 1 : 0;
  const next: Quality = slow >= 2 ? quality === 'high' ? 'medium' : 'low' : fast >= 4 ? quality === 'low' ? 'medium' : 'high' : quality;
  return { quality: next, slow: next === quality ? slow : 0, fast: next === quality ? fast : 0 };
}
