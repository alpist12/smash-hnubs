import test from 'node:test';
import assert from 'node:assert/strict';
import { GRAPHICS } from '../src/scene/graphics';
import { useGame } from '../src/game/store';
test('high quality is the default and raises render, shadow and geometry detail', () => {
  assert.equal(useGame.getState().quality, 'high');
  assert.ok(GRAPHICS.high.dpr[0] > GRAPHICS.low.dpr[1]);
  assert.equal(GRAPHICS.high.shadow, 2048);
  assert.ok(GRAPHICS.high.roundedSegments > GRAPHICS.low.roundedSegments);
  assert.ok(GRAPHICS.high.cylinderSegments > GRAPHICS.low.cylinderSegments);
});
