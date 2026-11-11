import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { DEFAULT_ITEMS, ROOM } from '../src/data/room';
import { changePlacement, duplicateItems, removeItems, toLayout } from '../tools/layout-operations';
import { applyLayout } from '../src/data/layout';
import { editorMiddleware } from '../tools/editor-middleware';

test('the private editor moves desk equipment together and rejects furniture outside the room', () => {
  const desk = DEFAULT_ITEMS.find(i => i.kind === 'desk')!, monitor = DEFAULT_ITEMS.find(i => i.kind === 'monitor')!;
  const next = changePlacement(DEFAULT_ITEMS, desk.id, { pos: [desk.pos[0] + .3, desk.pos[1], desk.pos[2]] });
  assert.ok(Math.abs(next.find(i => i.id === monitor.id)!.pos[0] - monitor.pos[0] - .3) < 1e-6);
  assert.deepEqual(DEFAULT_ITEMS.find(i => i.id === monitor.id)!.pos, monitor.pos);
  assert.throws(() => changePlacement(DEFAULT_ITEMS, desk.id, { pos: [ROOM.width * 2, 0, 0] }), /방 밖/);
  const fixed = DEFAULT_ITEMS.find(i => i.fixed)!;
  assert.throws(() => changePlacement(DEFAULT_ITEMS, fixed.id, { rotation: 0 }), /편집할 수 없습니다/);
});

test('the author-only save endpoint rejects foreign origins and invalid data, then saves and backs up', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hnubs-editor-test-'));
  await mkdir(join(root, 'src/data'), { recursive: true }); await writeFile(join(root, 'src/data/layout.json'), '{}\n');
  let builds = 0;
  const handler = editorMiddleware(root, async () => { builds++; });
  const server = createServer((req, res) => { void handler(req, res, () => { res.statusCode = 404; res.end(); }); });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`, endpoint = `${origin}/__layout`;
  try {
    assert.equal((await fetch(endpoint)).status, 200);
    let response = await fetch(endpoint, { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 403);
    response = await fetch(endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{"bad":{"pos":[0,0,0]}}' });
    assert.equal(response.status, 400);
    assert.equal(await readFile(join(root, 'src/data/layout.json'), 'utf8'), '{}\n');
    const layout = toLayout(DEFAULT_ITEMS);
    response = await fetch(endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(layout) });
    assert.equal(response.status, 200);
    assert.equal(builds, 1);
    assert.deepEqual(JSON.parse(await readFile(join(root, 'src/data/layout.json'), 'utf8')), layout);
  } finally {
    await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep));
    await rm(root, { recursive: true, force: true });
  }
});

test('copy, move and delete preserve original furniture and persist copied equipment ownership', () => {
  const desk = DEFAULT_ITEMS.find(i => i.kind === 'desk')!, monitor = DEFAULT_ITEMS.find(i => i.kind === 'monitor')!;
  const copied = duplicateItems(DEFAULT_ITEMS, desk.id);
  assert.equal(copied.items.length, DEFAULT_ITEMS.length + 6);
  const copiedMonitor = copied.items.find(i => i.sourceId === monitor.id)!;
  assert.equal(copiedMonitor.parentId, copied.selected);
  const moved = changePlacement(copied.items, copied.selected, { pos: [0, 0, 0] });
  assert.deepEqual(moved.find(i => i.id === monitor.id)!.pos, monitor.pos);
  assert.notDeepEqual(moved.find(i => i.id === copiedMonitor.id)!.pos, copiedMonitor.pos);
  const deleted = removeItems(moved, desk.id);
  const loaded = applyLayout(DEFAULT_ITEMS, JSON.parse(JSON.stringify(toLayout(deleted))));
  assert.ok(!loaded.some(i => i.id === desk.id || i.id === monitor.id));
  assert.ok(loaded.some(i => i.id === copied.selected));
  assert.equal(loaded.find(i => i.id === copiedMonitor.id)!.parentId, copied.selected);
  assert.equal(new Set(loaded.map(i => i.id)).size, loaded.length);
});


test('desk-20 partition survives desk removal and can move and copy independently', () => {
  const partition = DEFAULT_ITEMS.find(item => item.kind === 'partition')!;
  const withoutDesk = removeItems(DEFAULT_ITEMS, 'desk-20');
  assert.ok(withoutDesk.some(item => item.id === partition.id));
  const moved = changePlacement(withoutDesk, partition.id, { pos: [0, 0, 0] });
  const copied = duplicateItems(moved, partition.id);
  const restored = applyLayout(DEFAULT_ITEMS, toLayout(copied.items));
  assert.equal(restored.filter(item => item.kind === 'partition').length, 2);
  assert.ok(!restored.some(item => item.id === 'desk-20'));
});
