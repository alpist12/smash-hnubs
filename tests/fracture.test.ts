import test from 'node:test';
import assert from 'node:assert/strict';
import { fractureParts } from '../src/physics/fracture';
import type { Part } from '../src/data/types';

test('fracturing makes smaller bounded pieces and preserves rotated part volume and center', () => {
  const source: Part = { name: '상판', pos: [1, 2, 3], size: [2.6, .06, 1.2], finish: 'wood', rotation: [0, Math.PI / 3, 0] };
  const pieces = fractureParts([source], 28);
  assert.equal(pieces.length, 28);
  const volume = (p: Part) => p.size[0] * p.size[1] * p.size[2];
  assert.ok(Math.abs(pieces.reduce((sum, p) => sum + volume(p), 0) - volume(source)) < 1e-10);
  for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(pieces.reduce((sum, p) => sum + p.pos[axis] * volume(p), 0) / volume(source) - source.pos[axis]) < 1e-10);
  assert.ok(pieces.every(p => Math.max(...p.size) < 1));
  assert.deepEqual(source.size, [2.6, .06, 1.2]);
  assert.equal(fractureParts([{ ...source, shape: 'cylinder' }]).length, 1);
  // 조각 크기가 제각각이어야 '조각조각' 깨진 느낌이 난다.
  const volumes = pieces.map(volume).sort((a, b) => a - b);
  assert.ok(volumes[volumes.length - 1] / volumes[0] > 2);
  assert.deepEqual(fractureParts([source], 28, 3), fractureParts([source], 28, 3));
});
