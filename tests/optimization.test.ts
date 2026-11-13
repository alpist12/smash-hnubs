import test from 'node:test';
import assert from 'node:assert/strict';
import type { Item, Part } from '../src/data/types';
import { DEFAULT_ITEMS } from '../src/data/room';
import { model } from '../src/scene/models';
import { partBatches, batchDrawCount } from '../src/scene/partBatches';
import { initialColliders } from '../src/physics/colliderParts';

test('instancing keeps every transform and material while reducing repeated model draw submissions', () => {
  const part: Part = { name: 'CD', pos: [0, 0, 0], size: [.03, .3, .2], finish: 'paper', color: '#eeeeee' };
  const parts = Array.from({ length: 10 }, (_, i) => ({ ...part, pos: [i * .04, 0, 0] as Part['pos'], rotation: [0, i * .1, 0] as Part['rotation'] }));
  const batches = partBatches(parts);
  assert.equal(batches.length, 1);
  assert.equal(batchDrawCount(parts), 1);
  assert.deepEqual(batches.flat(), parts);
  assert.equal(batchDrawCount(parts.map(p => ({ ...p, finish: 'glass' }))), 10);
  assert.equal(partBatches([...parts, { ...part, color: '#000000' }]).length, 2);
  const models = DEFAULT_ITEMS.map(model);
  const before = models.reduce((n, parts) => n + parts.length, 0), after = models.reduce((n, parts) => n + batchDrawCount(parts), 0);
  assert.ok(after < before * .8, `${before} -> ${after}`);
});

test('solid wall colliders combine without filling door jambs or furniture leg spaces', () => {
  const wall: Item = { id: 'test-wall', kind: 'wallSegment', pos: [0, 0, 0], width: 1.8, fixed: true };
  const parts = model(wall), combined = initialColliders(wall, parts);
  assert.equal(combined.length, 1);
  for (const p of parts.filter(p => p.collider !== false)) for (let axis = 0; axis < 3; axis++) {
    assert.ok(p.pos[axis] - p.size[axis] / 2 >= combined[0].pos[axis] - combined[0].size[axis] / 2 - 1e-8);
    assert.ok(p.pos[axis] + p.size[axis] / 2 <= combined[0].pos[axis] + combined[0].size[axis] / 2 + 1e-8);
  }
  const jamb = { ...wall, jambs: true, bottom: 2.18 };
  assert.equal(initialColliders(jamb, model(jamb)).length, model(jamb).filter(p => p.collider !== false).length);
  const desk = DEFAULT_ITEMS.find(item => item.kind === 'desk')!;
  assert.equal(initialColliders(desk, model(desk)).length, model(desk).filter(p => p.collider !== false).length);
  const before = DEFAULT_ITEMS.reduce((n, item) => n + model(item).filter(p => p.collider !== false).length, 0);
  const after = DEFAULT_ITEMS.reduce((n, item) => n + initialColliders(item, model(item)).length, 0);
  assert.ok(after < before * .8, `${before} -> ${after}`);
});
