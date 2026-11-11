import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

export type StudioTextureKind = 'tile' | 'acoustic' | 'carpet' | 'ceiling';
// 한 장 = 실제 크기(미터). repeat 계산에 쓴다.
export const TEXTURE_SIZE: Record<StudioTextureKind, [number, number]> = { tile: [.6, .6], acoustic: [.75, .6], carpet: [1, 1], ceiling: [.6, .6] };

const cache = new Map<string, CanvasTexture>();
function draw(kind: StudioTextureKind) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d')!;
  let seed = 42; const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
  if (kind === 'tile') {
    // 사진의 이중바닥: 흰 바탕에 회색·검정 점무늬, 검은 줄눈.
    ctx.fillStyle = '#dcdcd6'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 26000; i++) { ctx.fillStyle = ['#7d8282', '#a3a7a3', '#5b6062', '#c3c5bf'][i % 4]; const s = 1 + random() * (i % 4 === 2 ? 4 : 3); ctx.fillRect(random() * 512, random() * 512, s, s * (.5 + random())); }
    ctx.strokeStyle = '#2f3436'; ctx.lineWidth = 5; ctx.strokeRect(0, 0, 512, 512);
  } else if (kind === 'acoustic') {
    // 파란 회색 흡음 패브릭 + 흰 줄눈 테두리.
    ctx.fillStyle = '#8697aa'; ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < 512; x += 6) {
      ctx.fillStyle = random() > .5 ? '#7a8b9f' : '#91a2b4'; ctx.fillRect(x, y, 4, 3);
    }
    for (let i = 0; i < 4000; i++) { ctx.fillStyle = random() > .5 ? 'rgba(60,72,88,.25)' : 'rgba(200,210,222,.18)'; ctx.fillRect(random() * 512, random() * 512, 2, 1); }
    ctx.strokeStyle = '#e7ecef'; ctx.lineWidth = 7; ctx.strokeRect(0, 0, 512, 512);
  } else if (kind === 'carpet') {
    ctx.fillStyle = '#596064'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 60000; i++) { ctx.fillStyle = ['#4a5054', '#686f73', '#525a5e', '#757b7e'][i % 4]; ctx.fillRect(random() * 512, random() * 512, 1.5, 1.5); }
  } else {
    // 흰 천장 텍스: 잔구멍과 얇은 T바.
    ctx.fillStyle = '#e5e4dc'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) { ctx.fillStyle = random() > .3 ? '#b9b8af' : '#cfcec6'; ctx.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random()); }
    ctx.strokeStyle = '#c4c4bc'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, 512, 512);
  }
  return c;
}
/** width×height(미터) 면에 실제 크기 패턴이 반복되도록 텍스처를 돌려준다. */
export function studioTexture(kind: StudioTextureKind, width = 1, height = 1) {
  const key = `${kind}:${width.toFixed(3)}:${height.toFixed(3)}`;
  if (!cache.has(key)) {
    const base = [...cache.entries()].find(([k]) => k.startsWith(`${kind}:`))?.[1];
    const map = base ? base.clone() : new CanvasTexture(draw(kind));
    map.colorSpace = SRGBColorSpace; map.wrapS = map.wrapT = RepeatWrapping; map.anisotropy = 8;
    const [sx, sy] = TEXTURE_SIZE[kind]; map.repeat.set(width / sx, height / sy); map.needsUpdate = true;
    cache.set(key, map);
  }
  return cache.get(key)!;
}
