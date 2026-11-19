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

test('the snap dusts half of the props, spares characters and ends the sequence', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'performance')!; let now = 10000;
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } });
  try {
    clearAttacks(); targets.clear(); useGame.getState().reset(); useGame.setState({ ready: true, sound: false, weapon: 'snap' });
    const hit = new Set<string>();
    for (let i = 0; i < 40; i++) targets.set('item-' + i, { point: () => new Vector3(), hit: (_d, _i, _p, _s, _c, weapon) => { assert.equal(weapon, 'snap'); hit.add('item-' + i); } });
    targets.set('character-wonjae', { point: () => new Vector3(), hit: () => assert.fail('characters are spared') });
    attack([1, .8, 2]);
    assert.deepEqual(useGame.getState().snap?.point, [1, 0, 2]);
    now += WEAPONS.snap.snapAt * 1000 - 1; tickAttacks(); assert.equal(hit.size, 0);
    now += 1; tickAttacks(); assert.equal(useGame.getState().snap?.fired, true);
    now += WEAPONS.snap.vanish * 1000 + 1; tickAttacks(); assert.equal(hit.size, 20);
    now += WEAPONS.snap.duration * 1000; tickAttacks(); assert.equal(useGame.getState().snap, null);
  } finally { clearAttacks(); targets.clear(); Object.defineProperty(globalThis, 'performance', original); }
});
