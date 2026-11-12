import test from 'node:test';
import assert from 'node:assert/strict';
import { fractureParts } from '../src/physics/fracture';
import type { Part } from '../src/data/types';

test('fracturing makes smaller bounded pieces and preserves rotated part volume and center', () => {
  const source: Part = { name: '상판', pos: [1, 2, 3], size: [2.6, .06, 1.2], finish: 'wood', rotation: [0, Math.PI / 3, 0] };
  const pieces = fractureParts([source], 28);
  assert.ok(pieces.length >= 28 && pieces.length < 40);
  const area = (poly: [number, number][]) => Math.abs(poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const volume = (p: Part) => p.poly ? area(p.poly) * p.size[p.axis ?? 1] : p.size[0] * p.size[1] * p.size[2];
  assert.ok(Math.abs(pieces.reduce((sum, p) => sum + volume(p), 0) - volume(source)) < 1e-9);
  for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(pieces.reduce((sum, p) => sum + p.pos[axis] * volume(p), 0) / volume(source) - source.pos[axis]) < 1e-9);
  assert.ok(pieces.every(p => Math.max(...p.size) < 1));
  assert.deepEqual(source.size, [2.6, .06, 1.2]);
  // 상자 조각이 아니라 비스듬히 잘린 불규칙한 조각이어야 한다.
  assert.ok(pieces.some(p => p.poly && (p.poly.length !== 4 || p.poly.some(([u], i) => Math.abs(u - p.poly![(i + 1) % p.poly!.length][0]) > 1e-6 && Math.abs(p.poly![i][1] - p.poly![(i + 1) % p.poly!.length][1]) > 1e-6))));
  // 조각 크기가 제각각이어야 '조각조각' 깨진 느낌이 난다.
  const volumes = pieces.map(volume).sort((a, b) => a - b);
  assert.ok(volumes[volumes.length - 1] / volumes[0] > 2);
  assert.deepEqual(fractureParts([source], 28, 3), fractureParts([source], 28, 3));
});
