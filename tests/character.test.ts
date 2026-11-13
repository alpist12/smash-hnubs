import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBO_GAP, HitCombo, VOICE_STAGES } from '../src/game/hitCombo';

test('character voice advances in order without cutting speech and resets after a combo gap', () => {
  assert.equal(VOICE_STAGES.length, 8);
  assert.deepEqual(VOICE_STAGES[7], [13.95, 15.32]);
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
  for (const [start, end] of VOICE_STAGES) assert.ok(start >= 0 && start < end && end <= 15.32);
});
import { headGeometry, facePatch, faceZ, furGeometry, hairGeometry, torsoGeometry, trousersGeometry, sleeveGeometry } from '../src/scene/characterGeometry';

test('sculpted character has a projected nose, curved face features and bounded finite 3D meshes', () => {
  assert.ok(faceZ(0,.18) > faceZ(.07,.18)+.035);
  const patch=facePatch([[-.06,.12],[0,.10],[.06,.12],[0,.09]]);
  const z=Array.from({length:patch.getAttribute('position').count},(_,i)=>patch.getAttribute('position').getZ(i));
  assert.ok(Math.max(...z)-Math.min(...z)>.005);
  const meshes=[headGeometry(),patch,furGeometry(),hairGeometry(),hairGeometry(true),torsoGeometry(),trousersGeometry(1),sleeveGeometry(-1)];
  for(const geometry of meshes) {
    for(const value of geometry.getAttribute('position').array) assert.ok(Number.isFinite(value));
    for(const value of geometry.getAttribute('normal').array) assert.ok(Number.isFinite(value));
    geometry.computeBoundingBox();
    assert.ok(geometry.boundingBox!.max.y<=2.2);
    assert.ok(geometry.boundingBox!.min.y>=0);
    assert.ok(geometry.index && geometry.index.count>0);
    geometry.dispose();
  }
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
