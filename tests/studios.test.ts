import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ITEMS } from '../src/data/room';
import { applyLayout } from '../src/data/layout';
import { BOOTH_WALL_Z, BOOTH_WINDOW, STUDIOS, STUDIO_END, STUDIO_START, WORLD } from '../src/data/studios';
import { checkRoomBounds } from '../tools/layout-operations';

test('both studios are wider, contiguous and hold photo-based destructible equipment inside their bounds', () => {
  const [technical, announcer] = STUDIOS;
  assert.ok(technical.depth > 4 && announcer.depth > 4);
  assert.ok(Math.abs(technical.centerZ + technical.depth / 2 - STUDIO_START) < 1e-9);
  assert.ok(Math.abs(technical.centerZ - technical.depth / 2 - BOOTH_WALL_Z) < 1e-9);
  assert.ok(Math.abs(announcer.centerZ + announcer.depth / 2 - BOOTH_WALL_Z) < 1e-9);
  assert.ok(Math.abs(announcer.centerZ - announcer.depth / 2 - STUDIO_END) < 1e-9);
  assert.equal(WORLD.minZ, STUDIO_END);
  const expected = { technical: ['desk', 'mixer', 'rack', 'mediaCabinet', 'equipmentStack'], announcer: ['anchorDesk', 'micStand', 'metalCabinet', 'floorSofa', 'paSpeaker', 'metalShelf', 'extinguisher'] } as const;
  for (const studio of STUDIOS) {
    const equipment = DEFAULT_ITEMS.filter(item => Math.abs(item.pos[2] - studio.centerZ) < studio.depth / 2);
    for (const kind of expected[studio.id]) assert.ok(equipment.some(item => item.kind === kind), `${studio.label}에 ${kind} 없음`);
    for (const item of equipment) if (!item.fixed) assert.doesNotThrow(() => checkRoomBounds(item), item.id);
  }
  const anchor = DEFAULT_ITEMS.find(item => item.kind === 'anchorDesk')!;
  assert.equal(anchor.pos[0], BOOTH_WINDOW.x);
  assert.ok(anchor.pos[2] < BOOTH_WALL_Z);
  const placed = applyLayout(DEFAULT_ITEMS, { 'desk-20': { hidden: true } });
  assert.ok(!placed.some(item => item.id === 'desk-20'));
  assert.ok(placed.some(item => item.id === 'partition-72'));
});


test('larger booth furniture preserves saved placements and scales its physical model', async () => {
  const { model } = await import('../src/scene/models');
  const { default: layout } = await import('../src/data/layout.json');
  const placed = applyLayout(DEFAULT_ITEMS, layout);
  for (const item of placed.filter(item => !item.fixed && item.pos[2] < STUDIO_START)) {
    assert.doesNotThrow(() => checkRoomBounds(item), item.id);
  }
  const anchor = placed.find(item => item.kind === 'anchorDesk')!;
  assert.equal(anchor.width, 3.2);
  assert.deepEqual(anchor.pos, layout['anchorDesk-106'].pos);
  const monitor = placed.find(item => item.id === 'monitor-107')!;
  assert.equal(monitor.scale, layout['monitor-107'].scale);
  assert.equal(model(monitor).find(part => part.name === '화면 프레임')!.size[0], 1.2);
  const chair = placed.find(item => item.kind === 'sledChair')!;
  assert.equal(model(chair).find(part => part.name === '패브릭 좌판')!.size[0], .63);
});


test('shipped booth desks and main room partitions have separate physical footprints', async () => {
  const { default: layout } = await import('../src/data/layout.json');
  const { itemBounds } = await import('../tools/layout-operations');
  const placed = applyLayout(DEFAULT_ITEMS, layout);
  const desks = placed.filter(i => i.kind === 'desk' && i.pos[2] < STUDIO_START);
  const cabinets = placed.filter(i => i.kind === 'mediaCabinet');
  const partitions = placed.filter(i => i.kind === 'partition');
  for (const group of [[...desks, ...cabinets], partitions]) {
    for (let a = 0; a < group.length; a++) for (let b = a + 1; b < group.length; b++) {
      assert.ok(!itemBounds(group[a]).intersectsBox(itemBounds(group[b])), `${group[a].id} overlaps ${group[b].id}`);
    }
  }
});

test('old overlapping saved positions migrate once while custom edits survive', async () => {
  const { default: layout } = await import('../src/data/layout.json');
  const old = structuredClone(layout);
  old['copy-desk-88-2'].pos = [4.15, .12, -5.1];
  old['copy-partition-72-1'].pos = [-2.8, 0, -2.55];
  old['monitor-75'].pos[0] += .1;
  const placed = applyLayout(DEFAULT_ITEMS, old);
  for (const id of ['copy-desk-88-2', 'copy-partition-72-1', 'monitor-75']) {
    assert.deepEqual(placed.find(i => i.id === id)!.pos, layout[id as keyof typeof layout].pos);
  }
  old['copy-desk-88-2'].pos = [2, .12, -7];
  assert.deepEqual(applyLayout(DEFAULT_ITEMS, old).find(i => i.id === 'copy-desk-88-2')!.pos, [2, .12, -7]);
  assert.deepEqual(applyLayout(DEFAULT_ITEMS, layout).find(i => i.id === 'copy-partition-72-1')!.pos, layout['copy-partition-72-1'].pos);
});
