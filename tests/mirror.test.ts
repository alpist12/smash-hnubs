import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ITEMS, specs } from '../src/data/room';
import { model } from '../src/scene/models';

test('mirror is mounted between left door and storage with glass and four frame pieces', () => {
  const mirror = DEFAULT_ITEMS.find(item => item.kind === 'mirror')!;
  assert.equal(mirror.wall, 'left');
  assert.equal(mirror.fixed, true);
  assert.equal(mirror.rotation, Math.PI / 2);
  assert.ok(mirror.pos[2] > .8 && mirror.pos[2] < 1.6);
  assert.ok(DEFAULT_ITEMS.some(item => item.id === mirror.parentId && item.kind === 'wallSegment'));
  assert.equal(model(mirror).filter(part => part.finish === 'glass').length, 1);
  assert.equal(model(mirror).filter(part => part.name.includes('테두리')).length, 4);
  assert.ok(specs.mirror.score > 0 && specs.mirror.threshold > 0);
});
