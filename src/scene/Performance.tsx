import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGame } from '../game/store';
import { advanceQuality, renderDpr } from './graphics';

export function Performance({ active = true }: { active?: boolean }) {
  const quality = useGame(s => s.quality), mode = useGame(s => s.graphicsMode);
  const { size, setDpr } = useThree();
  const sample = useRef({ elapsed: 0, frames: 0, slow: 0, fast: 0, warmup: 4 });
  useEffect(() => {
    setDpr(renderDpr(quality, size.width, size.height, window.devicePixelRatio || 1));
    sample.current = { elapsed: 0, frames: 0, slow: 0, fast: 0, warmup: 4 };
  }, [quality, mode, size.width, size.height, setDpr]);
  useFrame((_, delta) => {
    const s = sample.current;
    if (!active || mode !== 'auto' || document.hidden) { s.elapsed = 0; s.frames = 0; s.slow = 0; s.fast = 0; s.warmup = 4; return; }
    // 로딩·셰이더 준비·탭 복귀의 일시 정지를 성능 저하로 판정하지 않는다.
    if (delta > 1) { s.warmup = 4; s.elapsed = 0; s.frames = 0; return; }
    if (s.warmup > 0) { s.warmup -= delta; return; }
    s.elapsed += delta; s.frames++;
    if (s.elapsed < 3) return;
    const next = advanceQuality(quality, s.frames / s.elapsed, s);
    s.slow = next.slow; s.fast = next.fast; s.elapsed = 0; s.frames = 0;
    if (next.quality !== quality) useGame.getState().setQuality(next.quality);
  });
  return null;
}
