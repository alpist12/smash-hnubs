import test from 'node:test';
import assert from 'node:assert/strict';
import { Euler, Vector3 } from 'three';
import { fractureWallParts, expandWallSelection, wallFractureCount, splitPiece, seeded } from '../src/physics/fracture';
import { specs } from '../src/data/room';
import { WEAPONS } from '../src/weapons/config';
import { GRAPHICS } from '../src/scene/graphics';
import { partUV } from '../src/scene/partUV';
import { model } from '../src/scene/models';
import type { Item, Part, V3 } from '../src/data/types';

const area = (p: [number, number][]) => Math.abs(p.reduce((sum, a, i) => { const b = p[(i + 1) % p.length]; return sum + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2;
const volume = (p: Part) => p.poly ? area(p.poly) * p.size[p.axis ?? 1] : p.size.reduce((a, b) => a * b, 1);

test('walls resist ten bat hits before opening holes, while repeated explosives still break them', () => {
  const wall: Item = { id: 'durable-wall', kind: 'wallSegment', pos: [0, 0, 0], width: 1.8, acoustic: 'both' };
  const threshold = specs.wallSegment.threshold;
  for (const quality of Object.values(GRAPHICS)) {
    const pieces = fractureWallParts(wall, model(wall), quality.fragments, 23);
    for (let hit = 1; hit <= 10; hit++) assert.equal(wallFractureCount(WEAPONS.bat.power * hit, threshold, pieces.length), 0);
    assert.ok(wallFractureCount(WEAPONS.bat.power * 12, threshold, pieces.length) > 0);
    assert.equal(wallFractureCount(WEAPONS.bomb.power, threshold, pieces.length), 0);
    const meteor = wallFractureCount(WEAPONS.meteor.power, threshold, pieces.length);
    assert.ok(meteor > 0 && meteor < pieces.length * .7);
  }
  assert.equal(Math.ceil(threshold / WEAPONS.bat.power), 25);
  assert.equal(Math.ceil(threshold / WEAPONS.bomb.power), 6);
  assert.equal(Math.ceil(threshold / WEAPONS.meteor.power), 2);
});

test('wall layers break into matching small cells without leaving a solid backing over the hole', () => {
  const item: Item = { id: 'wall-test', kind: 'wallSegment', pos: [0, 0, 0], width: 1.8, acoustic: 'both' };
  const original = model(item), pieces = fractureWallParts(item, original, 38, 23);
  assert.ok(pieces.every(p => p.fractureGroup && p.poly && p.size[0] < 1 && p.size[1] < 1));
  assert.ok(Math.abs(original.reduce((v, p) => v + volume(p), 0) - pieces.reduce((v, p) => v + volume(p), 0)) < 1e-6);
  const selected = expandWallSelection(pieces, [0], []);
  assert.ok(selected.some(i => pieces[i].name.startsWith('부스 벽체')));
  assert.equal(selected.filter(i => pieces[i].texture).length, 2);
  assert.ok(selected.every(i => pieces[i].fractureGroup === pieces[0].fractureGroup));
  assert.deepEqual(expandWallSelection(pieces, [0], selected), []);
  for (const source of original.filter(p => p.texture)) {
    const facing = pieces.filter(p => p.texture === source.texture && JSON.stringify(p.rotation) === JSON.stringify(source.rotation));
    assert.ok(Math.abs(facing.reduce((v, p) => v + volume(p), 0) - volume(source)) < 1e-6);
  }
});

test('split texture coordinates retain their original scale and origin through repeated cuts', () => {
  const source: Part = { name: '그림 면', pos: [0, 0, 0], size: [1.8, 2.8, .012], finish: 'fabric', texture: 'acoustic:1.8:2.8:0' };
  let pieces = splitPiece(source, seeded(42), .1)!;
  pieces = pieces.flatMap(p => splitPiece(p, seeded(71), .1) ?? [p]);
  for (const p of pieces) for (const [x, y] of p.poly!) {
    const offset = p.uvOffset!;
    const expected = partUV(source, [x + offset[0], y + offset[1], .006], [0, 0, 1]);
    const actual = partUV(p, [x, y, p.size[2] / 2], [0, 0, 1]);
    assert.ok(Math.abs(expected[0] - actual[0]) < 1e-10 && Math.abs(expected[1] - actual[1]) < 1e-10);
  }
  const wall: Item = { id: 'back-uv', kind: 'wallSegment', pos: [0, 0, 0], width: 1.8, acoustic: 'both' };
  const originals = model(wall), cells = fractureWallParts(wall, originals, 38, 5);
  for (const piece of cells.filter(p => p.texture)) {
    const original = originals.find(p => p.texture === piece.texture && JSON.stringify(p.rotation) === JSON.stringify(piece.rotation))!;
    const localOrigin = new Vector3(...piece.pos).sub(new Vector3(...original.pos));
    if (piece.rotation) localOrigin.applyEuler(new Euler(0, -piece.rotation[1], 0));
    const actual = partUV(piece, [0, 0, 0], [0, 0, 1]);
    const expected = partUV(original, localOrigin.toArray() as V3, [0, 0, 1]);
    assert.ok(Math.abs(actual[0] - expected[0]) < 1e-8 && Math.abs(actual[1] - expected[1]) < 1e-8);
  }
});
