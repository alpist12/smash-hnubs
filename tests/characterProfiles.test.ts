import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { CHARACTERS } from '../src/data/characters';

test('only Wonjae is registered, with the recording and a GLB that ships', async () => {
  assert.deepEqual(CHARACTERS.map(p => p.name), ['원재 선배']);
  assert.equal(CHARACTERS[0].voice, true);
  const glb = await readFile(new URL(`../public/${CHARACTERS[0].model}`, import.meta.url));
  assert.equal(glb.toString('ascii', 0, 4), 'glTF');
  const json = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
  const joints = json.skins[0].joints.map((n: number) => json.nodes[n].name);
  for (const name of ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm'])
    assert.ok(joints.includes(name), `걷기에 쓰는 뼈 ${name}이 GLB에 있어야 한다`);
});

test('public character folder never ships reference portraits', async () => {
  const publicFiles = await readdir(new URL('../public/characters/', import.meta.url));
  assert.ok(publicFiles.every(name => !/\.(jpg|jpeg|png|webp)$/i.test(name)));
});
