import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { attack, clearAttacks, targets, tickAttacks } from '../src/physics/attacks';
import { useGame } from '../src/game/store';
import { WEAPONS } from '../src/weapons/config';
import { pickHalf } from '../src/data/snap';

test('pickHalf picks exactly half (rounded up) without duplicates', () => {
  for (const n of [0, 1, 7, 150]) {
    const picked = pickHalf(Array.from({ length: n }, (_, i) => i));
    assert.equal(picked.length, Math.ceil(n / 2));
    assert.equal(new Set(picked.map(p => p.item)).size, picked.length);
    assert.ok(picked.every(p => p.at >= 0 && p.at <= WEAPONS.snap.vanish));
  }
});

test('the snap dusts half of everything, people included, with no cooldown', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'performance')!; let now = 10000;
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } });
  try {
    clearAttacks(); targets.clear(); useGame.getState().reset(); useGame.setState({ ready: true, sound: false, weapon: 'snap' });
    const hit = new Set<string>();
    for (let i = 0; i < 40; i++) targets.set('item-' + i, { point: () => new Vector3(), hit: (_d, _i, _p, _s, _c, weapon) => { assert.equal(weapon, 'snap'); hit.add('item-' + i); } });
    const gone: string[] = [];
    for (const name of ['a', 'b', 'c', 'd']) targets.set('character-' + name, { point: () => new Vector3(1, 1.1, 1), hit: (_d, _i, _p, _s, _c, weapon) => { assert.equal(weapon, 'snap'); gone.push(name); targets.delete('character-' + name); } });
    attack([1, .8, 2]);
    assert.deepEqual(useGame.getState().snap?.point, [1, 0, 2]);
    const fire = now + WEAPONS.snap.snapAt * 1000, start = fire + WEAPONS.snap.flash * 1000;
    now = fire - 1; tickAttacks(); assert.equal(hit.size, 0);
    now = fire; tickAttacks(); assert.equal(useGame.getState().snap?.fired, true);
    now = start - 10; tickAttacks(); assert.equal(hit.size, 0, 'the flick stays readable before anything turns to dust');
    now = start + WEAPONS.snap.vanish * 1000 + 10; tickAttacks();
    const people = 2; assert.equal(hit.size, 20); assert.equal(gone.length, 0, 'people wait until the props are gone');
    // 사람은 한 명씩 카메라 초점을 받은 뒤 사라진다.
    const first = start + (WEAPONS.snap.vanish + .3) * 1000;
    for (let i = 0; i < people; i++) {
      now = first + i * WEAPONS.snap.personSlot * 1000 + 10; tickAttacks();
      assert.deepEqual(useGame.getState().snap?.focus, [1, 1.1, 1]); assert.equal(gone.length, i);
      now += WEAPONS.snap.personDust * 1000; tickAttacks(); assert.equal(gone.length, i + 1);
    }
    now += 30000; tickAttacks(); tickAttacks(); assert.equal(useGame.getState().snap, null);
    // 쿨타임 없이 바로 다시 쓸 수 있다.
    attack([0, 0, 0]); assert.ok(useGame.getState().snap); assert.equal(useGame.getState().hint, '');
  } finally { clearAttacks(); targets.clear(); Object.defineProperty(globalThis, 'performance', original); }
});
