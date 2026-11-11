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
