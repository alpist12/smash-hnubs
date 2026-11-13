import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBO_GAP, HitCombo, VOICE_STAGES } from '../src/game/hitCombo';

test('character voice advances in order without cutting speech and resets after a combo gap', () => {
  assert.equal(VOICE_STAGES.length, 6);
  assert.deepEqual(VOICE_STAGES[5], [10.26, 11.63]);
  const combo = new HitCombo();
  let now = 1000;
  assert.equal(combo.hit(now), 0);
  assert.equal(combo.hit(now + 100), null);
  now += 700;
  assert.equal(combo.hit(now), 1);
  now += COMBO_GAP;
  assert.equal(combo.hit(now), 0);
  for (let stage = 1; stage < VOICE_STAGES.length + 3; stage++) {
    const [start, end] = VOICE_STAGES[combo.stage];
    now += (end - start) * 1000 + 10;
    assert.equal(combo.hit(now), Math.min(stage, VOICE_STAGES.length - 1));
  }
  assert.equal(combo.expire(now + COMBO_GAP - 1), false);
  assert.equal(combo.expire(now + COMBO_GAP), true);
  assert.equal(combo.stage, -1);
  assert.equal(combo.hit(now + COMBO_GAP + 1), 0);
  combo.reset(); assert.equal(combo.hit(now + COMBO_GAP + 2), 0);
  for (const [start, end] of VOICE_STAGES) assert.ok(start >= 0 && start < end && end <= 11.63);
});

import { CharacterHealth, CHARACTER_BAT_HITS } from '../src/game/characterHealth';
import bat from '../src/weapons/bat';
test('character leaves on the 25th bat hit, ignores contact and returns with fresh health', () => {
  const health = new CharacterHealth(), combo = new HitCombo();
  assert.equal(CHARACTER_BAT_HITS, 25);
  for (let hit = 1; hit < 25; hit++) {
    assert.equal(health.hit(bat.power), false);
    assert.equal(health.batHits, hit);
  }
  combo.hit(0); combo.expire(10000);
  assert.equal(health.batHits, 24);
  for (const invalid of [0, -10, NaN, Infinity]) assert.equal(health.hit(invalid), false);
  assert.equal(health.hit(bat.power, true), false);
  assert.equal(health.hit(bat.power), true);
  assert.equal(health.batHits, 25);
  assert.equal(new CharacterHealth().gone, false);
  const mixed = new CharacterHealth();
  assert.equal(mixed.hit(bat.power * 24.5), false);
  assert.equal(mixed.hit(bat.power * .5), true);
});
