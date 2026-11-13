import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { CHARACTERS } from '../src/data/characters';
import { CharacterHealth } from '../src/game/characterHealth';
import bat from '../src/weapons/bat';

test('both characters have distinct registration, camera and health; only Wonjae owns the recording', () => {
  assert.deepEqual(CHARACTERS.map(p => p.name), ['원재 선배', '유진 선배']);
  assert.equal(new Set(CHARACTERS.map(p => p.id)).size, 2);
  assert.equal(new Set(CHARACTERS.map(p => p.camera)).size, 2);
  assert.deepEqual(CHARACTERS.map(p => p.voice), [true, false]);
  const health = CHARACTERS.map(() => new CharacterHealth());
  for (let i = 0; i < 25; i++) health[1].hit(bat.power);
  assert.equal(health[1].gone, true); assert.equal(health[0].gone, false);
});

test('every character ships a rigged GLB with the bones the walk cycle drives', async () => {
  for (const profile of CHARACTERS) {
    const glb = await readFile(new URL(`../public/${profile.model}`, import.meta.url));
    assert.equal(glb.toString('ascii', 0, 4), 'glTF');
    const json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
    const joints = json.skins[0].joints.map((n: number) => json.nodes[n].name);
    for (const name of ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm'])
      assert.ok(joints.includes(name), `${profile.name} GLB에 걷기용 뼈 ${name}이 있어야 한다`);
  }
});

test('public character folder never ships reference portraits', async () => {
  const publicFiles = await readdir(new URL('../public/characters/', import.meta.url));
  assert.ok(publicFiles.every(name => !/\.(jpg|jpeg|png|webp)$/i.test(name)));
});
