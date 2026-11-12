import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ITEMS as ITEMS, ROOM, WORLD, planPoint, specs } from '../src/data/room';
import { model } from '../src/scene/models';
import { BEST_KEY, loadBest, useGame } from '../src/game/store';
import { falloff } from '../src/physics/attacks';
import { WEAPONS } from '../src/weapons/config';

test('plan maps the provided room corners and all furniture remains inside', () => {
  assert.deepEqual(planPoint(620.5, 649.5), [0, 0, 0]);
  assert.deepEqual(planPoint(276, 466), [-ROOM.width / 2, 0, -ROOM.depth / 2]);
  assert.equal(new Set(ITEMS.map(i => i.id)).size, ITEMS.length);
  for (const item of ITEMS) {
    assert.ok(item.wall ? Math.abs(item.pos[0]) <= ROOM.width / 2 + 1e-9 : Math.abs(item.pos[0]) < ROOM.width / 2);
    const margin = item.wall ? .1 : 1e-9;
    assert.ok(item.pos[2] >= WORLD.minZ - margin && item.pos[2] <= WORLD.maxZ + margin);
    assert.ok(specs[item.kind].threshold > 0);
    for (const p of model(item)) {
      assert.ok(p.name.length > 0);
      assert.ok(p.size.every(n => Number.isFinite(n) && n > 0));
      assert.ok(p.pos.every(Number.isFinite));
    }
  }
  const main = ITEMS.filter(i => i.pos[2] > -ROOM.depth / 2);
  assert.equal(main.filter(i => i.kind === 'desk').length, 7);
  assert.equal(main.filter(i => i.kind === 'sofa').length, 3);
  assert.equal(ITEMS.filter(i => i.kind === 'bench').length, 2);
  assert.equal(ITEMS.find(i => i.kind === 'monitor')!.rotation, Math.PI);
  assert.ok(ITEMS.find(i => i.curved));
  const table = ITEMS.find(i => i.kind === 'table')!;
  for (const laptop of ITEMS.filter(i => i.kind === 'laptop')) {
    assert.ok(Math.abs(laptop.pos[0] - table.pos[0]) + .19 < table.width! / 2);
    assert.ok(Math.abs(laptop.pos[2] - table.pos[2]) + .145 < table.depth! / 2);
  }
});

test('storage follows the final left-wall correction in the supplied floor plan', () => {
  const storage = ITEMS.filter(i => ['wardrobe', 'cabinet', 'fridge'].includes(i.kind));
  assert.equal(storage.length, 4);
  for (const item of storage) {
    assert.ok(item.pos[0] < -ROOM.width / 2 + .7);
    assert.equal(item.rotation, Math.PI / 2);
  }
  assert.equal(ITEMS.filter(i => i.kind === 'partition').length, 1);
});

test('the counter beneath the board contains appliances and snacks rather than computers', () => {
  const counter = ITEMS.find(i => i.snackCounter)!;
  assert.ok(counter && counter.width! >= 1.8);
  assert.equal(ITEMS.filter(i => i.kind === 'microwave').length, 1);
  assert.equal(ITEMS.filter(i => i.kind === 'coffee').length, 1);
  assert.equal(ITEMS.filter(i => i.kind === 'snack').length, 3);
  assert.equal(ITEMS.filter(i => ['monitor', 'keyboard', 'mouse'].includes(i.kind) && Math.abs(i.pos[0] - counter.pos[0]) < counter.width! / 2 && Math.abs(i.pos[2] - counter.pos[2]) < counter.depth! / 2).length, 0);
});

test('score is awarded once, best persists, reset restores every object', () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, val: string) => memory.set(key, val) } });
  useGame.setState({ best: 0 }); useGame.getState().reset();
  assert.equal(useGame.getState().destroy('monitor-1', 40), true);
  assert.equal(useGame.getState().destroy('monitor-1', 40), false);
  assert.equal(useGame.getState().score, 40);
  assert.equal(loadBest(), 40);
  const previousRound = useGame.getState().round;
  useGame.getState().reset();
  assert.equal(useGame.getState().score, 0);
  assert.equal(useGame.getState().best, 40);
  assert.equal(useGame.getState().round, previousRound + 1);
  assert.deepEqual(useGame.getState().destroyed, {});
  assert.deepEqual(useGame.getState().debris, []);
  assert.equal(useGame.getState().destroy('monitor-1', 40), true);
  for (const invalid of ['NaN', '-5', 'Infinity', '1.5', '999999999999999999999999']) {
    memory.set(BEST_KEY, invalid); assert.equal(loadBest(), 0);
  }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('blocked storage'); } });
  assert.equal(loadBest(), 0);
  assert.doesNotThrow(() => useGame.getState().destroy('desk-1', 70));
});

test('weapons use distinct radii, decreasing explosion force and bounded debris', () => {
  for (const weapon of Object.values(WEAPONS)) {
    assert.equal(falloff(0, weapon.radius), 1);
    assert.equal(falloff(weapon.radius / 2, weapon.radius), .5);
    assert.equal(falloff(weapon.radius * 2, weapon.radius), 0);
    assert.ok(weapon.power > 0 && weapon.cooldown > 0);
  }
  assert.ok(WEAPONS.sonic.radius > WEAPONS.bomb.radius);
  assert.ok(WEAPONS.bomb.radius > WEAPONS.bat.radius);
  assert.ok(WEAPONS.bat.radius > WEAPONS.laser.radius);
  assert.ok(WEAPONS.missile.radius > WEAPONS.bat.radius && WEAPONS.missile.radius < WEAPONS.bomb.radius);
  assert.deepEqual(Object.values(WEAPONS).map(w => w.key), ['1', '2', '3', '4', '5']);
  useGame.getState().reset();
  for (let i = 0; i < 150; i++) useGame.getState().addEffect({ id: i, born: 0, type: 'bat', radius: 1, point: [0, 0, 0] });
  assert.equal(useGame.getState().effects.length, 24);
  const fragment = { id: 0, born: 0, pos: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number], impulse: [0, 0, 0] as [number, number, number], mass: 1, part: model(ITEMS[0])[0] };
  useGame.getState().addDebris(Array.from({ length: 320 }, (_, id) => ({ ...fragment, id })));
  assert.equal(useGame.getState().debris.length, 240);
});
