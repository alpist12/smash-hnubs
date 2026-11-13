import test from 'node:test';
import assert from 'node:assert/strict';
import { GRAPHICS, GRAPHICS_KEY, initialQuality, loadGraphicsMode, renderDpr, advanceQuality } from '../src/scene/graphics';
import { useGame } from '../src/game/store';

test('automatic startup is conservative for touch and low-spec devices with bounded pixel counts', () => {
  assert.equal(useGame.getState().graphicsMode, 'auto');
  assert.equal(initialQuality(true, 8, 8), 'low');
  assert.equal(initialQuality(false, 2, 8), 'low');
  assert.equal(initialQuality(false, 8, 2), 'low');
  assert.equal(initialQuality(false, 8, 8), 'medium');
  for (const q of ['low', 'medium', 'high'] as const) {
    for (const [w, h] of [[390, 844], [1920, 1080], [3840, 2160]]) {
      const dpr = renderDpr(q, w, h, 3);
      assert.ok(dpr <= GRAPHICS[q].dpr[1]);
      assert.ok(w * h * dpr * dpr <= GRAPHICS[q].pixels + 1);
    }
  }
  assert.equal(GRAPHICS.low.reflection, 0);
  assert.ok(GRAPHICS.high.debris > GRAPHICS.medium.debris && GRAPHICS.medium.debris > GRAPHICS.low.debris);
});

test('automatic quality needs sustained slow or fast samples and never leaves its bounds', () => {
  let s = advanceQuality('high', 20, { slow: 0, fast: 0 });
  assert.equal(s.quality, 'high');
  assert.equal(advanceQuality('high', 20, s).quality, 'medium');
  assert.equal(advanceQuality('high', 60, s).slow, 0);
  s = { quality: 'low', slow: 0, fast: 0 };
  for (let i = 0; i < 3; i++) { s = advanceQuality(s.quality, 60, s); assert.equal(s.quality, 'low'); }
  assert.equal(advanceQuality(s.quality, 60, s).quality, 'medium');
  assert.equal(advanceQuality('low', 5, { slow: 10, fast: 0 }).quality, 'low');
  assert.equal(advanceQuality('high', 120, { slow: 0, fast: 10 }).quality, 'high');
});

test('manual quality persists, trims work immediately and preserves game progress', () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v) } });
  useGame.setState({ score: 123, destroyed: { 'test-item': true }, cameraMode: 'technical' });
  useGame.getState().selectGraphics('high');
  assert.equal(memory.get(GRAPHICS_KEY), 'high');
  assert.equal(loadGraphicsMode(), 'high');
  useGame.getState().selectGraphics('low');
  assert.equal(useGame.getState().quality, 'low');
  assert.equal(useGame.getState().graphicsMode, 'low');
  assert.equal(useGame.getState().score, 123);
  assert.equal(useGame.getState().cameraMode, 'technical');
  assert.deepEqual(useGame.getState().destroyed, { 'test-item': true });
  memory.set(GRAPHICS_KEY, 'broken'); assert.equal(loadGraphicsMode(), 'auto');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
  assert.equal(loadGraphicsMode(), 'auto');
  assert.doesNotThrow(() => useGame.getState().selectGraphics('auto'));
});
